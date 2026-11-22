export type ClaimDraft = {
  year: number;
  email: string;
  givenName: string;
  familyName: string;
};

export function encodeDraft(draft: ClaimDraft): string {
  return encodeURIComponent(JSON.stringify(draft));
}

export function decodeDraft(value: string | undefined, year: number): ClaimDraft | null {
  if (!value) return null;
  try {
    const draft = JSON.parse(decodeURIComponent(value)) as Partial<ClaimDraft>;
    if (draft.year !== year || typeof draft.email !== 'string') return null;
    return {
      year,
      email: draft.email,
      givenName: typeof draft.givenName === 'string' ? draft.givenName : '',
      familyName: typeof draft.familyName === 'string' ? draft.familyName : '',
    };
  } catch {
    return null;
  }
}
