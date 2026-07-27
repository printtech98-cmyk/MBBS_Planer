/*
# Add user-scoped tables and migrate notes to per-user RLS

This migration converts the app from a single-tenant (no-auth, localStorage) model
to a multi-user (sign-in required) model with per-user data isolation.

1. New Tables
- `subjects` (id, user_id default auth.uid(), name, exam_date, created_at)
- `topics` (id, user_id default auth.uid(), subject_id FK cascade, name, status, completed_at, created_at)
- `study_plan_entries` (id, user_id default auth.uid(), topic_id FK cascade, planned_date, done)
- `revision_reminders` (id, user_id default auth.uid(), topic_id FK cascade, due_date, completed)

2. Modified Tables
- `notes` — add `user_id uuid NOT NULL DEFAULT auth.uid()` + FK to auth.users. RLS switched
  from anon/public to authenticated owner-scoped.

3. Security
- RLS enabled on every table. Each gets 4 owner-scoped policies (SELECT/INSERT/UPDATE/DELETE)
  scoped to `TO authenticated` with `auth.uid() = user_id`. No USING(true) shortcuts.
- user_id defaults to auth.uid() so client inserts omitting user_id satisfy WITH CHECK.
- Cascading FKs handle subject->topic->plan/reminders deletion automatically.

4. Notes
- The previous notes migration created the table with anon/public policies; we drop those
  and replace with authenticated owner policies.
*/

-- ---------- subjects ----------
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  exam_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subjects" ON subjects;
CREATE POLICY "select_own_subjects" ON subjects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_subjects" ON subjects;
CREATE POLICY "insert_own_subjects" ON subjects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_subjects" ON subjects;
CREATE POLICY "update_own_subjects" ON subjects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_subjects" ON subjects;
CREATE POLICY "delete_own_subjects" ON subjects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- topics ----------
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_topics" ON topics;
CREATE POLICY "select_own_topics" ON topics FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_topics" ON topics;
CREATE POLICY "insert_own_topics" ON topics FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_topics" ON topics;
CREATE POLICY "update_own_topics" ON topics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_topics" ON topics;
CREATE POLICY "delete_own_topics" ON topics FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- study_plan_entries ----------
CREATE TABLE IF NOT EXISTS study_plan_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  planned_date date NOT NULL,
  done boolean NOT NULL DEFAULT false
);

ALTER TABLE study_plan_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_plan" ON study_plan_entries;
CREATE POLICY "select_own_plan" ON study_plan_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_plan" ON study_plan_entries;
CREATE POLICY "insert_own_plan" ON study_plan_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_plan" ON study_plan_entries;
CREATE POLICY "update_own_plan" ON study_plan_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_plan" ON study_plan_entries;
CREATE POLICY "delete_own_plan" ON study_plan_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- revision_reminders ----------
CREATE TABLE IF NOT EXISTS revision_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false
);

ALTER TABLE revision_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reminders" ON revision_reminders;
CREATE POLICY "select_own_reminders" ON revision_reminders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_reminders" ON revision_reminders;
CREATE POLICY "insert_own_reminders" ON revision_reminders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_reminders" ON revision_reminders;
CREATE POLICY "update_own_reminders" ON revision_reminders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_reminders" ON revision_reminders;
CREATE POLICY "delete_own_reminders" ON revision_reminders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- notes: add user_id and switch to authenticated owner RLS ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'user_id') THEN
    ALTER TABLE notes ADD COLUMN user_id uuid;
    UPDATE notes SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
    ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE notes ALTER COLUMN user_id SET DEFAULT auth.uid();
    ALTER TABLE notes ADD CONSTRAINT notes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Replace anon/public policies with authenticated owner policies
DROP POLICY IF EXISTS "anon_select_notes" ON notes;
DROP POLICY IF EXISTS "anon_insert_notes" ON notes;
DROP POLICY IF EXISTS "anon_update_notes" ON notes;
DROP POLICY IF EXISTS "anon_delete_notes" ON notes;

DROP POLICY IF EXISTS "select_own_notes" ON notes;
CREATE POLICY "select_own_notes" ON notes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notes" ON notes;
CREATE POLICY "insert_own_notes" ON notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notes" ON notes;
CREATE POLICY "update_own_notes" ON notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notes" ON notes;
CREATE POLICY "delete_own_notes" ON notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS subjects_user_idx ON subjects (user_id);
CREATE INDEX IF NOT EXISTS topics_subject_idx ON topics (subject_id);
CREATE INDEX IF NOT EXISTS topics_user_idx ON topics (user_id);
CREATE INDEX IF NOT EXISTS study_plan_entries_topic_idx ON study_plan_entries (topic_id);
CREATE INDEX IF NOT EXISTS study_plan_entries_user_idx ON study_plan_entries (user_id);
CREATE INDEX IF NOT EXISTS revision_reminders_topic_idx ON revision_reminders (topic_id);
CREATE INDEX IF NOT EXISTS revision_reminders_user_idx ON revision_reminders (user_id);
CREATE INDEX IF NOT EXISTS notes_user_idx ON notes (user_id);
CREATE INDEX IF NOT EXISTS notes_subject_idx ON notes (subject_id);
