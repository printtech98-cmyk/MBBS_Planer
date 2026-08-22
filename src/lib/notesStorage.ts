export interface LocalNote {
  id: string;
  title: string;
  content: string;
  subject_id: string | null;
  subject_name: string | null;
  topic_id: string | null;
  topic_name: string | null;
  created_at: string;
}

const KEY = 'notes';

function read(): LocalNote[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalNote[]) : [];
  } catch {
    return [];
  }
}

function write(notes: LocalNote[]): void {
  localStorage.setItem(KEY, JSON.stringify(notes));
}

export function getNotes(): LocalNote[] {
  return read().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function saveNote(input: {
  title: string;
  content: string;
  subject_id: string | null;
  subject_name: string | null;
  topic_id: string | null;
  topic_name: string | null;
}): LocalNote {
  const note: LocalNote = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    content: input.content,
    subject_id: input.subject_id,
    subject_name: input.subject_name,
    topic_id: input.topic_id,
    topic_name: input.topic_name,
    created_at: new Date().toISOString(),
  };
  const notes = read();
  notes.push(note);
  write(notes);
  return note;
}

export function updateNote(
  id: string,
  patch: {
    title: string;
    content: string;
    subject_id: string | null;
    subject_name: string | null;
    topic_id: string | null;
    topic_name: string | null;
  },
): LocalNote | null {
  const notes = read();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  notes[idx] = {
    ...notes[idx],
    title: patch.title.trim(),
    content: patch.content,
    subject_id: patch.subject_id,
    subject_name: patch.subject_name,
    topic_id: patch.topic_id,
    topic_name: patch.topic_name,
  };
  write(notes);
  return notes[idx];
}

export function deleteNote(id: string): void {
  write(read().filter((n) => n.id !== id));
}
