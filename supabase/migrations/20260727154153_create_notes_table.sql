/*
# Create notes table (single-tenant, no auth)

1. New Tables
- `notes`
  - `id` (uuid, primary key)
  - `title` (text, not null) — the note's title
  - `content` (text, not null, default '') — the note's body text
  - `subject_id` (uuid, nullable) — optional link to a subject (no FK because subjects live in the browser's localStorage, not in the database)
  - `subject_name` (text, nullable) — denormalized subject name for display/filtering, since subjects aren't stored in Postgres
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `notes`.
- This is a single-tenant app with no sign-in screen, so the anon-key client must be able to read and write. Allow anon + authenticated full CRUD because the data is intentionally shared/public within this single-tenant app.
- `USING (true)` / `WITH CHECK (true)` is acceptable here because there is no per-user ownership concept in this app.

3. Notes
- Subjects and topics are stored in the browser (localStorage), not in Postgres, so we cannot add a foreign key. We store `subject_id` + `subject_name` as plain denormalized values so notes remain filterable by subject even though the subject rows themselves live client-side.
- `updated_at` is maintained by the application on edits.
*/

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  subject_id uuid,
  subject_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notes" ON notes;
CREATE POLICY "anon_select_notes" ON notes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_notes" ON notes;
CREATE POLICY "anon_insert_notes" ON notes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_notes" ON notes;
CREATE POLICY "anon_update_notes" ON notes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_notes" ON notes;
CREATE POLICY "anon_delete_notes" ON notes FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS notes_subject_id_idx ON notes (subject_id);
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON notes (created_at DESC);
