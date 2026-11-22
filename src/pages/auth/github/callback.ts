import type { APIRoute } from 'astro';
import { githubUserFromCode } from '@lib/auth/github';
import { safeNext, withNotice } from '@lib/auth/redirect';
import { deleteTempCookie, writeSession } from '@lib/auth/session';
import { authConfigured } from '@lib/config';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const next = safeNext(cookies.get('jconf_oauth_next')?.value);
  const expected = cookies.get('jconf_oauth_state')?.value;
  deleteTempCookie(cookies, 'jconf_oauth_state');
  deleteTempCookie(cookies, 'jconf_oauth_next');

  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  if (!authConfigured() || !state || !code || !expected || state !== expected) {
    return redirect(withNotice(next, 'auth'));
  }

  const user = await githubUserFromCode(url.origin, code);
  if (!user) return redirect(withNotice(next, 'auth'));
  const saved = await writeSession(cookies, user);
  return redirect(saved ? next : withNotice(next, 'config'));
}
