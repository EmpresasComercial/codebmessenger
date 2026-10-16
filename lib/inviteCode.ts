export function getInviteCode(searchParams: URLSearchParams): string | null {
  const code = searchParams.get('ref')?.trim();

  return code && /^\d{6}$/.test(code) ? code : null;
}
