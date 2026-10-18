export function formatNotificationSenderTitle(
  displayName?: string | null,
  formattedPhone?: string | null,
): string {
  const name = displayName?.trim();
  const rawPhone = formattedPhone?.trim();
  const normalizedPhone = rawPhone
    ?.replace(/[()]/g, '')
    .replace(/^\s*00/, '+')
    .replace(/^\+\s*/, '+')
    .replace(/[^\d+\s.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const phone = normalizedPhone && !['contacto', 'telefone desconhecido'].includes(normalizedPhone.toLowerCase())
    ? normalizedPhone.startsWith('+')
      ? normalizedPhone
      : `+${normalizedPhone.replace(/^[\s.-]+|[\s.-]+$/g, '')}`
    : '';

  if (name && name !== 'Membro') return phone ? `${name} ${phone}` : name;
  return phone || 'Membro';
}
