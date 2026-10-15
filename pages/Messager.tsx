import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/device';
import { subscribeToPushNotifications } from '../lib/pushNotifications';
import { Loader2, Check, Copy, Eye, EyeOff, ChevronDown } from 'lucide-react';
import {
  COUNTRIES,
  Country,
  validatePhoneNumber,
  detectCountryFromPhone,
} from '../lib/countries';
import CountryModal from '../components/CountryModal';

export default function Messager() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyNoticeAccepted, setPrivacyNoticeAccepted] = useState(false);
  const [formData, setFormData] = useState({ phone: '', inviteCode: '' });

  const [showPasskeyDialog, setShowPasskeyDialog] = useState(false);
  const [generatedPasskey, setGeneratedPasskey] = useState('');
  const [passkeyDialogCopied, setPasskeyDialogCopied] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    try {
      const savedCode = localStorage.getItem('saved_country_code');
      if (savedCode) {
        const found = COUNTRIES.find((c) => c.code === savedCode);
        if (found) return found;
      }
      const savedDial = localStorage.getItem('saved_dial_code');
      if (savedDial) {
        const found = COUNTRIES.find((c) => c.dial_code === savedDial);
        if (found) return found;
      }
      return COUNTRIES[0];
    } catch {
      return COUNTRIES[0];
    }
  });

  const [showCountryModal, setShowCountryModal] = useState(false);
  const [userPasskey, setUserPasskey] = useState('');
  const [showUserPasskey, setShowUserPasskey] = useState(false);

  useEffect(() => {
    let code =
      searchParams.get('join') ||
      searchParams.get('invite') ||
      searchParams.get('code') ||
      searchParams.get('ref');

    if (!code) {
      const rawSearch = window.location.search
        ? window.location.search.replace(/^\?/, '').trim()
        : '';
      if (rawSearch) {
        code = rawSearch.includes('=') ? rawSearch.split('=')[1] : rawSearch;
      }
    }

    if (code) {
      const cleanCode = code.trim().slice(0, 6);
      setFormData((prev) => ({ ...prev, inviteCode: cleanCode }));
    }
  }, [searchParams]);

  const handleSelectCountry = useCallback((country: Country) => {
    setSelectedCountry(country);
    // Keep phone field clean and synchronized
    setFormData((prev) => ({ ...prev, phone: '' }));
    try {
      localStorage.setItem('saved_country_code', country.code);
      localStorage.setItem('saved_dial_code', country.dial_code);
      localStorage.setItem('saved_country_name', country.name);
    } catch {}
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      if (name === 'phone') {
        const trimmed = value.trim();
        // If user typed or pasted an international number starting with '+'
        if (trimmed.startsWith('+')) {
          const detected = detectCountryFromPhone(trimmed);
          const detectedCountry = detected.country;
          if (detectedCountry) {
            setSelectedCountry(detectedCountry);
            setFormData((prev) => ({
              ...prev,
              phone: (detected.nationalNumber || '').slice(0, detectedCountry.maxLength),
            }));
            return;
          }
        }
        const dialDigits = selectedCountry.dial_code.replace(/\D/g, '');
        let sanitized = value.replace(/\D/g, '');
        if (sanitized.startsWith(dialDigits) && sanitized.length > dialDigits.length + 5) {
          sanitized = sanitized.slice(dialDigits.length);
        }
        sanitized = sanitized.slice(0, selectedCountry.maxLength);
        setFormData((prev) => ({ ...prev, phone: sanitized }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    },
    [selectedCountry]
  );

  const executeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!privacyNoticeAccepted) {
      showToast(t('auth.privacy_consent_required'), 'error');
      return;
    }

    // 1. Rigorous phone number validation based on selected country
    const phoneValidation = validatePhoneNumber(formData.phone, selectedCountry);
    if (!phoneValidation.isValid) {
      showToast(
        formData.phone.trim() ? t('auth.phone_error_invalid') : t('auth.phone_error_empty'),
        'error'
      );
      return;
    }

    // 2. Password validation
    if (!userPasskey || userPasskey.trim().length < 6) {
      showToast(t('auth.signup_password_error'), 'error');
      return;
    }

    // 3. Invite code validation
    if (!formData.inviteCode || formData.inviteCode.trim().length < 3) {
      showToast(t('auth.invite_error_empty'), 'error');
      return;
    }

    const normalizedPhone = phoneValidation.fullNumber.replace(/\D/g, '');

    setIsSubmitting(true);
    try {
      const { data: rpcData, error: vError } = await supabase.rpc(
        'secure_registration_mcpn',
        {
          p_phone: normalizedPhone,
          p_invite_code: formData.inviteCode.trim(),
          p_device_id: getDeviceId(),
        }
      );

      if (vError) {
        throw vError;
      }

      const validation = rpcData as { success: boolean; message: string } | null;
      if (validation && !validation.success) {
        showToast(t('auth.invite_error_invalid'), 'error');
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('auth-proxy', {
        body: {
          action: 'signup',
          phone: normalizedPhone,
          country_code: selectedCountry.code,
          country_name: selectedCountry.name,
          password: userPasskey,
          options: {
            data: {
              phone: normalizedPhone,
              country_code: selectedCountry.code,
              dial_code: selectedCountry.dial_code,
              country_name: selectedCountry.name,
              referred_by: formData.inviteCode.trim(),
              device_id: getDeviceId(),
              privacy_notice_accepted_at: new Date().toISOString(),
            },
          },
        },
      });

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      if (error) {
        if (
          error.message.includes('already registered') ||
          error.message.includes('User already registered')
        ) {
          showToast(t('auth.phone_already_registered'), 'error');
        } else {
          console.error('Registration failed:', error);
          showToast(t('auth.signup_failed'), 'error');
        }
        setIsSubmitting(false);
        return;
      }

      if (data.user) {
        if ('Notification' in window && Notification.permission === 'granted') {
          subscribeToPushNotifications().catch(() => {});
        }
        try {
          localStorage.setItem('saved_country_name', selectedCountry.name);
          localStorage.setItem('saved_dial_code', selectedCountry.dial_code);
          localStorage.setItem('saved_country_code', selectedCountry.code);
          localStorage.setItem('saved_phone', phoneValidation.nationalNumber);
        } catch {}
        setGeneratedPasskey(userPasskey);
        setShowPasskeyDialog(true);
      }
    } catch (err: any) {
      const isRateLimited = typeof err?.message === 'string' && err.message.includes('email rate limit exceeded');
      console.error('Registration failed:', err);
      showToast(isRateLimited ? t('auth.signup_rate_limited') : t('auth.signup_failed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasskeyDialogClose = () => {
    setShowPasskeyDialog(false);
    navigate('/login');
  };

  const handleCopyPasskey = async () => {
    try {
      await navigator.clipboard.writeText(generatedPasskey);
      setPasskeyDialogCopied(true);
      setTimeout(() => setPasskeyDialogCopied(false), 2500);
    } catch {
      showToast(t('auth.copy_password_failed'), 'error');
    }
  };

  const displayNationalPhone = formData.phone.replace(/\D/g, '');
  const formattedPhone = `+${selectedCountry.dial_code.replace(/\D/g, '')}${displayNationalPhone.slice(0, 1)} ${displayNationalPhone.slice(1)}`;

  return (
    <div className="w-full min-h-screen bg-white pb-12 font-sans antialiased text-black select-none flex flex-col items-center justify-center p-4">
      <main className="w-full max-w-[340px] sm:max-w-[360px] flex flex-col items-center">
        <div className="mb-3.5 flex items-center justify-center">
          <img
            src="/logo_bussiness_messeger.jpg"
            alt="Business Messenger"
            className="w-[68px] h-[68px] rounded-full object-cover"
          />
        </div>

        <h1 className="text-[26px] font-bold text-center mb-1.5 tracking-tight text-[#1c1c1e]">Business</h1>

        <p className="text-[13px] text-[#8e8e93] text-center mb-6 leading-snug max-w-[290px]">
          {t('auth.signup_description')}
        </p>

        <form onSubmit={executeRegistration} className="w-full flex flex-col gap-4">
          <div className="w-full flex flex-col gap-4 mt-2">
            {/* Country Selector Button */}
            <div className="relative w-full">
              <div className="absolute -top-[9px] left-[12px] bg-white px-1 z-10">
                <label className="text-[14px] text-[#707579] font-medium leading-none">
                  {t('common.country')}
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowCountryModal(true)}
                style={{ borderRadius: '12px' }}
                className="w-full h-[46px] auth-input-btn border border-[#dfdfe0] bg-white flex items-center justify-between px-3.5 hover:border-[#3390ec] focus:border-[#3390ec] focus:outline-none transition-colors cursor-pointer"
                title={t('common.change_country')}
              >
                <span className="text-[16px] text-black font-normal flex items-center gap-2.5 truncate">
                  <span className="text-[22px] leading-none select-none">
                    {selectedCountry.emoji}
                  </span>
                  <span className="truncate">{selectedCountry.name}</span>
                </span>
                <ChevronDown className="w-5 h-5 text-[#a2a6aa] shrink-0" strokeWidth={2} />
              </button>
            </div>

            {/* Phone Number Input */}
            <div className="relative w-full">
              <div className="absolute -top-[9px] left-[12px] bg-white px-1 z-10">
                <label className="text-[14px] text-[#707579] font-medium leading-none">
                  {t('auth.phone_label')}
                </label>
              </div>
              <div
                style={{ borderRadius: '12px' }}
                className="auth-input-wrap w-full h-[46px] border border-[#dfdfe0] bg-white flex items-center px-3.5 focus-within:border-[#3390ec] transition-colors"
              >
                <span className="text-[16px] text-black mr-2 font-medium shrink-0">
                  {selectedCountry.dial_code}
                </span>
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  className="flex-1 bg-transparent outline-none text-[16px] text-black font-normal h-full w-full"
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength={selectedCountry.maxLength + selectedCountry.dial_code.replace(/\D/g, '').length}
                  placeholder=""
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="relative w-full">
              <div className="absolute -top-[9px] left-[12px] bg-white px-1 z-10">
                <label className="text-[14px] text-[#707579] font-medium leading-none">
                  {t('auth.password_label')}
                </label>
              </div>
              <div
                style={{ borderRadius: '12px' }}
                className="auth-input-wrap w-full h-[46px] border border-[#dfdfe0] bg-white flex items-center px-3.5 focus-within:border-[#3390ec] transition-colors"
              >
                <input
                  name="userPasskey"
                  type={showUserPasskey ? 'text' : 'password'}
                  className="flex-1 bg-transparent outline-none text-[16px] text-black font-normal h-full w-full"
                  value={userPasskey}
                  onChange={(e) => setUserPasskey(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowUserPasskey((v) => !v)}
                  className="ml-2 text-[#a2a6aa] hover:text-[#3390ec] transition-colors shrink-0 cursor-pointer"
                  aria-label={showUserPasskey ? t('auth.hide_password') : t('auth.show_password')}
                >
                  {showUserPasskey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Invite Code Input */}
            <div className="relative w-full">
              <div className="absolute -top-[9px] left-[12px] bg-white px-1 z-10">
                <label className="text-[14px] text-[#707579] font-medium leading-none">
                  {t('auth.invite_code')}
                </label>
              </div>
              <div
                style={{ borderRadius: '12px' }}
                className="auth-input-wrap w-full h-[46px] border border-[#dfdfe0] bg-white flex items-center px-3.5 focus-within:border-[#3390ec] transition-colors"
              >
                <input
                  name="inviteCode"
                  type="text"
                  className="flex-1 bg-transparent outline-none text-[16px] text-black font-normal h-full w-full"
                  value={formData.inviteCode}
                  onChange={handleChange}
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2 text-[12px] leading-5 text-[#555]">
            <input
              type="checkbox"
              required
              checked={privacyNoticeAccepted}
              onChange={(event) => setPrivacyNoticeAccepted(event.target.checked)}
              className="mt-1 shrink-0 accent-[#3390ec]"
            />
            <span>
              {t('auth.privacy_consent_prefix')}{' '}
              <Link to="/privacidade" className="text-[#2481cc] underline">
                {t('devices.heading')}
              </Link>
              .
            </span>
          </label>

          <div className="w-full pt-1 space-y-2.5">
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ borderRadius: '12px' }}
              className="w-full h-[48px] btn-auth bg-[#3390ec] hover:bg-[#2881dc] active:scale-[0.98] text-white font-semibold text-[15px] transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-5 w-5 text-white" />
              ) : (
                t('auth.signup_button')
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full text-center text-[#3390ec] hover:text-[#2881dc] font-medium text-[14.5px] transition-colors py-2 cursor-pointer hover:underline"
            >
              {t('auth.has_account')} {t('auth.login')}
            </button>
          </div>
        </form>
      </main>

      {/* Generated Passkey Dialog */}
      {showPasskeyDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-[340px] rounded-[24px] shadow-2xl p-6 flex flex-col items-center text-center">
            <p className="text-[13px] text-[#707579] leading-snug mb-4 max-w-[260px]">
              {t('auth.passkey_instructions')}
            </p>
            <div className="w-full bg-[#f0f7ff] border-2 border-[#3390ec] rounded-[18px] px-5 py-4 flex items-center justify-between mb-2">
              <span className="text-[24px] font-black text-[#3390ec] tracking-[4px] font-mono flex-1 text-center truncate">
                {generatedPasskey}
              </span>
              <button
                onClick={handleCopyPasskey}
                className={`ml-2 p-2.5 rounded-[12px] transition-all active:scale-95 shrink-0 ${
                  passkeyDialogCopied
                    ? 'bg-green-100 text-green-600'
                    : 'bg-[#3390ec]/10 text-[#3390ec] hover:bg-[#3390ec]/20'
                }`}
                title={t('auth.copy_password')}
              >
                {passkeyDialogCopied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>

            {passkeyDialogCopied && (
              <p className="text-[12px] text-green-600 font-semibold mb-2">
                {t('auth.copied_clipboard')}
              </p>
            )}

            <p className="text-[11px] text-[#a2acb4] mb-5 leading-snug">
              {t('auth.registered_phone')}{' '}
              <strong className="text-[#707579]">
                {formattedPhone}
              </strong>
            </p>

            <button
              onClick={handlePasskeyDialogClose}
              className="w-full h-[46px] rounded-[22px] bg-[#3390ec] hover:bg-[#2b7bc9] text-white font-semibold text-[14px] uppercase tracking-wider transition-all active:scale-[0.98] shadow-sm cursor-pointer"
            >
              {t('auth.return_to_account')}
            </button>
          </div>
        </div>
      )}

      {/* Centralized Country Modal */}
      <CountryModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        selectedCountry={selectedCountry}
        onSelectCountry={handleSelectCountry}
      />
    </div>
  );
}
