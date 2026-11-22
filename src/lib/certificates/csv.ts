import { normalizeEmail } from './names';
import { parseRole, type Role } from './roles';

export type CsvRow = {
  email: string;
  suggestedName: string;
  role: Role;
  line: number;
};

export type CsvIssue = {
  line: number;
  message: string;
};

export type RosterEntry = {
  id: string;
  year: number;
  email: string;
  role: Role;
  suggestedName: string;
  githubId: number | null;
  givenName: string | null;
  familyName: string | null;
  publicCode: string;
  revoked: boolean;
  issued: boolean;
  displayName: string | null;
  certificateTitle: string | null;
  recognitionText: string | null;
  editionDateLabel: string | null;
  venueLine: string | null;
};

function delimiterOf(header: string): ',' | ';' {
  const commas = header.split(',').length;
  const semicolons = header.split(';').length;
  return semicolons > commas ? ';' : ',';
}

function splitLine(line: string, delimiter: ',' | ';'): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char ?? '';
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char ?? '';
    }
  }

  cells.push(current.trim());
  return cells;
}

function columnIndex(headers: string[], names: string[]): number {
  return headers.findIndex((header) => names.includes(header));
}

export function parseCertificateCsv(text: string): { rows: CsvRow[]; errors: CsvIssue[] } {
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = source.split('\n');
  const first = lines.findIndex((line) => line.trim().length > 0);
  if (first === -1) return { rows: [], errors: [{ line: 1, message: 'El archivo está vacío.' }] };

  const headerLine = lines[first] ?? '';
  const delimiter = delimiterOf(headerLine);
  const headers = splitLine(headerLine, delimiter).map((header) => header.toLowerCase());
  const emailIndex = columnIndex(headers, ['email', 'correo', 'e-mail']);
  const nameIndex = columnIndex(headers, ['nombre', 'name']);
  const roleIndex = columnIndex(headers, ['rol', 'role']);

  if (emailIndex === -1 || nameIndex === -1) {
    const missing = [emailIndex === -1 ? 'email o correo' : '', nameIndex === -1 ? 'nombre o name' : ''].filter(Boolean);
    return {
      rows: [],
      errors: [
        {
          line: first + 1,
          message: `La cabecera debe incluir ${missing.join(' y ')}. El correo de pago identifica a cada persona: volver a cargar el archivo actualiza esa fila y no crea otra.`,
        },
      ],
    };
  }

  const rows: CsvRow[] = [];
  const errors: CsvIssue[] = [];
  const seen = new Map<string, number>();

  for (let index = first + 1; index < lines.length; index += 1) {
    const raw = lines[index] ?? '';
    if (!raw.trim()) continue;
    const cells = splitLine(raw, delimiter);
    const line = index + 1;
    const email = normalizeEmail(cells[emailIndex] ?? '');
    const suggestedName = (cells[nameIndex] ?? '').replace(/\s+/g, ' ').trim();
    const role = parseRole(roleIndex === -1 ? '' : cells[roleIndex]);

    if (!email) {
      errors.push({ line, message: 'Correo inválido.' });
      continue;
    }
    if (!suggestedName) {
      errors.push({ line, message: `Falta el nombre de ${email}.` });
      continue;
    }
    if (!role) {
      errors.push({ line, message: `Rol inválido para ${email}.` });
      continue;
    }

    const previous = seen.get(email);
    if (previous != null) {
      errors.push({ line, message: `Correo repetido. Se usa la última fila de ${email}.` });
      const prior = rows.findIndex((row) => row.email === email);
      if (prior !== -1) rows.splice(prior, 1);
    }
    seen.set(email, line);
    rows.push({ email, suggestedName, role, line });
  }

  return { rows, errors };
}

export function mergeCsv(
  existing: RosterEntry[],
  rows: CsvRow[],
  year: number,
  ids: { id: () => string; code: () => string },
): { entries: RosterEntry[]; added: number; updated: number; unchanged: number } {
  const byEmail = new Map(existing.map((entry) => [entry.email, entry]));
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const current = byEmail.get(row.email);
    if (!current) {
      added += 1;
      byEmail.set(row.email, {
        id: ids.id(),
        year,
        email: row.email,
        role: row.role,
        suggestedName: row.suggestedName,
        githubId: null,
        givenName: null,
        familyName: null,
        publicCode: ids.code(),
        revoked: false,
        issued: false,
        displayName: null,
        certificateTitle: null,
        recognitionText: null,
        editionDateLabel: null,
        venueLine: null,
      });
      continue;
    }

    if (current.suggestedName === row.suggestedName && current.role === row.role) {
      unchanged += 1;
      continue;
    }
    updated += 1;
    byEmail.set(row.email, {
      ...current,
      suggestedName: row.suggestedName,
      role: row.role,
    });
  }

  return { entries: [...byEmail.values()], added, updated, unchanged };
}
