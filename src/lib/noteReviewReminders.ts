import { addDays, todayISO } from '@/lib/dates';

export interface NoteReviewReminder {
  id: string;
  noteId: string;
  dueDate: string;
  completed: boolean;
  stage: number;
}

const KEY = 'note_review_reminders';
const REVIEW_OFFSETS = [1, 3, 7, 16, 35];

function read(): NoteReviewReminder[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is NoteReviewReminder => {
      if (!item || typeof item !== 'object') return false;
      const reminder = item as Partial<NoteReviewReminder>;
      return (
        typeof reminder.id === 'string' &&
        typeof reminder.noteId === 'string' &&
        typeof reminder.dueDate === 'string' &&
        typeof reminder.completed === 'boolean' &&
        typeof reminder.stage === 'number'
      );
    });
  } catch {
    return [];
  }
}

function write(reminders: NoteReviewReminder[]): void {
  localStorage.setItem(KEY, JSON.stringify(reminders));
}

export function scheduleNoteReviewReminders(noteId: string, actionDate: string = todayISO()): NoteReviewReminder[] {
  const reminders = read().filter((reminder) => reminder.noteId !== noteId);
  const scheduled = REVIEW_OFFSETS.map((offset, index) => ({
    id: crypto.randomUUID(),
    noteId,
    dueDate: addDays(actionDate, offset),
    completed: false,
    stage: index,
  }));
  write([...reminders, ...scheduled]);
  return scheduled;
}

export function getNoteReviewReminders(): NoteReviewReminder[] {
  return read().sort((a, b) => (a.dueDate === b.dueDate ? a.stage - b.stage : a.dueDate < b.dueDate ? -1 : 1));
}

export function getDueNoteReviewReminders(date: string = todayISO()): NoteReviewReminder[] {
  return getNoteReviewReminders().filter((reminder) => !reminder.completed && reminder.dueDate <= date);
}

export function completeNoteReview(reminderId: string): NoteReviewReminder | null {
  const reminders = read();
  const index = reminders.findIndex((reminder) => reminder.id === reminderId && !reminder.completed);
  if (index === -1) return null;
  reminders[index] = { ...reminders[index], completed: true };
  write(reminders);
  return reminders[index];
}

export function completeNextNoteReview(noteId: string): NoteReviewReminder | null {
  const due = getDueNoteReviewReminders().filter((reminder) => reminder.noteId === noteId);
  const reminder = due[0];
  return reminder ? completeNoteReview(reminder.id) : null;
}

export function deleteNoteReviewReminders(noteId: string): void {
  write(read().filter((reminder) => reminder.noteId !== noteId));
}

export function getNextNoteReview(noteId: string): NoteReviewReminder | null {
  return getNoteReviewReminders().find((reminder) => reminder.noteId === noteId && !reminder.completed) ?? null;
}

export function estimateNoteReviewMinutes(content: string): number {
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(wordCount / 200));
}

export function getReviewOffsets(): number[] {
  return [...REVIEW_OFFSETS];
}
