export function attendeeNotice(code: string | null, year: number): string | null {
  switch (code) {
    case 'missing':
    case 'revoked':
    case 'forbidden':
      return `No tienes entrada registrada para JConf Perú ${year}.`;
    case 'taken':
      return 'Ese correo ya está vinculado a otra cuenta de GitHub.';
    case 'closed':
      return `El registro de JConf Perú ${year} está cerrado. Si ya estás validado, puedes generar tu certificado.`;
    case 'invalid-email':
      return 'Escribe el correo con el que pagaste.';
    case 'invalid-name':
      return 'Revisa tus nombres y apellidos antes de expedir.';
    case 'issued':
      return 'Tu certificado está listo.';
    case 'registered':
      return `Tu registro para JConf Perú ${year} quedó pendiente. Podrás descargar el certificado cuando confirmemos el pago o cuando escribas el código de la charla online.`;
    case 'updated':
      return 'Actualizamos tus datos. El certificado sigue pendiente de validación.';
    case 'locked':
      return 'Tu certificado ya fue validado. El nombre quedó fijo.';
    case 'bad-code':
      return 'Ese código no corresponde a las charlas online.';
    case 'online':
      return 'Tu participación en las charlas online quedó confirmada. Ya puedes descargar el certificado.';
    case 'invalid-phone':
      return 'Revisa el celular. Si lo dejas vacío, el registro continúa.';
    case 'auth':
      return 'No pudimos completar el ingreso con GitHub. Inténtalo de nuevo.';
    case 'config':
      return 'El ingreso con GitHub todavía no está configurado.';
    case 'error':
      return 'No pudimos consultar la lista. Inténtalo de nuevo en unos minutos.';
    default:
      return null;
  }
}
