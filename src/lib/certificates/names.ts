const CONTROL = /[\u0000-\u001F\u007F]/g;
const PERSON_NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'\u2019-]*$/u;
const MAX_LENGTH = 80;

export function cleanPersonName(value: string): string {
  return value.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
}

export function splitSuggestedName(name: string): { givenName: string; familyName: string } {
  const clean = cleanPersonName(name);
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length < 2) return { givenName: clean, familyName: '' };
  return {
    givenName: parts.slice(0, -1).join(' '),
    familyName: parts[parts.length - 1] ?? '',
  };
}

export function validateNames(
  givenRaw: string,
  familyRaw: string,
):
  | { ok: true; givenName: string; familyName: string; displayName: string }
  | { ok: false; reason: string } {
  const givenName = cleanPersonName(givenRaw);
  const familyName = cleanPersonName(familyRaw);
  if (!givenName || !familyName) {
    return { ok: false, reason: 'Escribe tus nombres y apellidos.' };
  }
  if (givenName.length > MAX_LENGTH || familyName.length > MAX_LENGTH) {
    return { ok: false, reason: 'El nombre es demasiado largo.' };
  }
  if (!PERSON_NAME.test(givenName) || !PERSON_NAME.test(familyName)) {
    return { ok: false, reason: 'Usa solo letras en los nombres y apellidos.' };
  }
  return { ok: true, givenName, familyName, displayName: `${givenName} ${familyName}` };
}

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!email || email.length > 200) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}
