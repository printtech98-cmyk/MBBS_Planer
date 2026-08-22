import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { getSubjects, getTopics } from '@/lib/db';
import type { Subject, Topic } from '@/lib/types';
import { getNotes, saveNote, deleteNote, type LocalNote } from '@/lib/notesStorage';
import { askAboutNote, type ChatTurn } from '@/lib/askNotes';
import { Card, PageHeader, EmptyState, ErrorBanner, ConfirmDialog } from '@/components/ui';
import {
  NotebookPen,
  Plus,
  Trash2,
  ChevronLeft,
  Send,
  Loader2,
  BookOpen,
  User,
  Sparkles,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export default function NotesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);

  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [activeNote, setActiveNote] = useState<LocalNote | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [topicId, setTopicId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<LocalNote | null>(null);

  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [subjData, topicData] = await Promise.all([getSubjects(), getTopics()]);
        setSubjects(subjData);
        setTopics(topicData);
      } catch (err) {
        setSubjectsError(err instanceof Error ? err.message : 'Failed to load subjects.');
      } finally {
        setSubjectsLoading(false);
      }
    })();
    setNotes(getNotes());
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, asking]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (filterSubject !== 'all' && n.subject_id !== filterSubject) return false;
      if (filterTopic !== 'all' && n.topic_id !== filterTopic) return false;
      return true;
    });
  }, [notes, filterSubject, filterTopic]);

  const formTopics = useMemo(() => {
    if (!subjectId) return topics;
    return topics.filter((t) => t.subject_id === subjectId);
  }, [topics, subjectId]);

  const openForm = () => {
    setTitle('');
    setContent('');
    setSubjectId('');
    setTopicId('');
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter a title.');
      return;
    }
    const subj = subjects.find((s) => s.id === subjectId) ?? null;
    const topic = topics.find((t) => t.id === topicId) ?? null;
    const note = saveNote({
      title: title.trim(),
      content,
      subject_id: subj ? subj.id : null,
      subject_name: subj ? subj.name : null,
      topic_id: topic ? topic.id : null,
      topic_name: topic ? topic.name : null,
    });
    setNotes(getNotes());
    setShowForm(false);
    setActiveNote(note);
    setChat([]);
    setChatError(null);
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    deleteNote(confirmDelete.id);
    setNotes(getNotes());
    if (activeNote?.id === confirmDelete.id) {
      setActiveNote(null);
      setChat([]);
    }
    setConfirmDelete(null);
  };

  const selectNote = (note: LocalNote) => {
    setActiveNote(note);
    setChat([]);
    setChatError(null);
    setQuestion('');
  };

  const handleSubjectChange = (id: string) => {
    setSubjectId(id);
    if (topicId) {
      const stillValid = id ? topics.some((t) => t.id === topicId && t.subject_id === id) : true;
      if (!stillValid) setTopicId('');
    }
  };

  const handleAsk = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeNote || !question.trim() || asking) return;
    const q = question.trim();
    setQuestion('');
    setChatError(null);

    const history: ChatTurn[] = chat.map((m) => ({ role: m.role, content: m.content }));
    setChat((prev) => [...prev, { role: 'user', content: q }]);
    setAsking(true);
    try {
      const answer = await askAboutNote(activeNote.content, q, history);
      setChat((prev) => [...prev, { role: 'model', content: answer }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Failed to get a response. Please try again.');
    } finally {
      setAsking(false);
    }
  };

  // ----- Add-note form view -----
  if (showForm) {
    return (
      <div>
        <button
          onClick={() => setShowForm(false)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> Back to notes
        </button>

        <PageHeader title="Add a note" subtitle="Write or paste your lecture notes, then ask questions about them." />

        {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}

        <Card className="p-5 sm:p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cardiovascular physiology — Lecture 3"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-slate-800 text-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Link to subject <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                value={subjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                disabled={subjectsLoading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-slate-800 text-sm bg-white"
              >
                <option value="">No subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {subjectsError && (
                <p className="text-xs text-rose-500 mt-1">Could not load subjects: {subjectsError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Link to topic <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                disabled={subjectsLoading || formTopics.length === 0}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-slate-800 text-sm bg-white disabled:opacity-60"
              >
                <option value="">No topic</option>
                {formTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {subjectId && formTopics.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">No topics under this subject yet.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your lecture notes here..."
                rows={12}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-slate-800 text-sm resize-y leading-relaxed"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 shadow-md shadow-sky-200 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Save note
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ----- Single-note + chat view -----
  if (activeNote) {
    return (
      <div>
        <button
          onClick={() => setActiveNote(null)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> All notes
        </button>

        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-800 truncate">{activeNote.title}</h1>
            {activeNote.subject_name && (
              <span className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-md bg-sky-50 text-sky-600">
                {activeNote.subject_name}
              </span>
            )}
          </div>
          <button
            onClick={() => setConfirmDelete(activeNote)}
            className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
            title="Delete note"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        </div>

        <Card className="p-5 mb-6">
          <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">
            {activeNote.content || '(empty note)'}
          </pre>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-semibold text-slate-800">Ask My Notes</h2>
          </div>

          {chatError && <ErrorBanner message={chatError} onDismiss={() => setChatError(null)} />}

          <div className="space-y-3 mb-4 min-h-[80px]">
            {chat.length === 0 && !asking && (
              <p className="text-sm text-slate-400 text-center py-4">
                Ask a question about this note and the AI will answer based only on what's written here.
              </p>
            )}
            {chat.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <div key={i} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isUser ? 'bg-slate-100' : 'bg-gradient-to-br from-sky-500 to-teal-500'
                    }`}
                  >
                    {isUser ? (
                      <User className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-sky-500 text-white rounded-tr-sm'
                        : 'bg-slate-100 text-slate-700 rounded-tl-sm'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
                  </div>
                </div>
              );
            })}
            {asking && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                </div>
                <div className="px-3.5 py-2.5 rounded-2xl bg-slate-100 text-slate-400 text-sm rounded-tl-sm">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about this note..."
              disabled={asking}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-slate-800 text-sm disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 disabled:opacity-50 flex items-center gap-1.5"
            >
              {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </Card>

        <ConfirmDialog
          open={!!confirmDelete}
          title="Delete note"
          message="This will permanently remove the note from your browser. This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      </div>
    );
  }

  // ----- Notes list view -----
  return (
    <div>
      <PageHeader
        title="Notes"
        subtitle="Save lecture notes and ask AI questions about them."
        action={
          <button
            onClick={openForm}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 shadow-md shadow-sky-200 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add note
          </button>
        }
      />

      {notes.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={NotebookPen}
            title="No notes yet"
            hint="Add your first lecture note, then ask the AI questions about it."
            action={
              <button
                onClick={openForm}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add your first note
              </button>
            }
          />
        </Card>
      ) : (
        <>
          {notes.filter((n) => n.subject_id || n.topic_id).length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <select
                value={filterSubject}
                onChange={(e) => {
                  setFilterSubject(e.target.value);
                  setFilterTopic('all');
                }}
                className="px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-slate-700 text-sm bg-white"
              >
                <option value="all">All subjects</option>
                {subjects
                  .filter((s) => notes.some((n) => n.subject_id === s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-slate-700 text-sm bg-white"
              >
                <option value="all">All topics</option>
                {topics
                  .filter((t) => notes.some((n) => n.topic_id === t.id))
                  .filter((t) => filterSubject === 'all' || t.subject_id === filterSubject)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 cursor-pointer hover:border-sky-200 hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-800 group-hover:text-sky-700 transition line-clamp-2">
                    {note.title}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(note);
                    }}
                    className="flex-shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {note.subject_name && (
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-md bg-sky-50 text-sky-600">
                      {note.subject_name}
                    </span>
                  )}
                  {note.topic_name && (
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-md bg-teal-50 text-teal-600">
                      {note.topic_name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                  {note.content || '(empty note)'}
                </p>
              </div>
            ))}
          </div>

          {filteredNotes.length === 0 && (
            <Card className="p-6 mt-4">
              <EmptyState icon={BookOpen} title="No notes match this filter" hint="Try a different subject or topic filter." />
            </Card>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete note"
        message="This will permanently remove the note from your browser. This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
