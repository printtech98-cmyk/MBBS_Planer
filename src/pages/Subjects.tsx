import { useEffect, useState, type FormEvent } from 'react';
import {
  getSubjects,
  saveSubject,
  updateSubject,
  deleteSubject,
  getTopics,
  saveTopic,
  updateTopic,
  deleteTopic,
  addReminders,
} from '@/lib/db';
import type { Subject, Topic, TopicStatus } from '@/lib/types';
import { todayISO, addDays, formatDate, daysUntil, relativeDay } from '@/lib/dates';
import { Card, PageHeader, EmptyState, ProgressBar, SkeletonGrid, ErrorBanner, ConfirmDialog } from '@/components/ui';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  CalendarClock,
  CircleDot,
  Circle,
  CheckCircle2,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react';
import GenerateScheduleModal from '@/components/GenerateScheduleModal';

const STATUS_META: Record<TopicStatus, { label: string; icon: typeof Circle; color: string; ring: string }> = {
  not_started: { label: 'Not started', icon: Circle, color: 'text-slate-400', ring: 'bg-slate-100 text-slate-500' },
  in_progress: { label: 'In progress', icon: CircleDot, color: 'text-amber-500', ring: 'bg-amber-100 text-amber-600' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-teal-500', ring: 'bg-teal-100 text-teal-600' },
};

const REVISION_INTERVALS = [1, 3, 7, 16, 35];

export default function SubjectsPage() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  const [subjectModal, setSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectExam, setSubjectExam] = useState('');
  const [busy, setBusy] = useState(false);

  const [topicModal, setTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [topicName, setTopicName] = useState('');

  const [scheduleModal, setScheduleModal] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const [confirmSubject, setConfirmSubject] = useState<Subject | null>(null);
  const [confirmTopic, setConfirmTopic] = useState<Topic | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSubjects = async () => {
    try {
      const data = await getSubjects();
      setSubjects(data);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to load subjects.');
    }
  };

  const loadTopics = async (subjectId: string) => {
    setTopicsLoading(true);
    try {
      const data = await getTopics(subjectId);
      setTopics(data);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to load topics.');
    } finally {
      setTopicsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadSubjects();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (activeSubject) loadTopics(activeSubject.id);
  }, [activeSubject]);

  const openNewSubject = () => {
    setEditingSubject(null);
    setSubjectName('');
    setSubjectExam('');
    setSubjectModal(true);
  };

  const openEditSubject = (s: Subject) => {
    setEditingSubject(s);
    setSubjectName(s.name);
    setSubjectExam(s.exam_date ?? '');
    setSubjectModal(true);
  };

  const saveSubjectHandler = async (e: FormEvent) => {
    e.preventDefault();
    setDbError(null);
    setBusy(true);
    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, { name: subjectName, exam_date: subjectExam || null });
        if (activeSubject && editingSubject.id === activeSubject.id) {
          setActiveSubject({ ...activeSubject, name: subjectName, exam_date: subjectExam || null });
        }
      } else {
        await saveSubject({ name: subjectName, exam_date: subjectExam || null });
      }
      setSubjectModal(false);
      await loadSubjects();
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to save subject.');
    } finally {
      setBusy(false);
    }
  };

  const deleteSubjectHandler = async () => {
    if (!confirmSubject) return;
    setDeleting(true);
    setDbError(null);
    try {
      await deleteSubject(confirmSubject.id);
      if (activeSubject?.id === confirmSubject.id) setActiveSubject(null);
      setConfirmSubject(null);
      await loadSubjects();
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to delete subject.');
    } finally {
      setDeleting(false);
    }
  };

  const openNewTopic = () => {
    setEditingTopic(null);
    setTopicName('');
    setTopicModal(true);
  };

  const openEditTopic = (t: Topic) => {
    setEditingTopic(t);
    setTopicName(t.name);
    setTopicModal(true);
  };

  const saveTopicHandler = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeSubject) return;
    setDbError(null);
    setBusy(true);
    try {
      if (editingTopic) {
        await updateTopic(editingTopic.id, { name: topicName });
      } else {
        await saveTopic({ subject_id: activeSubject.id, name: topicName });
      }
      setTopicModal(false);
      await loadTopics(activeSubject.id);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to save topic.');
    } finally {
      setBusy(false);
    }
  };

  const deleteTopicHandler = async () => {
    if (!confirmTopic || !activeSubject) return;
    setDeleting(true);
    setDbError(null);
    try {
      await deleteTopic(confirmTopic.id);
      setConfirmTopic(null);
      await loadTopics(activeSubject.id);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to delete topic.');
    } finally {
      setDeleting(false);
    }
  };

  const cycleStatus = async (t: Topic) => {
    if (!activeSubject) return;
    const order: TopicStatus[] = ['not_started', 'in_progress', 'completed'];
    const next = order[(order.indexOf(t.status) + 1) % order.length];
    const patch: Partial<Pick<Topic, 'status' | 'completed_at'>> = { status: next };
    setDbError(null);
    try {
      if (next === 'completed') {
        patch.completed_at = new Date().toISOString();
        const today = todayISO();
        await addReminders(REVISION_INTERVALS.map((d) => ({ topic_id: t.id, due_date: addDays(today, d) })));
      } else {
        patch.completed_at = null;
      }
      await updateTopic(t.id, patch);
      await loadTopics(activeSubject.id);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to update topic.');
    }
  };

  if (loading) return <SkeletonGrid count={6} />;

  // ----- Topics view -----
  if (activeSubject) {
    const done = topics.filter((t) => t.status === 'completed').length;
    const pct = topics.length === 0 ? 0 : Math.round((done / topics.length) * 100);

    return (
      <div>
        <button
          onClick={() => setActiveSubject(null)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> All subjects
        </button>

        <PageHeader
          title={activeSubject.name}
          subtitle={activeSubject.exam_date ? `Exam ${formatDate(activeSubject.exam_date)} · ${relativeDay(activeSubject.exam_date)}` : 'No exam date set'}
          action={
            <div className="flex flex-wrap gap-2">
              <button onClick={() => openEditSubject(activeSubject)} className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5">
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => setScheduleModal(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 shadow-md shadow-indigo-200 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" /> AI Schedule
              </button>
              <button onClick={openNewTopic} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 shadow-md shadow-sky-200 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add topic
              </button>
            </div>
          }
        />

        {dbError && <ErrorBanner message={dbError} onDismiss={() => setDbError(null)} />}

        {topics.length > 0 && (
          <Card className="p-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Subject progress</span>
              <span className="text-sm font-semibold text-slate-800">{pct}%</span>
            </div>
            <ProgressBar value={pct} />
          </Card>
        )}

        {topicsLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-1/3 bg-slate-200 animate-pulse rounded mb-2" />
                    <div className="h-3 w-1/4 bg-slate-200 animate-pulse rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : topics.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={BookOpen}
              title="No topics yet"
              hint="Add topics to start tracking this subject and build a study plan."
              action={
                <button
                  onClick={openNewTopic}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add your first topic
                </button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-2.5">
            {topics.map((t) => {
              const meta = STATUS_META[t.status];
              const Icon = meta.icon;
              return (
                <Card key={t.id} className="p-4 flex items-center gap-3 group">
                  <button onClick={() => cycleStatus(t)} className="flex-shrink-0" title="Click to change status">
                    <Icon className={`w-6 h-6 ${meta.color} hover:scale-110 transition`} strokeWidth={2} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${t.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {t.name}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${meta.ring}`}>{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition sm:opacity-100 sm:group-hover:opacity-100">
                    <button onClick={() => openEditTopic(t)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmTopic(t)} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {subjectModal && <SubjectModal />}
        {topicModal && <TopicModal />}
        {scheduleModal && (
          <GenerateScheduleModal
            subject={activeSubject}
            existingTopics={topics}
            onClose={() => setScheduleModal(false)}
            onAccepted={async () => {
              setScheduleModal(false);
              await loadTopics(activeSubject.id);
            }}
          />
        )}
      </div>
    );
  }

  // ----- Subjects list view -----
  return (
    <div>
      <PageHeader
        title="Subjects"
        subtitle="Organize your subjects and track their topics."
        action={
          <button onClick={openNewSubject} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 shadow-md shadow-sky-200 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add subject
          </button>
        }
      />

      {dbError && <ErrorBanner message={dbError} onDismiss={() => setDbError(null)} />}

      {subjects.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            hint="Add your first subject to start tracking topics, planning study days, and getting revision reminders."
            action={
              <button
                onClick={openNewSubject}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add your first subject
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} onOpen={() => setActiveSubject(s)} onEdit={() => openEditSubject(s)} onDelete={() => setConfirmSubject(s)} />
          ))}
        </div>
      )}

      {subjectModal && <SubjectModal />}

      <ConfirmDialog
        open={!!confirmSubject}
        title="Delete subject"
        message={
          <>
            Delete <strong>{confirmSubject?.name}</strong>? This will permanently remove its topics, plan entries, reminders, and any linked notes. This can't be undone.
          </>
        }
        busy={deleting}
        onConfirm={deleteSubjectHandler}
        onCancel={() => setConfirmSubject(null)}
      />

      <ConfirmDialog
        open={!!confirmTopic}
        title="Delete topic"
        message={
          <>
            Delete topic <strong>{confirmTopic?.name}</strong>? Its plan entries and reminders will also be removed.
          </>
        }
        busy={deleting}
        onConfirm={deleteTopicHandler}
        onCancel={() => setConfirmTopic(null)}
      />
    </div>
  );

  function SubjectModal() {
    return (
      <Modal title={editingSubject ? 'Edit subject' : 'New subject'} onClose={() => setSubjectModal(false)}>
        <form onSubmit={saveSubjectHandler} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject name</label>
            <input
              required
              autoFocus
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none"
              placeholder="e.g. Anatomy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam date (optional)</label>
            <input
              type="date"
              value={subjectExam}
              min="2024-01-01"
              max="2035-12-31"
              onChange={(e) => setSubjectExam(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setSubjectModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 disabled:opacity-60 flex items-center justify-center gap-1.5">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingSubject ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  function TopicModal() {
    return (
      <Modal title={editingTopic ? 'Edit topic' : 'New topic'} onClose={() => setTopicModal(false)}>
        <form onSubmit={saveTopicHandler} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Topic name</label>
            <input
              required
              autoFocus
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none"
              placeholder="e.g. Upper limb anatomy"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setTopicModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 disabled:opacity-60 flex items-center justify-center gap-1.5">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingTopic ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    );
  }
}

function SubjectCard({ subject, onOpen, onEdit, onDelete }: { subject: Subject; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
  const [count, setCount] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const arr = await getTopics(subject.id);
        setCount({
          done: arr.filter((t) => t.status === 'completed').length,
          total: arr.length,
        });
      } catch {
        setCount(null);
      }
    })();
  }, [subject.id]);

  const pct = count && count.total > 0 ? Math.round((count.done / count.total) * 100) : 0;
  const days = subject.exam_date ? daysUntil(subject.exam_date) : null;

  return (
    <Card className="p-5 hover:shadow-md transition cursor-pointer group" >
      <div onClick={onOpen}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-sky-600" />
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <h3 className="font-semibold text-slate-800">{subject.name}</h3>
        {subject.exam_date ? (
          <div className="flex items-center gap-1.5 mt-1 text-sm">
            <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">{formatDate(subject.exam_date)}</span>
            {days !== null && (
              <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-md ${days < 0 ? 'bg-slate-100 text-slate-500' : days <= 7 ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600'}`}>
                {relativeDay(subject.exam_date!)}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 mt-1">No exam date</p>
        )}
        {count && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>{count.done}/{count.total} topics</span>
              <span>{pct}%</span>
            </div>
            <ProgressBar value={pct} />
          </div>
        )}
      </div>
    </Card>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800 text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
