export function correctionMessage(input: {
  year: number;
  displayName: string;
  email: string;
  githubLogin: string;
  reason: 'missing' | 'taken' | 'revoked';
}): string {
  const intro =
    input.reason === 'taken'
      ? `Hola, pagué mi entrada a JConf Perú ${input.year} y mi correo ya está vinculado a otra cuenta de GitHub.`
      : `Hola, pagué mi entrada a JConf Perú ${input.year} y no aparezco en la lista de certificados.`;
  return [
    intro,
    `Nombre en el certificado: ${input.displayName || '(sin indicar)'}`,
    `Correo con el que pagué: ${input.email}`,
    `GitHub: @${input.githubLogin}`,
  ].join('\n');
}

export function whatsAppLink(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
