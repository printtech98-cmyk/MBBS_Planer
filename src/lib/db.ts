import { supabase } from '@/lib/supabase';
import type { Subject, Topic, StudyPlanEntry, RevisionReminder, Note, NoteWithSubject } from '@/lib/types';

function nowISO(): string {
  return new Date().toISOString();
}

function errMsg(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

// ---------- Subjects ----------

export async function getSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(errMsg(error, 'Failed to load subjects.'));
  return (data as Subject[]) ?? [];
}

export async function saveSubject(input: { name: string; exam_date: string | null }): Promise<Subject> {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ name: input.name, exam_date: input.exam_date })
    .select()
    .single();
  if (error) throw new Error(errMsg(error, 'Failed to save subject.'));
  return data as Subject;
}

export async function updateSubject(id: string, patch: Partial<Pick<Subject, 'name' | 'exam_date'>>): Promise<void> {
  const { error } = await supabase.from('subjects').update(patch).eq('id', id);
  if (error) throw new Error(errMsg(error, 'Failed to update subject.'));
}

export async function deleteSubject(id: string): Promise<void> {
  // Delete notes linked to this subject (no FK), then the subject cascades topics/plans/reminders.
  const { error: noteErr } = await supabase.from('notes').delete().eq('subject_id', id);
  if (noteErr) throw new Error(errMsg(noteErr, 'Failed to delete linked notes.'));
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) throw new Error(errMsg(error, 'Failed to delete subject.'));
}

// ---------- Topics ----------

export async function getTopics(): Promise<Topic[]>;
export async function getTopics(subjectId: string): Promise<Topic[]>;
export async function getTopics(subjectId?: string): Promise<Topic[]> {
  let query = supabase.from('topics').select('*');
  if (subjectId) query = query.eq('subject_id', subjectId);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(errMsg(error, 'Failed to load topics.'));
  return (data as Topic[]) ?? [];
}

export async function saveTopic(input: { subject_id: string; name: string }): Promise<Topic> {
  const { data, error } = await supabase
    .from('topics')
    .insert({ subject_id: input.subject_id, name: input.name })
    .select()
    .single();
  if (error) throw new Error(errMsg(error, 'Failed to save topic.'));
  return data as Topic;
}

export async function updateTopic(id: string, patch: Partial<Pick<Topic, 'name' | 'status' | 'completed_at'>>): Promise<void> {
  const { error } = await supabase.from('topics').update(patch).eq('id', id);
  if (error) throw new Error(errMsg(error, 'Failed to update topic.'));
}

export async function deleteTopic(id: string): Promise<void> {
  // Deleting the topic cascades to plan entries and reminders via FK.
  const { error } = await supabase.from('topics').delete().eq('id', id);
  if (error) throw new Error(errMsg(error, 'Failed to delete topic.'));
}

// ---------- Study plan entries ----------

export async function getPlanEntries(): Promise<StudyPlanEntry[]>;
export async function getPlanEntries(date: string): Promise<StudyPlanEntry[]>;
export async function getPlanEntries(start: string, end: string): Promise<StudyPlanEntry[]>;
export async function getPlanEntries(a?: string, b?: string): Promise<StudyPlanEntry[]> {
  let query = supabase.from('study_plan_entries').select('*');
  if (a && b) {
    query = query.gte('planned_date', a).lte('planned_date', b);
  } else if (a) {
    query = query.eq('planned_date', a);
  }
  const { data, error } = await query.order('planned_date', { ascending: true });
  if (error) throw new Error(errMsg(error, 'Failed to load plan entries.'));
  return (data as StudyPlanEntry[]) ?? [];
}

export async function addPlanEntry(input: { topic_id: string; planned_date: string }): Promise<StudyPlanEntry> {
  const { data, error } = await supabase
    .from('study_plan_entries')
    .insert({ topic_id: input.topic_id, planned_date: input.planned_date })
    .select()
    .single();
  if (error) throw new Error(errMsg(error, 'Failed to add plan entry.'));
  return data as StudyPlanEntry;
}

export async function addPlanEntries(items: { topic_id: string; planned_date: string }[]): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map((i) => ({ topic_id: i.topic_id, planned_date: i.planned_date }));
  const { error } = await supabase.from('study_plan_entries').insert(rows);
  if (error) throw new Error(errMsg(error, 'Failed to add plan entries.'));
}

export async function updatePlanEntry(id: string, patch: Partial<Pick<StudyPlanEntry, 'done' | 'planned_date'>>): Promise<void> {
  const { error } = await supabase.from('study_plan_entries').update(patch).eq('id', id);
  if (error) throw new Error(errMsg(error, 'Failed to update plan entry.'));
}

export async function deletePlanEntry(id: string): Promise<void> {
  const { error } = await supabase.from('study_plan_entries').delete().eq('id', id);
  if (error) throw new Error(errMsg(error, 'Failed to delete plan entry.'));
}

// ---------- Revision reminders ----------

export async function getReminders(): Promise<RevisionReminder[]> {
  const { data, error } = await supabase
    .from('revision_reminders')
    .select('*')
    .eq('completed', false)
    .order('due_date', { ascending: true });
  if (error) throw new Error(errMsg(error, 'Failed to load reminders.'));
  return (data as RevisionReminder[]) ?? [];
}

export async function getRemindersDueBy(date: string): Promise<RevisionReminder[]> {
  const { data, error } = await supabase
    .from('revision_reminders')
    .select('*')
    .eq('completed', false)
    .lte('due_date', date)
    .order('due_date', { ascending: true });
  if (error) throw new Error(errMsg(error, 'Failed to load reminders.'));
  return (data as RevisionReminder[]) ?? [];
}

export async function addReminders(items: { topic_id: string; due_date: string }[]): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map((i) => ({ topic_id: i.topic_id, due_date: i.due_date }));
  const { error } = await supabase.from('revision_reminders').insert(rows);
  if (error) throw new Error(errMsg(error, 'Failed to add reminders.'));
}

export async function completeReminder(id: string): Promise<void> {
  const { error } = await supabase.from('revision_reminders').update({ completed: true }).eq('id', id);
  if (error) throw new Error(errMsg(error, 'Failed to complete reminder.'));
}

// ---------- Notes ----------

export async function getNotes(): Promise<NoteWithSubject[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*, subjects(name)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(errMsg(error, 'Failed to load notes.'));
  const rows = (data ?? []) as Note[];
  return rows.map((n) => ({
    ...n,
    subject_name: n.subjects?.name ?? null,
  }));
}

export async function saveNote(input: {
  title: string;
  content: string;
  subject_id: string | null;
}): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      title: input.title,
      content: input.content,
      subject_id: input.subject_id,
    })
    .select()
    .single();
  if (error) throw new Error(errMsg(error, 'Failed to save note.'));
  return data as Note;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw new Error(errMsg(error, 'Failed to delete note.'));
}

export { nowISO };
