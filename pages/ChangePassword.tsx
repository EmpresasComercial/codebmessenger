import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\s/g, '');
    setFormData(prev => ({ ...prev, [e.target.name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.currentPassword) {
      showToast(t('password.current_required'), 'error');
      return;
    }
    if (formData.newPassword.length < 6) {
      showToast(t('password.minimum_length'), 'error');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      showToast(t('password.match_error'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error(t('password.session_invalid'));

      const email = user.email || (user.user_metadata?.phone ? `${user.user_metadata.phone}@user.com` : null);
      if (!email) throw new Error(t('password.identity_missing'));

      // 1. Valida se a senha atual está correta tentando autenticar
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: formData.currentPassword
      });
      if (signInError) throw new Error(t('password.current_incorrect'));

      // 2. Atualiza a senha pelo método oficial padronizado do Supabase passando a senha atual
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
        current_password: formData.currentPassword
      });
      if (updateError) {
        if (updateError.message.includes('Current password required') || updateError.message.includes('current password')) {
          throw new Error(t('password.current_confirmation_required'));
        }
        if (updateError.message.includes('New password should be different')) {
          throw new Error(t('password.must_differ'));
        }
        console.error('Password update failed:', updateError);
        throw new Error(t('password.update_failed'));
      }

      showToast(t('password.success'), 'success');
      setTimeout(() => navigate(-1), 1200);
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      if (!message || ![
        t('password.session_invalid'),
        t('password.identity_missing'),
        t('password.current_incorrect'),
        t('password.current_confirmation_required'),
        t('password.must_differ'),
        t('password.update_failed'),
      ].includes(message)) {
        console.error('Password update failed:', err);
        showToast(t('password.update_failed'), 'error');
        return;
      }
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] font-sans text-black pb-10">

      {/* HEADER */}
      <div className="flex items-center px-4 pt-5 pb-3 bg-[#f1f1f2] sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="mr-4 active:opacity-50 cursor-pointer">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
          </svg>
        </button>
        <span className="text-[18px] font-semibold flex-1">{t('password.title')}</span>
      </div>

      <form onSubmit={handleSubmit} id="change-pass-form" className="px-3 flex flex-col gap-4">

        {/* Icon header */}
        <div className="flex flex-col items-center py-6">
          <div className="w-[64px] h-[64px] rounded-none bg-[#2481cc] flex items-center justify-center mb-3 shadow-[0_4px_12px_rgba(36,129,204,0.3)]">
            <ShieldAlert className="w-8 h-8 text-white" strokeWidth={1.8} />
          </div>
          <p className="text-[13px] text-[#8e8e93] text-center max-w-[260px] leading-snug">
            Escolha uma senha forte com pelo menos 6 caracteres.
          </p>
        </div>

        {/* Fields card */}
        <div className="bg-white rounded-none overflow-hidden shadow-none">
          {/* Current password */}
          <div className="flex items-center px-4 h-[52px] border-b border-[#e5e5e5]">
            <input
              name="currentPassword"
              type={showCurrentPass ? 'text' : 'password'}
              className="flex-1 bg-transparent outline-none text-[16px] text-black placeholder:text-[#c7c7cc]"
              placeholder={t('password.old_label')}
              value={formData.currentPassword}
              onChange={handleChange}
            />
            <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="ml-2 text-[#c7c7cc] active:opacity-50 cursor-pointer">
              {showCurrentPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* New password */}
          <div className="flex items-center px-4 h-[52px] border-b border-[#e5e5e5]">
            <input
              name="newPassword"
              type={showNewPass ? 'text' : 'password'}
              className="flex-1 bg-transparent outline-none text-[16px] text-black placeholder:text-[#c7c7cc]"
              placeholder={t('password.new_label')}
              value={formData.newPassword}
              onChange={handleChange}
            />
            <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="ml-2 text-[#c7c7cc] active:opacity-50 cursor-pointer">
              {showNewPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Confirm password */}
          <div className="flex items-center px-4 h-[52px]">
            <input
              name="confirmPassword"
              type={showConfirmPass ? 'text' : 'password'}
              className="flex-1 bg-transparent outline-none text-[16px] text-black placeholder:text-[#c7c7cc]"
              placeholder={t('password.confirm_placeholder')}
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="ml-2 text-[#c7c7cc] active:opacity-50 cursor-pointer">
              {showConfirmPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          form="change-pass-form"
          disabled={isSubmitting || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
          className="w-full h-[50px] rounded-none bg-[#2481cc] hover:bg-[#1f73b7] text-white font-semibold text-[16px] flex items-center justify-center disabled:opacity-40 active:scale-[0.99] transition-all shadow-[0_4px_12px_rgba(36,129,204,0.35)] cursor-pointer"
        >
          {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 text-white" /> : t('password.btn_update')}
        </button>

      </form>
    </div>
  );
}

