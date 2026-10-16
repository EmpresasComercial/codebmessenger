import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { useLanguage } from '../contexts/LanguageContext';

interface ChangePasswordFormProps {
  onSuccess: () => void;
}

export default function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
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
        logger.error('ChangePassword', 'Password update failed:', updateError);
        throw new Error(t('password.update_failed'));
      }

      showToast(t('password.success'), 'success');
      onSuccess();
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
        logger.error('ChangePassword', 'Password update failed:', err);
        showToast(t('password.update_failed'), 'error');
        return;
      }
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#f1f1f2] pb-4 font-sans text-black">
      <form onSubmit={handleSubmit} id="change-pass-form" className="flex flex-col gap-3 px-4 pb-4 pt-3">
        <div className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white shadow-none">
          {/* Current password */}
          <div className="flex h-11 items-center border-b border-[#e5e5e5] px-3">
            <input
              name="currentPassword"
              type={showCurrentPass ? 'text' : 'password'}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-black outline-none placeholder:text-[#c7c7cc]"
              placeholder={t('password.old_label')}
              value={formData.currentPassword}
              onChange={handleChange}
            />
            <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="ml-2 shrink-0 text-[#c7c7cc] active:opacity-50 cursor-pointer" aria-label={showCurrentPass ? t('auth.hide_password') : t('auth.show_password')}>
              {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* New password */}
          <div className="flex h-11 items-center border-b border-[#e5e5e5] px-3">
            <input
              name="newPassword"
              type={showNewPass ? 'text' : 'password'}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-black outline-none placeholder:text-[#c7c7cc]"
              placeholder={t('password.new_label')}
              value={formData.newPassword}
              onChange={handleChange}
            />
            <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="ml-2 shrink-0 text-[#c7c7cc] active:opacity-50 cursor-pointer" aria-label={showNewPass ? t('auth.hide_password') : t('auth.show_password')}>
              {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Confirm password */}
          <div className="flex h-11 items-center px-3">
            <input
              name="confirmPassword"
              type={showConfirmPass ? 'text' : 'password'}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-black outline-none placeholder:text-[#c7c7cc]"
              placeholder={t('password.confirm_placeholder')}
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="ml-2 shrink-0 text-[#c7c7cc] active:opacity-50 cursor-pointer" aria-label={showConfirmPass ? t('auth.hide_password') : t('auth.show_password')}>
              {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          form="change-pass-form"
          disabled={isSubmitting || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
          className="flex h-10 min-w-28 self-end items-center justify-center rounded-lg bg-[#2481cc] px-5 text-[14px] font-semibold text-white transition-all hover:bg-[#1f73b7] active:scale-[0.99] disabled:opacity-40 cursor-pointer"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : t('password.reset_button')}
        </button>

      </form>
    </div>
  );
}
