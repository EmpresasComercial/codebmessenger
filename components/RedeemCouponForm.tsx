import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { useLanguage } from '../contexts/LanguageContext';

interface RedeemCouponFormProps {
  onRedeemed: (message: string) => void;
}

export default function RedeemCouponForm({ onRedeemed }: RedeemCouponFormProps) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (normalizedCode.length < 5) {
      showToast(t('coupons.error_invalid'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('pestgay', { p_code: normalizedCode });
      if (error) throw error;
      const result = data as { success: boolean; message: string } | null;
      if (!result?.success) {
        showToast(result?.message || t('coupons.error_invalid'), 'error');
        return;
      }

      showToast(result.message, 'success');
      onRedeemed(result.message);
    } catch (error) {
      logger.error('RedeemCouponForm', 'Coupon redemption failed:', error);
      showToast(error instanceof Error ? error.message : t('coupons.error_invalid'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-4 pb-4 pt-3">
      <label htmlFor="botfather-coupon-code" className="text-[13px] font-medium text-[#667085]">
        {t('coupons.label')}
      </label>
      <input
        id="botfather-coupon-code"
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder={t('coupons.placeholder')}
        className="h-11 rounded-lg border border-[#d0d5dd] bg-white px-3 text-[14px] text-[#111827] outline-none focus:border-[#2481cc]"
      />
      <button
        type="submit"
        disabled={isSubmitting || normalizedCode.length < 5}
        className="flex h-10 min-w-28 self-end items-center justify-center rounded-lg bg-[#2481cc] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#1f73b7] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('coupons.redeem_button')}
      </button>
    </form>
  );
}
