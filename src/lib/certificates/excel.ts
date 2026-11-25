import { paymentStatus } from './registration';
import { parseRole } from './roles';

export type RosterExportScope = 'todos' | 'paid' | 'unpaid';

export type RosterExportPerson = {
  displayName: string | null;
  suggestedName: string;
  givenName: string | null;
  familyName: string | null;
  email: string | null;
  githubLogin: string | null;
  phone: string | null;
  role: string;
  paymentStatus: string;
  revokedAt: Date | null;
};

const HEADERS = ['Nombre', 'Nombres', 'Apellidos', 'Correo', 'GitHub', 'Celular', 'Rol', 'Estado'] as const;

function personName(person: RosterExportPerson): string {
  return (person.displayName || person.suggestedName || '').replace(/\s+/g, ' ').trim();
}

function roleLabel(role: string): string {
  const parsed = parseRole(role) ?? 'participante';
  if (parsed === 'conferencista') return 'SPEAKER';
  if (parsed === 'organizador') return 'ORGANIZER';
  if (parsed === 'voluntario') return 'VOLUNTARIO';
  return 'PARTICIPANTE';
}

function statusLabel(person: RosterExportPerson): string {
  if (person.revokedAt) return 'Revocado';
  const status = paymentStatus(person.paymentStatus);
  if (status === 'paid') return 'PAID';
  if (status === 'online') return 'ONLINE';
  return 'UNPAID';
}

export function rosterForExport(people: RosterExportPerson[], scope: RosterExportScope): RosterExportPerson[] {
  return people
    .filter((person) => {
      if (scope === 'todos') return true;
      if (person.revokedAt) return false;
      return paymentStatus(person.paymentStatus) === scope;
    })
    .sort((left, right) => personName(left).localeCompare(personName(right), 'es'));
}

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function columnName(index: number): string {
  let name = '';
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function sheetRow(values: string[], row: number, header = false): string {
  const cells = values
    .map((value, index) => {
      const style = header ? ' s="1"' : '';
      return `<c r="${columnName(index)}${row}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    })
    .join('');
  return `<row r="${row}">${cells}</row>`;
}

function workbookXml(people: RosterExportPerson[], scope: RosterExportScope): string {
  const rows = rosterForExport(people, scope).map((person) => [
    personName(person),
    person.givenName?.trim() ?? '',
    person.familyName?.trim() ?? '',
    person.email?.trim() ?? '',
    person.githubLogin?.trim() ?? '',
    person.phone?.trim() ?? '',
    roleLabel(person.role),
    statusLabel(person),
  ]);
  const sheet = [
    sheetRow([...HEADERS], 1, true),
    ...rows.map((values, index) => sheetRow(values, index + 2)),
  ].join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${sheet}</sheetData>
</worksheet>`;
}

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, file.data.length, true);
    view.setUint32(22, file.data.length, true);
    view.setUint16(26, name.length, true);
    local.set(name, 30);
    parts.push(local, file.data);
    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, file.data.length, true);
    centralView.setUint32(24, file.data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length + file.data.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  for (const part of [...parts, ...centrals, end]) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

function entry(name: string, text: string): { name: string; data: Uint8Array } {
  return { name, data: new TextEncoder().encode(text) };
}

/** Libro .xlsx. El celular va como texto para que Excel no lo recorte. */
export function rosterWorkbook(people: RosterExportPerson[], scope: RosterExportScope): Uint8Array {
  return zipStore([
    entry(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    ),
    entry(
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    ),
    entry(
      'xl/workbook.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Lista" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    ),
    entry(
      'xl/_rels/workbook.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    ),
    entry(
      'xl/styles.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="1"><fill><patternFill patternType="none"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="2"><xf fontId="0" applyFont="1"/><xf fontId="1" applyFont="1"/></cellXfs>
</styleSheet>`,
    ),
    entry('xl/worksheets/sheet1.xml', workbookXml(people, scope)),
  ]);
}
