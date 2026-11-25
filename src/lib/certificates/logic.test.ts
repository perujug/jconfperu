import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeCsv, parseCertificateCsv, type RosterEntry } from './csv';
import { certificateStep, classifyClaim } from './eligibility';
import { applyOnlineCode, canDownload, normalizePhone, registrationAllowed } from './registration';
import { parseRole } from './roles';
import { normalizeEmail, validateNames } from './names';
import { renderCertificatePdf } from './pdf';
import { editionFacts, freezeCertificate, recognitionParagraph, type EditionFacts } from './snapshot';
import { verifiedGithubEmails } from '../auth/github';
import { safeNext } from '../auth/redirect';
import { publicBase } from '../site';
import { rosterForExport, rosterWorkbook, type RosterExportPerson } from './excel';
import { rosterWindow } from './pages';
import { attendeeNotice } from './messages';
import { certificateClaimOpen, certificatePendingCopy, certificateReleased, certificateShareDraft, linkedInComposerUrl, linkedInShareUrl } from './release';
import { correctionMessage, whatsAppLink } from './whatsapp';

const edition: EditionFacts = {
  eventTitle: 'JConf Perú 2026',
  tagline: 'La conferencia para usuarios y desarrolladores Java.',
  dateLabel: 'sábado, 28 de noviembre de 2026',
  venueLine: 'Edificio SOHO Plus, Lima, Perú',
};

function entry(overrides: Partial<RosterEntry> = {}): RosterEntry {
  return {
    id: 'id-1',
    year: 2026,
    email: 'ana@example.com',
    role: 'participante',
    suggestedName: 'Ana Pérez',
    githubId: 10,
    givenName: 'Ana',
    familyName: 'Pérez',
    publicCode: 'abc',
    revoked: false,
    issued: true,
    displayName: 'Ana Pérez',
    certificateTitle: 'Certificado de participación',
    recognitionText: 'texto congelado',
    editionDateLabel: 'sábado, 28 de noviembre de 2026',
    venueLine: 'Edificio SOHO Plus, Lima, Perú',
    ...overrides,
  };
}

test('normaliza el correo y rechaza un nombre vacío', () => {
  assert.equal(normalizeEmail('  Ana@Example.com '), 'ana@example.com');
  assert.equal(normalizeEmail('sin-arroba'), null);
  assert.equal(validateNames('María', '').ok, false);
  const names = validateNames('María Fernanda', "Quispe-Rojas");
  assert.equal(names.ok && names.displayName, 'María Fernanda Quispe-Rojas');
});

test('lee un CSV con punto y coma, comillas y rol por defecto', () => {
  const parsed = parseCertificateCsv(
    'correo;nombre;rol\nANA@example.com;"Pérez, Ana";\nmal\nb@example.com;Beto;conferencista\na@example.com;Ana;ponente\n',
  );
  assert.deepEqual(
    parsed.rows.map((row) => [row.email, row.suggestedName, row.role]),
    [
      ['ana@example.com', 'Pérez, Ana', 'participante'],
      ['b@example.com', 'Beto', 'conferencista'],
    ],
  );
  assert.equal(parsed.errors.length, 2);
});

test('un archivo de nombres y montos no entra sin correo', () => {
  const parsed = parseCertificateCsv('Name,Participante,Pago\nAna Pérez,,$35.00\n');
  assert.equal(parsed.rows.length, 0);
  assert.match(parsed.errors[0]?.message ?? '', /email o correo/);
});

test('volver a cargar el mismo correo no duplica la fila', () => {
  const row = { email: 'ana@example.com', suggestedName: 'Ana Pérez', role: 'participante' as const, line: 2 };
  const ids = { id: () => 'id-ana', code: () => 'code-ana' };
  const first = mergeCsv([], [row], 2026, ids);
  const second = mergeCsv(first.entries, [row], 2026, { id: () => 'otra', code: () => 'otro' });
  assert.equal(first.added, 1);
  assert.equal(second.added, 0);
  assert.equal(second.unchanged, 1);
  assert.equal(second.entries.filter((item) => item.email === row.email).length, 1);
  assert.equal(second.entries[0]?.id, 'id-ana');
});

test('el CSV repetido actualiza y no borra un certificado expedido', () => {
  const issued = entry();
  const first = mergeCsv([], [{ email: 'nueva@example.com', suggestedName: 'Nueva', role: 'participante', line: 2 }], 2026, {
    id: () => 'id-2',
    code: () => 'code-2',
  });
  const second = mergeCsv(
    [issued, ...first.entries],
    [{ email: 'ana@example.com', suggestedName: 'Ana Actualizada', role: 'conferencista', line: 2 }],
    2026,
    { id: () => 'no', code: () => 'no' },
  );
  const ana = second.entries.find((item) => item.email === 'ana@example.com');
  const nueva = second.entries.find((item) => item.email === 'nueva@example.com');
  assert.equal(second.added, 0);
  assert.equal(second.updated, 1);
  assert.equal(second.unchanged, 0);
  assert.equal(ana?.displayName, 'Ana Pérez');
  assert.equal(ana?.recognitionText, 'texto congelado');
  assert.equal(ana?.githubId, 10);
  assert.equal(ana?.role, 'conferencista');
  assert.equal(nueva?.publicCode, 'code-2');
});

test('solo quien está en la lista abierta puede expedir', () => {
  assert.equal(classifyClaim({ yearOpen: true, attendee: null, githubId: 1 }), 'missing');
  assert.equal(classifyClaim({ yearOpen: false, attendee: null, githubId: 1 }), 'closed');
  assert.equal(classifyClaim({ yearOpen: true, attendee: { githubId: null, revoked: false }, githubId: 1 }), 'ready');
  assert.equal(classifyClaim({ yearOpen: true, attendee: { githubId: 2, revoked: false }, githubId: 1 }), 'taken');
  assert.equal(classifyClaim({ yearOpen: true, attendee: { githubId: 1, revoked: true }, githubId: 1 }), 'revoked');
  assert.equal(certificateStep({ yearOpen: true, linked: true, revoked: false, issued: false, eligible: true }), 'issue');
  assert.equal(certificateStep({ yearOpen: false, linked: true, revoked: false, issued: true, eligible: true }), 'download');
  assert.equal(certificateStep({ yearOpen: false, linked: true, revoked: false, issued: false, eligible: true }), 'issue');
  assert.equal(certificateStep({ yearOpen: false, linked: false, revoked: false, issued: false, eligible: false }), 'closed');
  assert.equal(certificateStep({ yearOpen: true, linked: true, revoked: true, issued: true, eligible: true }), 'forbidden');
  assert.equal(certificateStep({ yearOpen: true, linked: true, revoked: false, issued: false, eligible: false }), 'pending');
});

test('el certificado sale con PAID o con el código de la charla', () => {
  assert.equal(registrationAllowed({ yearOpen: true, token: 'secreto', expected: 'secreto' }), true);
  assert.equal(registrationAllowed({ yearOpen: true, token: 'otro', expected: 'secreto' }), false);
  assert.equal(registrationAllowed({ yearOpen: false, token: 'secreto', expected: 'secreto' }), false);
  assert.equal(applyOnlineCode({ status: 'unpaid', code: 'no', expected: 'java' }), 'unpaid');
  assert.equal(applyOnlineCode({ status: 'unpaid', code: ' Java ', expected: 'java' }), 'online');
  assert.equal(applyOnlineCode({ status: 'paid', code: 'java', expected: 'java' }), 'paid');
  assert.equal(canDownload('unpaid'), false);
  assert.equal(canDownload('paid'), true);
  assert.equal(canDownload('online'), true);
  assert.equal(canDownload('unpaid', 'speaker'), true);
  assert.equal(canDownload('unpaid', 'organizer'), true);
  assert.equal(canDownload('unpaid', 'voluntario'), true);
  assert.equal(parseRole('SPEAKER'), 'conferencista');
  assert.equal(parseRole('ORGANIZER'), 'organizador');
  assert.equal(parseRole('VOLUNTARIO'), 'voluntario');
  assert.equal(normalizePhone('987654321'), '51987654321');
  assert.equal(normalizePhone(''), null);
});

test('la copia expedida no sigue un cambio posterior de la edición', () => {
  const source = {
    title: 'JConf Perú 2026',
    tagline: 'La conferencia para usuarios y desarrolladores Java.',
    date: new Date('2026-11-28T08:00:00-05:00'),
    venue: { name: 'Edificio SOHO Plus', city: 'Lima', country: 'Perú' },
  };
  const facts = editionFacts(source);
  assert.match(facts.dateLabel, /28/);
  assert.match(facts.dateLabel, /noviembre/);
  assert.match(facts.dateLabel, /2026/);
  const frozen = freezeCertificate({
    givenName: 'María',
    familyName: 'Quispe',
    role: 'conferencista',
    edition: facts,
  });
  source.title = 'Otra conferencia';
  facts.eventTitle = 'Otra conferencia';
  assert.equal(frozen.displayName, 'María Quispe');
  assert.equal(frozen.certificateTitle, 'Certificado de conferencista');
  assert.match(frozen.recognitionText, /JConf Perú 2026/);
  assert.match(recognitionParagraph(facts, 'voluntario'), /transmisiones en línea/);
  assert.match(recognitionParagraph(facts, 'voluntario'), /comida y bebidas/);
  assert.equal(frozen.recognitionText.includes('Otra conferencia'), false);
  assert.match(attendeeNotice('missing', 2026) ?? '', /JConf Perú 2026/);
});

test('el certificado de 2026 se abre a las 6:00 p. m. del 28 de noviembre', () => {
  const before = new Date('2026-11-28T17:59:00-05:00');
  const opening = new Date('2026-11-28T18:00:00-05:00');
  assert.equal(certificateReleased(2026, before), false);
  assert.equal(certificateReleased(2026, opening), true);
  assert.equal(certificateReleased(2025, before), true);
  assert.equal(certificateClaimOpen(2025, false, before), true);
  assert.equal(certificateClaimOpen(2026, false, before), false);
  assert.equal(certificateClaimOpen(2026, true, before), true);
  assert.equal(
    certificatePendingCopy(2026),
    'Tu certificado estará disponible al terminar el evento, el sábado 28 de noviembre a las 6:00 p. m. (hora de Lima). Podrás descargarlo o compartirlo en LinkedIn.',
  );
  assert.equal(
    linkedInShareUrl('https://jconfperu.com/v/abc'),
    'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fjconfperu.com%2Fv%2Fabc',
  );
  const draft = certificateShareDraft(2025, 'Certificado de organización', 'https://jconfperu.com/v/abc');
  assert.match(draft, /Organicé JConf Perú 2025/);
  assert.match(draft, /https:\/\/jconfperu.com\/v\/abc/);
  assert.match(linkedInComposerUrl(draft), /shareActive=true/);
  assert.match(certificateShareDraft(2025, 'Certificado de conferencista', 'https://jconfperu.com/v/abc'), /speaker/);
  assert.match(certificateShareDraft(2025, 'Certificado de voluntario', 'https://jconfperu.com/v/abc'), /voluntario/);
});

test('el excel separa todos, pagados e impagos', () => {
  const people: RosterExportPerson[] = [
    {
      displayName: null,
      suggestedName: 'Glisse Lisbeth Jorge Malca',
      givenName: 'Glisse Lisbeth',
      familyName: 'Jorge Malca',
      email: null,
      githubLogin: 'GlisseLisbeth',
      phone: '519777737772',
      role: 'participante',
      paymentStatus: 'paid',
      revokedAt: null,
    },
    {
      displayName: 'Ana Pérez',
      suggestedName: 'Ana',
      givenName: 'Ana',
      familyName: 'Pérez',
      email: 'ana@example.com',
      githubLogin: null,
      phone: null,
      role: 'voluntario',
      paymentStatus: 'unpaid',
      revokedAt: null,
    },
    {
      displayName: 'Beto',
      suggestedName: 'Beto',
      givenName: 'Beto',
      familyName: 'Quispe',
      email: 'beto@example.com',
      githubLogin: null,
      phone: null,
      role: 'participante',
      paymentStatus: 'paid',
      revokedAt: new Date('2026-11-01'),
    },
  ];
  assert.equal(rosterForExport(people, 'paid').length, 1);
  assert.equal(rosterForExport(people, 'unpaid').length, 1);
  assert.equal(rosterForExport(people, 'todos').length, 3);
  const book = rosterWorkbook(people, 'todos');
  const text = new TextDecoder().decode(book);
  assert.equal(book[0], 0x50);
  assert.equal(book[1], 0x4b);
  assert.match(text, /Glisse Lisbeth Jorge Malca/);
  assert.match(text, /GlisseLisbeth/);
  assert.match(text, /519777737772/);
  assert.match(text, /VOLUNTARIO/);
  assert.match(text, /Revocado/);
  assert.equal(new TextDecoder().decode(rosterWorkbook(people, 'unpaid')).includes('Glisse'), false);
});

test('la lista se parte de 50 en 50', () => {
  assert.deepEqual(rosterWindow(0, 1), { page: 1, pages: 1, start: 0, end: 0 });
  assert.deepEqual(rosterWindow(20, 3), { page: 1, pages: 1, start: 1, end: 20 });
  assert.deepEqual(rosterWindow(64, 1), { page: 1, pages: 2, start: 1, end: 50 });
  assert.deepEqual(rosterWindow(64, 2), { page: 2, pages: 2, start: 51, end: 64 });
  assert.deepEqual(rosterWindow(64, 9), { page: 2, pages: 2, start: 51, end: 64 });
  assert.deepEqual(rosterWindow(101, 3), { page: 3, pages: 3, start: 101, end: 101 });
});

test('el enlace de WhatsApp lleva el nombre, el correo y el usuario', () => {
  const message = correctionMessage({
    year: 2026,
    displayName: 'María Quispe',
    email: 'maria@example.com',
    githubLogin: 'mquispe',
    reason: 'missing',
  });
  assert.match(message, /María Quispe/);
  assert.match(message, /maria@example.com/);
  assert.match(message, /@mquispe/);
  assert.match(message, /actualizar el correo o el GitHub/);
  assert.equal(whatsAppLink('+51 999 888 777', message)?.startsWith('https://wa.me/51999888777?text='), true);
  assert.equal(whatsAppLink('sin numero', 'hola'), null);
  assert.equal(safeNext('https://evil.test'), '/mi/');
  assert.equal(publicBase(true, 'http://localhost:4321'), 'http://localhost:4321');
  assert.equal(publicBase(false, 'http://localhost:4321'), 'https://jconfperu.com');
  assert.equal(publicBase(false, 'https://jconfperu.vercel.app'), 'https://jconfperu.com');
  assert.equal(safeNext('/admin/certificados/'), '/admin/certificados/');
});

test('el correo verificado de GitHub se puede comparar con la lista', () => {
  assert.deepEqual(
    verifiedGithubEmails([
      { email: 'Ana@Example.com', verified: true },
      { email: 'ana@example.com', verified: true },
      { email: 'pendiente@example.com', verified: false },
      { email: '123+ana@users.noreply.github.com', verified: true },
    ]),
    ['ana@example.com'],
  );
});

test('el PDF sale de la copia congelada', async () => {
  const frozen = freezeCertificate({
    givenName: 'María',
    familyName: 'Quispe',
    role: 'participante',
    edition,
  });
  const pdf = await renderCertificatePdf({
    year: 2026,
    displayName: frozen.displayName,
    certificateTitle: frozen.certificateTitle,
    recognitionText: frozen.recognitionText,
    editionDateLabel: frozen.editionDateLabel,
    venueLine: frozen.venueLine,
    verificationUrl: 'https://jconfperu.com/v/abc',
  });
  assert.equal(Buffer.from(pdf.subarray(0, 5)).toString(), '%PDF-');
  assert.ok(pdf.byteLength > 1000);
});
