import type { AstroCookies } from 'astro';
import { authSecret } from '@lib/config';

export type Session = {
  githubId: number;
  login: string;
  name: string;
  emails: string[];
  exp: number;
};

const COOKIE = 'jconf_session';
const MAX_AGE = 60 * 60 * 24 * 30;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function sealSession(session: Omit<Session, 'exp'>): Promise<string | null> {
  const secret = authSecret();
  if (!secret) return null;
  const payload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify({ ...session, exp: Date.now() + MAX_AGE * 1000 })),
  );
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(payload)));
  return `${payload}.${bytesToBase64Url(signature)}`;
}

export async function openSession(token: string | undefined): Promise<Session | null> {
  const secret = authSecret();
  if (!secret || !token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret),
    base64UrlToBytes(signature),
    new TextEncoder().encode(payload),
  );
  if (!valid) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as Session;
    if (!session.githubId || !session.login || session.exp < Date.now()) return null;
    return { ...session, emails: Array.isArray(session.emails) ? session.emails : [] };
  } catch {
    return null;
  }
}

function cookieOptions(maxAge = MAX_AGE) {
  return {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export async function readSession(cookies: AstroCookies): Promise<Session | null> {
  return openSession(cookies.get(COOKIE)?.value);
}

export async function writeSession(cookies: AstroCookies, session: Omit<Session, 'exp'>): Promise<boolean> {
  const token = await sealSession(session);
  if (!token) return false;
  cookies.set(COOKIE, token, cookieOptions());
  return true;
}

export function clearSession(cookies: AstroCookies): void {
  cookies.delete(COOKIE, { path: '/' });
}

export function setTempCookie(cookies: AstroCookies, name: string, value: string, maxAge: number): void {
  cookies.set(name, value, cookieOptions(maxAge));
}

export function deleteTempCookie(cookies: AstroCookies, name: string): void {
  cookies.delete(name, { path: '/' });
}
