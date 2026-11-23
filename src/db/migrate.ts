type Queryable = {
  unsafe: (query: string) => Promise<unknown>;
};

const statements = [
  `CREATE TABLE IF NOT EXISTS admins (
    github_id bigint PRIMARY KEY,
    label text NOT NULL,
    github_login text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS github_login text`,
  `CREATE TABLE IF NOT EXISTS certificate_years (
    year integer PRIMARY KEY,
    open boolean NOT NULL DEFAULT false,
    registration_token text,
    online_code text,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE certificate_years ADD COLUMN IF NOT EXISTS registration_token text`,
  `ALTER TABLE certificate_years ADD COLUMN IF NOT EXISTS online_code text`,
  `CREATE TABLE IF NOT EXISTS attendees (
    id text PRIMARY KEY,
    year integer NOT NULL,
    email text,
    phone text,
    payment_status text NOT NULL DEFAULT 'unpaid',
    role text NOT NULL,
    suggested_name text NOT NULL,
    given_name text,
    family_name text,
    github_id bigint,
    github_login text,
    public_code text NOT NULL,
    revoked_at timestamptz,
    issued_at timestamptz,
    display_name text,
    certificate_title text,
    recognition_text text,
    edition_date_label text,
    venue_line text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE attendees ADD COLUMN IF NOT EXISTS phone text`,
  `ALTER TABLE attendees ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'`,
  `ALTER TABLE attendees ALTER COLUMN email DROP NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS attendees_year_email ON attendees (year, email)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS attendees_public_code ON attendees (public_code)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS attendees_year_github ON attendees (year, github_id) WHERE github_id IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS atril_speakers (
    id text PRIMARY KEY,
    year integer NOT NULL,
    name text NOT NULL,
    role text,
    company text,
    bio text,
    photo_url text,
    linkedin text,
    website text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS atril_speakers_year ON atril_speakers (year)`,
  `CREATE TABLE IF NOT EXISTS atril_sessions (
    id text PRIMARY KEY,
    year integer NOT NULL,
    title text NOT NULL,
    summary text,
    track text,
    format text NOT NULL DEFAULT 'charla',
    room text,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'publicada',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS atril_sessions_year_status ON atril_sessions (year, status)`,
  `ALTER TABLE atril_sessions ADD COLUMN IF NOT EXISTS delivery text`,
  `ALTER TABLE atril_sessions ADD COLUMN IF NOT EXISTS live_url text`,
  `CREATE TABLE IF NOT EXISTS atril_session_speakers (
    session_id text NOT NULL REFERENCES atril_sessions (id) ON DELETE CASCADE,
    speaker_id text NOT NULL REFERENCES atril_speakers (id) ON DELETE CASCADE,
    position integer NOT NULL DEFAULT 0,
    PRIMARY KEY (session_id, speaker_id)
  )`,
];

export async function ensureSchema(sql: Queryable): Promise<void> {
  for (const statement of statements) await sql.unsafe(statement);
}
