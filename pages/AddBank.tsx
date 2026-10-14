import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Loader2, MoreHorizontal, X } from 'lucide-react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const CARD_NAMES = [
  'Banco BAI',
  'Banco BFA',
  'Banco BIC',
  'Banco SOL',
  'Banco Atlântico'
];

const getBankDisplayName = (bankName: string) => bankName.replace(/^Banco\s+/i, '');

interface BankResponse {
  success: boolean;
  message: string;
}

interface AddBankProps {
  embedded?: boolean;
  onSaved?: (account: { holderName: string; bankName: string; iban: string }) => void;
  onAlreadyExists?: () => void;
}

export default function AddBank({ embedded = false, onSaved, onAlreadyExists }: AddBankProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBankSelector, setShowBankSelector] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    holderName: '',
    cardName: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let sanitized = value;
    if (name === 'cardNumber') sanitized = value.replace(/\D/g, '');
    else if (name === 'holderName') sanitized = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').replace(/\s\s+/g, ' ');
    setFormData(prev => ({ ...prev, [name]: sanitized }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cardNumber || formData.cardNumber.length < 5) {
      showToast(t('bank.invalid_iban'), 'error');
      return;
    }
    if (!formData.holderName.trim() || formData.holderName.trim().length < 3) {
      showToast(t('bank.holder_required'), 'error');
      return;
    }
    if (!formData.cardName) {
      showToast(t('bank.select_required'), 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: existingAccounts, error: accountsError } = await supabase.rpc('get_my_bank_accounts_mcpn');
      if (accountsError) throw accountsError;
      if (Array.isArray(existingAccounts) && existingAccounts.length > 0) {
        if (embedded) {
          onAlreadyExists?.();
        } else {
          showToast(t('bank.already_registered'), 'error');
        }
        return;
      }

      const fullIban = formData.cardNumber.startsWith('AO06') ? formData.cardNumber : `AO06${formData.cardNumber}`;
      const { data, error } = await supabase.rpc('save_bank_data_mcpn', {
        p_bank_name: formData.cardName,
        p_holder_name: formData.holderName.trim(),
        p_iban: fullIban
      }) as { data: BankResponse | null; error: any };

      if (error) throw error;
      if (data && data.success) {
        if (embedded) {
          onSaved?.({
            holderName: formData.holderName.trim(),
            bankName: formData.cardName,
            iban: fullIban
          });
        } else {
          showToast(data.message || t('bank.saved'), 'success');
          navigate(redirectPath || '/informacao-bancaria');
        }
      } else {
        const message = data?.message || 'Falha ao salvar cartão.';
        if (embedded && /já existe|ja existe|conta.*cadastrad/i.test(message)) {
          onAlreadyExists?.();
        } else {
          showToast(message, 'error');
        }
      }
    } catch (err: any) {
      showToast(err.message || t('bank.save_failed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${embedded ? 'h-full' : 'min-h-[100dvh]'} w-full bg-[#f0eff5] font-sans text-black`}>
      {!embedded && <header className="sticky top-0 z-20 grid h-[68px] grid-cols-[1fr_auto_1fr] items-center bg-[#f0eff5] px-4">
        <button
          type="button"
          onClick={() => navigate(redirectPath || '/settings')}
          className="flex w-fit items-center gap-1 text-[#2481cc] active:opacity-50"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={2.2} />
          <span className="text-[16px]">{t('common.back')}</span>
        </button>
        <div className="flex flex-col items-center leading-tight">
          <div className="flex items-center gap-1">
            <span className="text-[17px] font-semibold">Wallet</span>
            <span className="flex h-[17px] w-[17px] items-center justify-center rounded-full bg-[#2481cc] text-white">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          </div>
          <span className="text-[12px] text-[#8e8e93]">mini app</span>
        </div>
        <button
          type="button"
          onClick={() => showToast(t('bank.info_title'), 'info')}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#2481cc] text-[#2481cc] active:opacity-50"
          aria-label={t('common.more_options')}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>}

      <form onSubmit={handleSubmit} id="add-card-form" className={`mx-auto flex w-full max-w-[520px] flex-col ${embedded ? 'h-full gap-3 overflow-y-auto px-4 pb-4 pt-3' : 'gap-5 px-5 pb-8 pt-7'}`}>
        <section>
          <label className={`${embedded ? 'mb-1.5' : 'mb-2'} block px-4 text-[12px] font-medium tracking-wide text-[#85858b]`}>
            {t('bank.iban')}
          </label>
          <div className={`flex ${embedded ? 'h-[48px] gap-2.5 rounded-[10px] px-3.5' : 'h-[54px] gap-3 rounded-[13px] px-4'} items-center bg-white`}>
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-[#c7c7cc]" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18M7 15h3" />
            </svg>
            <input
              name="cardNumber"
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              className={`min-w-0 flex-1 bg-transparent ${embedded ? 'text-[15px]' : 'text-[17px]'} outline-none placeholder:text-[#c7c7cc]`}
              placeholder={t('bank.iban_placeholder')}
              value={formData.cardNumber}
              onChange={handleChange}
              aria-label={t('bank.iban_accessible')}
            />
          </div>
        </section>

        <section className="flex gap-4">
          <div className="w-fit max-w-[45%] shrink-0">
            <label className={`${embedded ? 'mb-1.5' : 'mb-2'} block px-4 text-[12px] font-medium tracking-wide text-[#85858b]`}>
              {t('bank.name')}
            </label>
            <button
              type="button"
              onClick={() => setShowBankSelector(true)}
              className={`flex ${embedded ? 'h-[46px] rounded-[10px] px-3.5 text-[14px]' : 'h-[54px] rounded-[13px] px-4 text-[15px]'} w-fit max-w-full items-center justify-between bg-white text-left active:bg-[#f9f9fb] ${
                formData.cardName ? 'text-black' : 'text-[#a7a7ad]'
              }`}
              aria-haspopup="dialog"
              aria-expanded={showBankSelector}
              aria-label={t('bank.select')}
            >
              <span className="truncate">{formData.cardName ? getBankDisplayName(formData.cardName) : t('bank.select')}</span>
              <ChevronDown className="ml-2 h-5 w-5 shrink-0 text-[#a7a7ad]" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <label className={`${embedded ? 'mb-1.5' : 'mb-2'} block px-4 text-[12px] font-medium tracking-wide text-[#85858b]`}>
              {t('bank.holder')}
            </label>
            <input
              id="holderName"
              name="holderName"
              type="text"
              autoComplete="name"
              className={`w-full min-w-0 bg-white outline-none placeholder:text-[#a7a7ad] ${embedded ? 'h-[46px] rounded-[10px] px-3.5 text-[14px]' : 'h-[54px] rounded-[13px] px-4 text-[15px]'}`}
              placeholder={t('bank.holder_placeholder')}
              value={formData.holderName}
              onChange={handleChange}
              aria-label={t('bank.holder')}
            />
          </div>
        </section>

        <p className={`px-1 leading-relaxed text-[#8e8e93] ${embedded ? 'text-[12px]' : 'text-[13px]'}`}>
          {t('bank.iban_prefix_note')}
        </p>

        <button
          type="submit"
          form="add-card-form"
          disabled={isSubmitting || !formData.cardNumber || !formData.holderName || !formData.cardName}
          className={`flex w-full items-center justify-center rounded-[10px] bg-[#2481cc] font-semibold text-white shadow-[0_4px_12px_rgba(36,129,204,0.25)] transition-transform active:scale-[0.99] disabled:opacity-40 ${embedded ? 'h-[44px] text-[14px]' : 'h-[52px] rounded-[13px] text-[16px]'}`}
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : t('bank.save_btn')}
        </button>
      </form>

      {showBankSelector && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-3 sm:items-center"
          onClick={() => setShowBankSelector(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bank-selector-title"
            className="mb-3 w-full max-w-[420px] overflow-hidden rounded-[18px] bg-white shadow-2xl sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#e8e8ec] px-4 py-3">
              <h2 id="bank-selector-title" className="text-[16px] font-semibold">{t('bank.select')}</h2>
              <button
                type="button"
                onClick={() => setShowBankSelector(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f1f4] text-[#777] active:opacity-60"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[55dvh] overflow-y-auto p-2">
              {CARD_NAMES.map((bank) => (
                <button
                  key={bank}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, cardName: bank }));
                    setShowBankSelector(false);
                  }}
                  className={`flex min-h-[48px] w-full items-center justify-between rounded-[10px] px-3 text-left text-[15px] active:bg-[#f3f7fc] ${
                    formData.cardName === bank ? 'bg-[#f0f7ff] font-medium text-[#2481cc]' : 'text-[#222]'
                  }`}
                >
                  {bank}
                  {formData.cardName === bank && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
