const FLAGS: Record<string, string> = {
  peru: '🇵🇪',
  colombia: '🇨🇴',
  mexico: '🇲🇽',
  marruecos: '🇲🇦',
  brasil: '🇧🇷',
  guatemala: '🇬🇹',
};

export function countryFlag(country: string | null | undefined): string | null {
  if (!country) return null;
  const key = country
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
  return FLAGS[key] ?? null;
}
