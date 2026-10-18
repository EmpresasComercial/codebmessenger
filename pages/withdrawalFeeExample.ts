export interface WithdrawalFeeExample {
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  text: string;
}

export function buildWithdrawalFeeExample(
  feePercent: number,
  formatAmount: (amount: number) => string
): WithdrawalFeeExample {
  const grossAmount = 10000;
  const feeAmount = Math.round((grossAmount * feePercent) / 100);
  const netAmount = grossAmount - feeAmount;

  return {
    grossAmount,
    feeAmount,
    netAmount,
    text: `Por exemplo, numa retirada de ${formatAmount(grossAmount)}, a taxa é ${formatAmount(feeAmount)} e o valor líquido a receber é ${formatAmount(netAmount)}.`,
  };
}
