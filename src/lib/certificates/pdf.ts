import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';
import { SIGNATORY } from './snapshot';

const ink = rgb(11 / 255, 15 / 255, 40 / 255);
const red = rgb(221 / 255, 10 / 255, 55 / 255);
const muted = rgb(92 / 255, 97 / 255, 120 / 255);
const paper = rgb(1, 1, 1);
const white = rgb(1, 1, 1);

async function loadFont(name: string): Promise<Uint8Array> {
  const candidates = [
    join(process.cwd(), 'src/lib/certificates/fonts', name),
    new URL(`./fonts/${name}`, import.meta.url),
  ];
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return new Uint8Array(await readFile(candidate));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`No está la fuente ${name}`);
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

  const band = 188;
  page.drawRectangle({ x: 0, y: 0, width, height, color: paper });
  page.drawRectangle({ x: 0, y: 0, width: band, height, color: ink });
  page.drawRectangle({ x: band, y: 0, width: 7, height, color: red });

  for (const [x, y, size] of [
    [36, 520, 1.3],
    [110, 470, 1.1],
    [58, 250, 1.4],
    [140, 180, 1],
    [42, 90, 1.2],
  ] as const) {
    page.drawCircle({ x, y, size, color: white });
  }

  page.drawText('JCONF', { x: 28, y: height - 64, size: 16, font: bold, color: white });
  page.drawText('PERÚ', { x: 28, y: height - 84, size: 12, font: bold, color: red });

  const yearText = String(input.year);
  const yearSize = 52;
  const yearWidth = bold.widthOfTextAtSize(yearText, yearSize);
  page.drawText(yearText, { x: (band - yearWidth) / 2, y: 270, size: yearSize, font: bold, color: white });
  const lima = 'LIMA';
  const limaWidth = bold.widthOfTextAtSize(lima, 11);
  page.drawText(lima, { x: (band - limaWidth) / 2, y: 250, size: 11, font: bold, color: white });

  const place = wrap(`${input.editionDateLabel}\n${input.venueLine}`.replace('\n', ' '), regular, 9, band - 36);
  drawLines(page, place.slice(0, 5), regular, 9, 22, 78, 12, white);

  const x = band + 36;
  const textWidth = width - x - 36;
  page.drawText('PERU JUG', { x, y: height - 78, size: 11, font: bold, color: red });
  page.drawText(input.certificateTitle, { x, y: height - 112, size: 22, font: bold, color: ink });
  page.drawText('Se otorga a', { x, y: height - 150, size: 12, font: regular, color: muted });

  let nameSize = 26;
  while (nameSize > 14 && bold.widthOfTextAtSize(input.displayName, nameSize) > textWidth) nameSize -= 1;
  page.drawText(input.displayName, { x, y: height - 186, size: nameSize, font: bold, color: ink });
  page.drawRectangle({ x, y: height - 202, width: 132, height: 3, color: red });

  const body = wrap(input.recognitionText, regular, 12, textWidth);
  drawLines(page, body.slice(0, 6), regular, 12, x, height - 236, 18, ink);

  page.drawText(SIGNATORY.name, { x, y: 92, size: 16, font: bold, color: ink });
  page.drawText(SIGNATORY.role, { x, y: 74, size: 10, font: regular, color: muted });

  const qr = await pdf.embedPng(await QRCode.toBuffer(input.verificationUrl, { margin: 0, width: 180 }));
  const qrSize = 72;
  page.drawImage(qr, { x: width - qrSize - 36, y: 58, width: qrSize, height: qrSize });
  const host = 'jconfperu.com';
  const hostWidth = regular.widthOfTextAtSize(host, 8);
  page.drawText(host, {
    x: width - 36 - qrSize + (qrSize - hostWidth) / 2,
    y: 44,
    size: 8,
    font: regular,
    color: muted,
  });

  return pdf.save();
}
