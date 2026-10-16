import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { AsYouType, validatePhoneNumberLength, type CountryCode } from 'libphonenumber-js/max';
import { Eye, EyeOff, Loader2, ChevronDown, Fingerprint } from 'lucide-react';
import {
  COUNTRIES,
  Country,
  getPhoneNumberErrorMessage,
  validatePhoneNumber,
  detectCountryFromPhone,
} from '../lib/countries';
import CountryModal from '../components/CountryModal';

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);
  const [phone, setPhone] = useState('');
  const [passkey, setPasskey] = useState('');

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('saved_phone');
      if (saved) setPhone(saved);
    } catch {}
  }, []);

  const togglePasskey = useCallback(() => setShowPasskey((v) => !v), []);

  const handleSelectCountry = useCallback((c: Country) => {
    setSelectedCountry(c);
    setPhone('');
    try {
      localStorage.setItem('saved_dial_code', c.dial_code);
      localStorage.setItem('saved_country_code', c.code);
      localStorage.setItem('saved_country_name', c.name);
    } catch {}
  }, []);

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawVal = e.target.value;
      // Auto-detect if user typed or pasted an international number
      if (rawVal.trim().startsWith('+')) {
        const detected = detectCountryFromPhone(rawVal.trim());
        const detectedCountry = detected.country;
        if (detectedCountry) {
          setSelectedCountry(detectedCountry);
          setPhone((detected.nationalNumber || '').slice(0, detectedCountry.maxLength));
          return;
        }
      }
      const val = rawVal.replace(/\D/g, '').slice(0, selectedCountry.maxLength);
      setPhone(val);
    },
    [selectedCountry]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanInputPhone = phone.trim();
    const cleanPasskey = passkey.trim();

    // 1. Strict validation of phone number format for selected country BEFORE sending credentials
    const phoneValidation = validatePhoneNumber(cleanInputPhone, selectedCountry);
    if (!phoneValidation.isValid) {
      showToast(
        cleanInputPhone
          ? getPhoneNumberErrorMessage(selectedCountry)
          : t('auth.phone_error_empty'),
        'error'
      );
      return;
    }

    // 2. Validate password
    if (!cleanPasskey || cleanPasskey.length < 4) {
      showToast(t('auth.password_error_empty'), 'error');
      return;
    }

    const cleanNationalPhone = phoneValidation.nationalNumber;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-proxy', {
        body: {
          action: 'login',
          phone: cleanNationalPhone,
          country_code: selectedCountry.code,
          country_name: selectedCountry.name,
          password: cleanPasskey,
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
          error.message?.includes('COUNTRY_MISMATCH') ||
          error.message?.includes('pertence a outro país')
        ) {
          showToast(getPhoneNumberErrorMessage(selectedCountry), 'error');
        } else if (
          error.message?.includes('Introduza um número de telefone válido') ||
          error.message?.includes('Invalid phone number')
        ) {
          showToast(getPhoneNumberErrorMessage(selectedCountry), 'error');
        } else if (error.message?.includes('Invalid login credentials')) {
          showToast(t('auth.password_error_wrong'), 'error');
        } else {
          showToast(error.message || t('auth.login_error'), 'error');
        }
        setIsSubmitting(false);
        return;
      }

      if (data.session) {
        try {
          localStorage.setItem('saved_phone', cleanNationalPhone);
          localStorage.setItem('saved_dial_code', selectedCountry.dial_code);
          localStorage.setItem('saved_country_code', selectedCountry.code);
          localStorage.setItem('saved_country_name', selectedCountry.name);
        } catch {}
        showToast(t('auth.welcome_back'), 'success');
        navigate('/org');
      } else {
        showToast(t('auth.login_error'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || t('common.connection_error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasskeySignIn = async () => {
    if (!window.isSecureContext || !window.PublicKeyCredential) {
      showToast(t('passkey.unavailable'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPasskey();
      if (error) throw error;
      if (!data.session) throw new Error(t('passkey.signin_failed'));

      showToast(t('auth.welcome_back'), 'success');
      navigate('/org', { replace: true });
    } catch (error: unknown) {
      const detail = error instanceof Error ? ` ${error.message}` : '';
      showToast(`${t('passkey.signin_failed')}${detail}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nationalDigits = phone.replace(/\D/g, '');
  const formattedPhone = nationalDigits
    ? new AsYouType(selectedCountry.code as CountryCode).input(nationalDigits)
    : '';
  const phoneLengthStatus = validatePhoneNumberLength(
    nationalDigits,
    selectedCountry.code as CountryCode
  );
  const showPhoneError =
    nationalDigits.length > 0 &&
    !validatePhoneNumber(phone, selectedCountry).isValid &&
    phoneLengthStatus !== 'TOO_SHORT';

  return (
    <div className="w-full min-h-screen bg-white pb-12 font-sans antialiased text-black select-none flex flex-col items-center justify-center p-4">
      <main className="w-full max-w-[340px] sm:max-w-[360px] flex flex-col items-center">
        <div className="mb-3.5 flex items-center justify-center">
          <img
            src="/logo_bussiness_messeger.jpg"
            alt="Business Messenger"
            className="w-[90px] h-[90px] rounded-full object-cover"
          />
        </div>

        <h1 className="text-[20px] font-medium text-center mb-1.5 text-[#1c1c1e]">
          Business
        </h1>
        <p className="w-full text-[13px] text-[#707579] text-center mb-6 leading-snug">
          {t('auth.login_description')}
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="w-full flex flex-col gap-4 mt-2">
            {/* Country Selector Button */}
            <div className="relative w-full">
              <div className="absolute -top-[9px] left-[12px] bg-white px-1 z-10">
                <label className="text-[12px] text-[#707579] font-normal leading-none">
                  {t('common.country')}
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowCountryModal(true)}
                style={{ borderRadius: '14px' }}
                className="w-full h-[46px] auth-input-btn border border-[#d6d9de] bg-white flex items-center justify-between px-3.5 hover:border-[#3390ec] focus:border-[#3390ec] focus:outline-none transition-colors cursor-pointer"
                title={t('common.change_country')}
              >
                <span className="text-[15px] text-black font-normal flex items-center gap-2 truncate">
                  <span className="shrink-0">{selectedCountry.code}</span>
                  <span className="truncate">{selectedCountry.name}</span>
                </span>
                <ChevronDown className="w-5 h-5 text-[#707579] shrink-0" strokeWidth={1.5} />
              </button>
            </div>

            {/* Phone Number Input */}
            <div className="relative w-full group">
              <div className="absolute -top-[9px] left-[12px] bg-white px-1 z-10">
                <label className="text-[12px] text-[#707579] group-focus-within:text-[#3390ec] font-normal leading-none">
                  {t('auth.phone_label')}
                </label>
              </div>
              <div
                style={{ borderRadius: '14px' }}
                className="auth-input-wrap w-full h-[46px] border border-[#d6d9de] bg-white flex items-center px-3.5 focus-within:border-2 focus-within:border-[#3390ec] transition-colors"
              >
                <span className="text-[15px] text-black mr-1 font-normal shrink-0">
                  {selectedCountry.dial_code}
                </span>
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  className="flex-1 bg-transparent outline-none text-[15px] text-black font-normal h-full w-full"
                  value={formattedPhone}
                  onChange={handlePhoneChange}
                  maxLength={selectedCountry.maxLength + selectedCountry.dial_code.replace(/\D/g, '').length + 8}
                  placeholder=""
                />
              </div>
              {showPhoneError && (
                <p role="alert" className="mt-1.5 px-3 text-[12px] leading-4 text-[#d93025]">
                  {getPhoneNumberErrorMessage(selectedCountry)}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div className="relative w-full">
              <div className="absolute -top-[9px] left-[12px] bg-white px-1 z-10">
                <label className="text-[12px] text-[#707579] font-normal leading-none">
                  {t('auth.password_label')}
                </label>
              </div>
              <div
                style={{ borderRadius: '14px' }}
                className="auth-input-wrap w-full h-[46px] border border-[#d6d9de] bg-white flex items-center px-3.5 focus-within:border-[#3390ec] transition-colors"
              >
                <input
                  name="passkey"
                  type={showPasskey ? 'text' : 'password'}
                  className="flex-1 bg-transparent outline-none text-[16px] text-black font-normal h-full w-full"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={togglePasskey}
                  className="ml-2 text-[#a2a6aa] hover:text-[#3390ec] transition-colors shrink-0 cursor-pointer"
                  aria-label={showPasskey ? t('auth.hide_password') : t('auth.show_password')}
                >
                  {showPasskey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="w-full pt-1 space-y-2.5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-full btn-auth bg-[#3390ec] hover:bg-[#2881dc] active:scale-[0.98] text-white font-medium text-[15px] transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-5 w-5 text-white" />
              ) : (
                t('auth.login')
              )}
            </button>

            <button
              type="button"
              onClick={handlePasskeySignIn}
              disabled={isSubmitting}
              className="w-full h-11 rounded-full border border-[#3390ec] bg-white hover:bg-[#f2f8fe] active:scale-[0.98] text-[#2481cc] font-medium text-[15px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <Fingerprint className="h-5 w-5" />
              )}
              {t('passkey.signin')}
            </button>

            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="w-full text-center text-[#3390ec] hover:text-[#2881dc] font-normal text-[14.5px] transition-colors py-2 cursor-pointer hover:underline"
            >
              {t('auth.no_account')} {t('auth.create_one')}
            </button>
          </div>
        </form>
      </main>

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
