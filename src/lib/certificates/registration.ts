export type PaymentStatus = 'unpaid' | 'paid' | 'online';

export function paymentStatus(value: string | null | undefined): PaymentStatus {
  if (value === 'paid' || value === 'online') return value;
  return 'unpaid';
}

export function canDownload(status: PaymentStatus): boolean {
  return status === 'paid' || status === 'online';
}

export function registrationAllowed(input: { yearOpen: boolean; token: string; expected: string | null }): boolean {
  return input.yearOpen && Boolean(input.expected) && input.token === input.expected;
}

export function applyOnlineCode(input: { status: PaymentStatus; code: string; expected: string | null }): PaymentStatus {
  if (input.status === 'paid' || input.status === 'online') return input.status;
  const expected = input.expected?.trim().toLowerCase() ?? '';
  const code = input.code.trim().toLowerCase();
  if (!expected || code !== expected) return 'unpaid';
  return 'online';
}

export function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 9) return `51${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}
