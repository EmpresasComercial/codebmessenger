import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { formatCurrency, CurrencyType } from '../../../lib/currency';

interface BalanceCardProps {
  recharge: number;
  profit: number;
  withdrawn: number;
  teamCommission: number;
  currency: CurrencyType;
  onRecharge: () => void;
  onWithdraw: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  recharge,
  profit,
  withdrawn,
  teamCommission,
  currency,
  onRecharge,
  onWithdraw
}) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-3 px-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-none py-2.5 px-3 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-[10.5px] text-[#888888] font-normal mb-0.5">{t('profile.recharge')}</p>
          <p className="text-[13.5px] font-medium text-[#FE384F]">{formatCurrency(recharge, currency)}</p>
        </div>
        <div className="bg-white rounded-none py-2.5 px-3 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-[10.5px] text-[#888888] font-normal mb-0.5">{t('profile.profit')}</p>
          <p className="text-[13.5px] font-medium text-[#202020]">{formatCurrency(profit, currency)}</p>
        </div>
        <div className="bg-white rounded-none py-2.5 px-3 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-[10.5px] text-[#888888] font-normal mb-0.5">{t('profile.total_withdrawn')}</p>
          <p className="text-[13.5px] font-medium text-[#202020]">{formatCurrency(withdrawn, currency)}</p>
        </div>
        <div className="bg-white rounded-none py-2.5 px-3 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-[10.5px] text-[#888888] font-normal mb-0.5">{t('profile.team_commissions')}</p>
          <p className="text-[13.5px] font-medium text-[#202020]">{formatCurrency(teamCommission, currency)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={onRecharge}
          className="h-[44px] rounded-none bg-[#FE384F] hover:bg-[#E02E44] text-white font-normal text-[13.5px] transition-all active:scale-[0.99] cursor-pointer shadow-sm flex items-center justify-center"
        >
          {t('profile.recharge')}
        </button>
        <button
          onClick={onWithdraw}
          className="h-[44px] rounded-none bg-white text-[#202020] font-normal text-[13.5px] transition-all hover:bg-gray-50 active:scale-[0.99] cursor-pointer shadow-sm flex items-center justify-center border border-gray-100"
        >
          {t('profile.withdraw')}
        </button>
      </div>
    </div>
  );
};

