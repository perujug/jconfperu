import type { APIRoute } from 'astro';
import { readSession } from '@lib/auth/session';
import { renderCertificatePdf } from '@lib/certificates/pdf';
import { canDownload, paymentStatus } from '@lib/certificates/registration';
import { certificateReleased } from '@lib/certificates/release';
import { findAttendeeByGithub } from '@lib/certificates/store';
import { publicUrl } from '@lib/site';

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies, url }) => {
  const year = Number(params.year);
  const session = await readSession(cookies);
  if (!session || !Number.isInteger(year) || !certificateReleased(year)) return new Response(null, { status: 404 });

  try {
    const row = await findAttendeeByGithub(year, session.githubId);
    if (
      !row?.issuedAt ||
      row.revokedAt ||
      !canDownload(paymentStatus(row.paymentStatus)) ||
      !row.displayName ||
      !row.certificateTitle ||
      !row.recognitionText ||
      !row.editionDateLabel ||
      !row.venueLine
    ) {
      return new Response(null, { status: 404 });
    }
    const pdf = await renderCertificatePdf({
      year,
      displayName: row.displayName,
      certificateTitle: row.certificateTitle,
      recognitionText: row.recognitionText,
      editionDateLabel: row.editionDateLabel,
      venueLine: row.venueLine,
      verificationUrl: publicUrl(`/v/${row.publicCode}`, url.origin),
    });
    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="jconf-peru-${year}-certificado.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
