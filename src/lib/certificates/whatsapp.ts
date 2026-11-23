export function correctionMessage(input: {
  year: number;
  displayName: string;
  email: string;
  githubEmails?: string[];
  githubLogin: string;
  reason: 'missing' | 'taken' | 'revoked';
}): string {
  const intro =
    input.reason === 'taken'
      ? `Hola, pagué mi entrada a JConf Perú ${input.year} y mi correo ya está vinculado a otra cuenta de GitHub. ¿Pueden actualizar el correo o el GitHub de mi registro?`
      : input.reason === 'revoked'
        ? `Hola, pagué mi entrada a JConf Perú ${input.year} y mi certificado figura revocado. ¿Pueden revisar mi registro?`
        : `Hola, entré con GitHub a JConf Perú ${input.year}. Mi usuario no está en la lista y el correo de la cuenta tampoco coincide. ¿Pueden actualizar el correo o el GitHub de mi registro?`;
  const githubEmails = [...new Set((input.githubEmails ?? []).map((email) => email.trim()).filter(Boolean))];
  return [
    intro,
    `Nombre en el certificado: ${input.displayName || '(sin indicar)'}`,
    `Correo con el que pagué: ${input.email || '(no indicado)'}`,
    githubEmails.length > 0 ? `Correos de mi GitHub: ${githubEmails.join(', ')}` : '',
    `GitHub: @${input.githubLogin}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function whatsAppLink(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
