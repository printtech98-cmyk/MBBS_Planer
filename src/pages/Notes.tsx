import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { askAboutNote, type ChatTurn } from '@/lib/askNotes';
import { getSubjects, getNotes, saveNote, deleteNote } from '@/lib/db';
import type { NoteWithSubject, Subject } from '@/lib/types';
import { Card, PageHeader, EmptyState, SkeletonGrid, ErrorBanner, ConfirmDialog } from '@/components/ui';
import {
  NotebookPen,
  Plus,
  ChevronLeft,
  Trash2,
  Send,
  RefreshCw,
  Bot,
  User,
  Filter,
  X,
  Loader2,
} from 'lucide-react';

export default function NotesPage() {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<NoteWithSubject[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeNote, setActiveNote] = useState<NoteWithSubject | null>(null);
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');

  const [dbError, setDbError] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmNote, setConfirmNote] = useState<NoteWithSubject | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadNotes = async () => {
    setDbError(null);
    try {
      const [data, subs] = await Promise.all([getNotes(), getSubjects()]);
      setNotes(data);
      setSubjects(subs);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to load notes.');
    }
  };

  useEffect(() => {
    (async () => {
      await loadNotes();
      setLoading(false);
    })();
  }, []);

  const filteredNotes = useMemo(() => {
    if (filterSubjectId === 'all') return notes;
    if (filterSubjectId === 'none') return notes.filter((n) => !n.subject_id);
    return notes.filter((n) => n.subject_id === filterSubjectId);
  }, [notes, filterSubjectId]);

  const deleteNoteHandler = async () => {
    if (!confirmNote) return;
    setDeleting(true);
    setDbError(null);
    try {
      await deleteNote(confirmNote.id);
      if (activeNote?.id === confirmNote.id) setActiveNote(null);
      setConfirmNote(null);
      await loadNotes();
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to delete note.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <SkeletonGrid count={6} />;

  // ----- Note detail view -----
  if (activeNote) {
    return (
      <div>
        <button
          onClick={() => setActiveNote(null)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> All notes
        </button>

        <PageHeader
          title={activeNote.title}
          subtitle={activeNote.subject_name ? `Linked to ${activeNote.subject_name}` : 'No subject linked'}
          action={
            <button
              onClick={() => setConfirmNote(activeNote)}
              className="px-3.5 py-2 rounded-xl text-sm font-medium text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          }
        />

        {dbError && <ErrorBanner message={dbError} onDismiss={() => setDbError(null)} />}

        <Card className="p-5 mb-6">
          <p className="text-sm font-medium text-slate-500 mb-2">Note content</p>
          <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{activeNote.content || 'This note is empty.'}</p>
        </Card>

        <AskPanel note={activeNote} />

        <ConfirmDialog
          open={!!confirmNote}
          title="Delete note"
          message={<>Delete <strong>{confirmNote?.title}</strong>? This can't be undone.</>}
          busy={deleting}
          onConfirm={deleteNoteHandler}
          onCancel={() => setConfirmNote(null)}
        />
      </div>
    );
  }

  // ----- Notes list view -----
  return (
    <div>
      <PageHeader
        title="Notes"
        subtitle="Save your lecture notes and ask questions about them with AI."
        action={
          <button
            onClick={() => setNoteModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 shadow-md shadow-sky-200 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add note
          </button>
        }
      />

      {dbError && <ErrorBanner message={dbError} onDismiss={() => setDbError(null)} />}

      {notes.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none"
          >
            <option value="all">All subjects</option>
            <option value="none">No subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {notes.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={NotebookPen}
            title="No notes yet"
            hint="Add your first note to start asking questions about it with AI."
            action={
              <button
                onClick={() => setNoteModal(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add your first note
              </button>
            }
          />
        </Card>
      ) : filteredNotes.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={NotebookPen} title="No notes for this subject" hint="Try a different filter or add a new note." />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((n) => (
            <Card key={n.id} className="p-5 hover:shadow-md transition cursor-pointer group flex flex-col">
              <div onClick={() => setActiveNote(n)} className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 flex items-center justify-center">
                    <NotebookPen className="w-5 h-5 text-sky-600" />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmNote(n); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="font-semibold text-slate-800 line-clamp-1">{n.title}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-3 whitespace-pre-wrap">{n.content || 'Empty note'}</p>
              </div>
              {n.subject_name && (
                <span className="mt-3 self-start text-xs px-2 py-0.5 rounded-md bg-sky-50 text-sky-600">{n.subject_name}</span>
              )}
            </Card>
          ))}
        </div>
      )}

      {noteModal && (
        <NoteModal
          subjects={subjects}
          busy={busy}
          onClose={() => setNoteModal(false)}
          onSaved={async () => {
            setNoteModal(false);
            await loadNotes();
          }}
          onError={(msg) => setDbError(msg)}
          setBusy={setBusy}
        />
      )}

      <ConfirmDialog
        open={!!confirmNote}
        title="Delete note"
        message={<>Delete <strong>{confirmNote?.title}</strong>? This can't be undone.</>}
        busy={deleting}
        onConfirm={deleteNoteHandler}
        onCancel={() => setConfirmNote(null)}
      />
    </div>
  );
}

function NoteModal({
  subjects,
  busy,
  onClose,
  onSaved,
  onError,
  setBusy,
}: {
  subjects: Subject[];
  busy: boolean;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
  setBusy: (b: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    onError('');
    setBusy(true);
    const subj = subjects.find((s) => s.id === subjectId) ?? null;
    try {
      await saveNote({
        title: title.trim(),
        content: content.trim(),
        subject_id: subj?.id ?? null,
      });
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save note.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800 text-lg">New note</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none"
              placeholder="e.g. Cardiac cycle"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Link to subject (optional)</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none bg-white"
            >
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none resize-y"
              placeholder="Paste or write your lecture notes here..."
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 disabled:opacity-60 flex items-center justify-center gap-1.5">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AskPanel({ note }: { note: NoteWithSubject }) {
  const [conversation, setConversation] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;
    setError(null);
    setInput('');

    const userTurn: ChatTurn = { role: 'user', content: question };
    const nextHistory = [...conversation, userTurn];
    setConversation(nextHistory);
    setLoading(true);

    try {
      const answer = await askAboutNote(note.content, question, conversation);
      setConversation([...nextHistory, { role: 'assistant', content: answer }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg);
      setConversation(nextHistory.slice(0, -1));
      setInput(question);
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    setError(null);
    void ask({ preventDefault: () => {} } as FormEvent);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Ask My Notes</h2>
          <p className="text-xs text-slate-400">Ask a question about this note — answers use only what's written here.</p>
        </div>
      </div>

      <div className="space-y-3 mb-4 max-h-[40vh] overflow-y-auto pr-1">
        {conversation.length === 0 && !loading && (
          <div className="text-center py-6 text-sm text-slate-400">
            Ask a question about this note and the AI will answer using only what you've written.
          </div>
        )}
        {conversation.map((turn, i) => (
          <div key={i} className={`flex gap-2.5 ${turn.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${turn.role === 'user' ? 'bg-slate-200' : 'bg-gradient-to-br from-indigo-500 to-sky-500'}`}>
              {turn.role === 'user' ? <User className="w-3.5 h-3.5 text-slate-600" /> : <Bot className="w-3.5 h-3.5 text-white" />}
            </div>
            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${turn.role === 'user' ? 'bg-sky-500 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-700 rounded-tl-sm'}`}>
              {turn.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-indigo-500 to-sky-500">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-100">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 mb-3">
          <span className="flex-1">{error}</span>
          <button onClick={retry} className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      <form onSubmit={ask} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this note"
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </Card>
  );
}
