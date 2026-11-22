export type ClaimOutcome = 'ready' | 'linked' | 'missing' | 'taken' | 'revoked' | 'closed';

export type CertificateStep = 'claim' | 'pending' | 'issue' | 'download' | 'closed' | 'forbidden';

export function classifyClaim(input: {
  yearOpen: boolean;
  attendee: { githubId: number | null; revoked: boolean } | null;
  githubId: number;
}): ClaimOutcome {
  if (!input.yearOpen) return 'closed';
  if (!input.attendee) return 'missing';
  if (input.attendee.revoked) return 'revoked';
  if (input.attendee.githubId == null) return 'ready';
  if (input.attendee.githubId === input.githubId) return 'linked';
  return 'taken';
}

export function certificateStep(input: {
  yearOpen: boolean;
  linked: boolean;
  revoked: boolean;
  issued: boolean;
  eligible: boolean;
}): CertificateStep {
  if (!input.linked) return input.yearOpen ? 'claim' : 'closed';
  if (input.revoked) return 'forbidden';
  if (!input.eligible) return 'pending';
  if (input.issued) return 'download';
  return 'issue';
}
