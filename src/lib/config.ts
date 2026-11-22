function read(name: string): string {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  const fromFile = (import.meta.env as Record<string, unknown> | undefined)?.[name];
  return typeof fromFile === 'string' ? fromFile.trim() : '';
}

export function databaseUrl(): string {
  return read('DATABASE_URL');
}

export function authSecret(): string {
  return read('AUTH_SECRET');
}

export function githubClientId(): string {
  return read('GITHUB_CLIENT_ID');
}

export function githubClientSecret(): string {
  return read('GITHUB_CLIENT_SECRET');
}

export function whatsAppPhone(): string {
  return read('CERT_WHATSAPP_E164');
}

export function bootstrapAdminIds(): number[] {
  return read('ADMIN_GITHUB_IDS')
    .split(/[,\s]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

export function authConfigured(): boolean {
  return Boolean(authSecret() && githubClientId() && githubClientSecret());
}
