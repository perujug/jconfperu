import type { APIRoute } from 'astro';
import { githubAuthorizeUrl } from '@lib/auth/github';
import { setTempCookie } from '@lib/auth/session';
import { safeNext, withNotice } from '@lib/auth/redirect';
import { authConfigured } from '@lib/config';

export const prerender = false;

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const next = safeNext(url.searchParams.get('next'));
  if (!authConfigured()) return redirect(withNotice(next, 'config'));
  const state = randomState();
  setTempCookie(cookies, 'jconf_oauth_state', state, 60 * 10);
  setTempCookie(cookies, 'jconf_oauth_next', next, 60 * 10);
  return redirect(githubAuthorizeUrl(url.origin, state));
}
