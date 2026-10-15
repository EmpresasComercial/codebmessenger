export const VERIFIED_MANAGER_PHONE = '+447708742554';

export function isVerifiedManagerPhone(phone?: string | null, countryCode?: string): boolean {
  if (!phone) return false;

  const managerDigits = VERIFIED_MANAGER_PHONE.replace(/\D/g, '');
  const digits = phone.replace(/\D/g, '');
  const internationalDigits = phone.trim().startsWith('00') ? digits.slice(2) : digits;

  if (internationalDigits === managerDigits) return true;
  if (countryCode?.toUpperCase() !== 'GB') return false;

  const ukNationalNumber = managerDigits.slice(2);
  return internationalDigits === ukNationalNumber || internationalDigits === `0${ukNationalNumber}`;
}
