import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';
import { certificateKind, certificateRoleWord } from './roles';
import { SIGNATORY } from './snapshot';

const ink = rgb(23 / 255, 23 / 255, 25 / 255);
const red = rgb(226 / 255, 6 / 255, 19 / 255);
const purple = rgb(109 / 255, 23 / 255, 111 / 255);
const muted = rgb(85 / 255, 81 / 255, 90 / 255);
const paper = rgb(1, 1, 1);
const white = rgb(1, 1, 1);
const hairline = rgb(217 / 255, 213 / 255, 219 / 255);

async function loadBytes(candidates: Array<string | URL>, label: string): Promise<Uint8Array> {
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return new Uint8Array(await readFile(candidate));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`No está ${label}`);
}

function loadFont(name: string): Promise<Uint8Array> {
  return loadBytes(
    [join(process.cwd(), 'src/lib/certificates/fonts', name), new URL(`./fonts/${name}`, import.meta.url)],
    `la fuente ${name}`,
  );
}

function loadDuke(): Promise<Uint8Array> {
  return loadBytes(
    [
      join(process.cwd(), 'src/assets/images/perujug/logo-2024.png'),
      new URL('../../assets/images/perujug/logo-2024.png', import.meta.url),
    ],
    'el logo de Peru JUG',
  );
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawLines(page: PDFPage, lines: string[], font: PDFFont, size: number, x: number, y: number, leading: number, color: ReturnType<typeof rgb>) {
  lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * leading, size, font, color });
  });
}

function fitSize(text: string, font: PDFFont, maxSize: number, minSize: number, maxWidth: number): number {
  let size = maxSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
}

function drawRight(page: PDFPage, text: string, font: PDFFont, size: number, right: number, y: number, color: ReturnType<typeof rgb>) {
  page.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y, size, font, color });
}

function shortDate(label: string): string {
  const match = label.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)/i);
  if (!match) return label;
  return `${match[1]} ${match[2].toUpperCase()}`;
}

function drawMark(page: PDFPage, x: number, peakY: number, color: ReturnType<typeof rgb>, scale = 1) {
  page.drawSvgPath('M 8 0 L 0 14 L 16 14 Z', { x, y: peakY, scale, color });
  page.drawCircle({ x: x + 8 * scale, y: peakY - 8 * scale, size: 3 * scale, color: red });
}

export async function renderCertificatePdf(input: {
  year: number;
  displayName: string;
  certificateTitle: string;
  recognitionText: string;
  editionDateLabel: string;
  venueLine: string;
  verificationUrl: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${input.certificateTitle} · ${input.displayName}`);
  pdf.setAuthor('Peru JUG');
  pdf.setCreator('JConf Perú');

  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  const regular = await pdf.embedFont(await loadFont('Poppins-Regular.ttf'), { subset: true });
  const bold = await pdf.embedFont(await loadFont('Poppins-Bold.ttf'), { subset: true });
  const duke = await pdf.embedPng(await loadDuke());
  const kind = certificateKind(input.certificateTitle);
  const roleWord = certificateRoleWord(kind);
  const rail = kind === 'speaker' || kind === 'organizador' || kind === 'voluntario';
  const band = rail ? 232.44 : 0;

  page.drawRectangle({ x: 0, y: 0, width, height, color: paper });
  if (rail) page.drawRectangle({ x: 0, y: 0, width: band, height, color: ink });
  else page.drawRectangle({ x: 0, y: 0, width, height: 32, color: ink });

  const dukeSize = rail ? 118 : 112;
  const dukeX = rail ? (band - dukeSize) / 2 : width - dukeSize - 36;
  const dukeY = rail ? 78 : 128;
  page.drawImage(duke, { x: dukeX, y: dukeY, width: dukeSize, height: dukeSize });

  if (rail) {
    drawMark(page, 24, 40, white, 0.9);
    page.drawText('PERU JUG', { x: 44, y: 26, size: 11, font: bold, color: white });
    page.drawText('JAVA USER GROUP PERU', { x: 44, y: 16, size: 4.5, font: regular, color: white });
  }

  const x = rail ? 286.3 : 62;
  const textWidth = rail ? width - x - 36 : dukeX - x - 18;

  if (rail) {
    const roleSize = fitSize(roleWord, bold, 26, 15, band - 62);
    page.drawText(roleWord, { x: 45.35, y: height - 82.2, size: roleSize, font: bold, color: white });
    page.drawLine({ start: { x: 45.35, y: 487.56 }, end: { x: 181.42, y: 487.56 }, thickness: 0.6, color: rgb(101 / 255, 96 / 255, 104 / 255) });
    ['Aprende,', 'comparte,', 'conecta.'].forEach((line, index) => {
      page.drawText(line, { x: 45.35, y: height - 167.24 - index * 28.35, size: 18, font: bold, color: white });
    });
    drawRight(page, shortDate(input.editionDateLabel), bold, 11, width - 36, height - 70.9, ink);
    drawRight(page, `${input.year} · LIMA, PERÚ`, regular, 10, width - 36, height - 88, muted);
  } else {
    page.drawText('Aprende, comparte, conecta.', { x: 28, y: 12, size: 9, font: regular, color: white });
    const footer = `PERU JUG  /  JCONF PERÚ ${input.year}`;
    drawRight(page, footer, bold, 9, width - 28, 12, white);
  }

  const lockupY = height - (rail ? 132 : 78);
  page.drawText('JC', { x, y: lockupY, size: 22, font: bold, color: ink });
  const jcWidth = bold.widthOfTextAtSize('JC', 22);
  drawMark(page, x + jcWidth + 2, lockupY + 16, ink, 1.05);
  page.drawText('NF', { x: x + jcWidth + 24, y: lockupY, size: 22, font: bold, color: ink });
  page.drawText(`PERU ${input.year}`, { x, y: lockupY - 16, size: 9, font: bold, color: ink });
  page.drawLine({
    start: { x, y: lockupY - 28 },
    end: { x: width - 36, y: lockupY - 28 },
    thickness: 0.6,
    color: hairline,
  });

  page.drawText('Certificado', { x, y: height - (rail ? 201.26 : 156), size: rail ? 31 : 34, font: bold, color: ink });
  const roleSize = fitSize(roleWord, bold, rail ? 20 : 26, 14, textWidth);
  page.drawText(roleWord, { x, y: height - (rail ? 236 : 196), size: roleSize, font: bold, color: rail ? purple : red });
  page.drawText('Se otorga el presente certificado a', { x, y: height - (rail ? 286.3 : 226), size: rail ? 10 : 11, font: regular, color: muted });

  const nameSize = fitSize(input.displayName, bold, rail ? 25 : 24, 14, textWidth);
  const nameY = height - (rail ? 334.5 : 258);
  page.drawText(input.displayName, { x, y: nameY, size: nameSize, font: bold, color: ink });
  page.drawLine({
    start: { x, y: rail ? 238.1 : nameY - 14 },
    end: { x: x + 108, y: rail ? 238.1 : nameY - 14 },
    thickness: 2,
    color: red,
  });

  const body = wrap(input.recognitionText, regular, rail ? 10 : 11, textWidth);
  drawLines(page, body.slice(0, 4), regular, rail ? 10 : 11, x, height - (rail ? 391 : 300), rail ? 14 : 15, muted);

  page.drawText(SIGNATORY.name, { x, y: rail ? 79 : 78, size: 14, font: bold, color: ink });
  page.drawText(SIGNATORY.role, { x, y: rail ? 64 : 62, size: 9, font: regular, color: muted });

  if (rail) {
    page.drawLine({ start: { x, y: 42.5 }, end: { x: width - 36, y: 42.5 }, thickness: 0.6, color: hairline });
    drawRight(page, `JCONF PERÚ ${input.year}`, bold, 8, width - 36, 26, ink);
  }

  const qr = await pdf.embedPng(await QRCode.toBuffer(input.verificationUrl, { margin: 0, width: 180 }));
  const qrSize = 58;
  const qrX = width - qrSize - 36;
  const qrY = rail ? 56 : 52;
  page.drawImage(qr, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  if (!rail) drawRight(page, 'jconfperu.com', regular, 8, qrX + qrSize, qrY - 12, muted);

  return pdf.save();
}
