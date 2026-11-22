import { githubClientId, githubClientSecret } from '@lib/config';

export type GithubUser = {
  githubId: number;
  login: string;
  name: string;
};

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'jconfperu',
};

export function githubAuthorizeUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: githubClientId(),
    redirect_uri: `${origin}/auth/github/callback/`,
    scope: 'read:user',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function githubUserFromCode(origin: string, code: string): Promise<GithubUser | null> {
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: githubClientId(),
      client_secret: githubClientSecret(),
      code,
      redirect_uri: `${origin}/auth/github/callback/`,
    }),
  });
  if (!tokenResponse.ok) return null;
  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) return null;

  const userResponse = await fetch('https://api.github.com/user', {
    headers: { ...headers, Authorization: `Bearer ${token.access_token}` },
  });
  if (!userResponse.ok) return null;
  const user = (await userResponse.json()) as { id?: number; login?: string; name?: string | null };
  if (!user.id || !user.login) return null;
  return { githubId: user.id, login: user.login, name: user.name?.trim() || user.login };
}

export async function resolveGithubAccount(input: string): Promise<GithubUser | null> {
  const value = input.trim().replace(/^@/, '');
  if (!value) return null;
  const path = /^\d+$/.test(value) ? `user/${value}` : `users/${encodeURIComponent(value)}`;
  const response = await fetch(`https://api.github.com/${path}`, { headers });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: number; login?: string; name?: string | null };
  if (!user.id || !user.login) return null;
  return { githubId: user.id, login: user.login, name: user.name?.trim() || user.login };
}
