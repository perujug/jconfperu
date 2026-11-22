import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';
import { certificateKind, certificateRoleWord } from './roles';
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

function fitSize(text: string, font: PDFFont, maxSize: number, minSize: number, maxWidth: number): number {
  let size = maxSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
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
  const kind = certificateKind(input.certificateTitle);
  const roleWord = certificateRoleWord(kind);
  const speaker = kind === 'speaker';
  const band = speaker ? 214 : 0;

  page.drawRectangle({ x: 0, y: 0, width, height, color: paper });
  if (speaker) page.drawRectangle({ x: 0, y: 0, width: band, height, color: ink });
  else page.drawRectangle({ x: 0, y: 0, width, height: 32, color: ink });

  if (speaker) {
    const railWidth = band - 36;
    const dateLines = wrap(input.editionDateLabel, regular, 10, railWidth).slice(0, 3);
    drawLines(page, dateLines, regular, 10, 20, height - 48, 13, white);
    const roleSize = fitSize(roleWord, bold, 32, 18, railWidth);
    page.drawText(roleWord, { x: 20, y: height - 150, size: roleSize, font: bold, color: white });
    const venueLines = wrap(input.venueLine, regular, 9, railWidth).slice(0, 3);
    drawLines(page, venueLines, regular, 9, 20, height - 176, 12, white);
    const slogan = ['Aprende,', 'comparte,', 'conecta.'];
    slogan.forEach((line, index) => {
      page.drawText(line, { x: 20, y: 108 - index * 22, size: 16, font: bold, color: white });
    });
  } else {
    page.drawText('Aprende, comparte, conecta.', { x: 28, y: 12, size: 9, font: regular, color: white });
    const footer = `PERU JUG  /  JCONF PERÚ ${input.year}`;
    const footerWidth = bold.widthOfTextAtSize(footer, 9);
    page.drawText(footer, { x: width - footerWidth - 28, y: 12, size: 9, font: bold, color: white });
  }

  const x = band + 36;
  const textWidth = width - x - 36;
  page.drawText(`JCONF PERÚ ${input.year}`, { x, y: height - 52, size: 10, font: bold, color: muted });
  page.drawText('Certificado', { x, y: height - 102, size: 40, font: bold, color: ink });
  const roleSize = fitSize(roleWord, bold, 28, 16, textWidth);
  page.drawText(roleWord, { x, y: height - 138, size: roleSize, font: bold, color: red });
  page.drawText('Se otorga el presente certificado a', { x, y: height - 172, size: 11, font: regular, color: muted });

  const nameSize = fitSize(input.displayName, bold, 26, 14, textWidth);
  page.drawText(input.displayName, { x, y: height - 208, size: nameSize, font: bold, color: ink });
  page.drawRectangle({ x, y: height - 222, width: 132, height: 3, color: red });

  const body = wrap(input.recognitionText, regular, 11, textWidth);
  drawLines(page, body.slice(0, 5), regular, 11, x, height - 252, 16, ink);

  page.drawText(SIGNATORY.name, { x, y: 78, size: 16, font: bold, color: ink });
  page.drawText(SIGNATORY.role, { x, y: 62, size: 10, font: regular, color: muted });

  const qr = await pdf.embedPng(await QRCode.toBuffer(input.verificationUrl, { margin: 0, width: 180 }));
  const qrSize = 64;
  page.drawImage(qr, { x: width - qrSize - 36, y: 52, width: qrSize, height: qrSize });
  const host = 'jconfperu.com';
  const hostWidth = regular.widthOfTextAtSize(host, 8);
  page.drawText(host, {
    x: width - 36 - qrSize + (qrSize - hostWidth) / 2,
    y: 40,
    size: 8,
    font: regular,
    color: muted,
  });

  return pdf.save();
}
