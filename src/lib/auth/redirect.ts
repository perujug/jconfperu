export function withNotice(path: string, notice: string): string {
  const url = new URL(path, 'https://jconfperu.local');
  url.searchParams.set('aviso', notice);
  return `${url.pathname}${url.search}`;
}

export function safeNext(value: string | null | undefined, fallback = '/mi/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.includes('://')) {
    return fallback;
  }
  return value;
}
