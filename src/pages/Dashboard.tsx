import { useEffect, useState } from 'react';
import { getSubjects, getTopics, getPlanEntries, getRemindersDueBy } from '@/lib/db';
import { getNotes, type LocalNote } from '@/lib/notesStorage';
import { getDueNoteReviewReminders, estimateNoteReviewMinutes } from '@/lib/noteReviewReminders';
import type { Subject, Topic, StudyPlanEntry, RevisionReminder } from '@/lib/types';
import { todayISO, formatDate, relativeDay, daysUntil } from '@/lib/dates';
import { Card, PageHeader, EmptyState, ProgressBar, Skeleton, ErrorBanner } from '@/components/ui';
import type { Page } from '@/components/AppLayout';
import {
  CalendarClock,
  CheckCircle2,
  Bell,
  BookOpen,
  TrendingUp,
  ArrowRight,
  CalendarDays,
  NotebookPen,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (p: Page) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [todayPlan, setTodayPlan] = useState<StudyPlanEntry[]>([]);
  const [todayReminders, setTodayReminders] = useState<RevisionReminder[]>([]);
  const [dueNotes, setDueNotes] = useState<LocalNote[]>([]);

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        const today = todayISO();
        const [subs, allTopics, plan, reminders] = await Promise.all([
          getSubjects(),
          getTopics(),
          getPlanEntries(today),
          getRemindersDueBy(today),
        ]);
        const notes = getNotes();
        const dueNoteIds = new Set(getDueNoteReviewReminders(today).map((reminder) => reminder.noteId));
        setSubjects(subs);
        setTopics(allTopics);
        setTodayPlan(plan);
        setTodayReminders(reminders);
        setDueNotes(notes.filter((note) => dueNoteIds.has(note.id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const topicNames: Record<string, string> = {};
  topics.forEach((t) => (topicNames[t.id] = t.name));

  const exams = subjects
    .filter((s) => s.exam_date)
    .sort((a, b) => (a.exam_date! < b.exam_date! ? -1 : 1));

  const completed = topics.filter((t) => t.status === 'completed').length;
  const total = topics.length;
  const overallPct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const estimatedNoteMinutes = dueNotes.reduce(
    (totalMinutes, note) => totalMinutes + estimateNoteReviewMinutes(note.content),
    0,
  );

  const statCard = (label: string, value: string | number, icon: typeof CalendarClock, accent: string) => {
    const Icon = icon;
    return (
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-slate-500 truncate">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1.5" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">{value}</p>
            )}
          </div>
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your study overview for today." />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {statCard('Overall progress', `${overallPct}%`, TrendingUp, 'bg-sky-50 text-sky-600')}
        {statCard('Topics done', `${completed}/${total}`, CheckCircle2, 'bg-teal-50 text-teal-600')}
        {statCard('Due today', todayReminders.length, Bell, 'bg-amber-50 text-amber-600')}
        {statCard('Planned today', todayPlan.length, CalendarDays, 'bg-indigo-50 text-indigo-600')}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Overall completion</h2>
            <span className="text-2xl font-bold text-slate-800">{overallPct}%</span>
          </div>
          <ProgressBar value={overallPct} className="h-3" />
          <p className="text-sm text-slate-500 mt-3">
            {total === 0
              ? 'Add subjects and topics to start tracking.'
              : `${completed} of ${total} topics completed across all subjects.`}
          </p>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Upcoming exams</h2>
            <button
              onClick={() => onNavigate('subjects')}
              className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              View <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : exams.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No exam dates set"
              hint="Add exam dates on the Subjects page to see a countdown here."
              action={
                <button
                  onClick={() => onNavigate('subjects')}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600"
                >
                  Go to Subjects
                </button>
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {exams.slice(0, 4).map((s) => {
                const days = daysUntil(s.exam_date!);
                const past = days < 0;
                return (
                  <li key={s.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-10 rounded-full flex-shrink-0 ${past ? 'bg-slate-200' : 'bg-gradient-to-b from-sky-400 to-teal-400'}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{s.name}</p>
                        <p className="text-xs text-slate-500">{formatDate(s.exam_date)}</p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium px-2.5 py-1 rounded-lg flex-shrink-0 ml-2 ${
                        past ? 'bg-slate-100 text-slate-500' : days <= 7 ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600'
                      }`}
                    >
                      {relativeDay(s.exam_date!)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Revision due today</h2>
            <button
              onClick={() => onNavigate('reminders')}
              className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : todayReminders.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Nothing due"
              hint="Mark topics as completed and spaced-revision reminders will appear here."
            />
          ) : (
            <ul className="space-y-2">
              {todayReminders.slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <span className="text-slate-700 truncate">{topicNames[r.topic_id] ?? 'Topic'}</span>
                  <span className="text-xs text-slate-400 ml-auto flex-shrink-0">{relativeDay(r.due_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800">Notes due today</h2>
              <p className="text-xs text-slate-400 mt-0.5">Including overdue reviews</p>
            </div>
            <button
              onClick={() => onNavigate('reminders')}
              className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              Review <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          ) : dueNotes.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="Nothing due"
              hint="New notes will appear here when their first review is due."
            />
          ) : (
            <>
              <p className="text-xl font-bold text-slate-800 mb-3">
                {dueNotes.length} note{dueNotes.length === 1 ? '' : 's'} due today
                <span className="text-sm font-medium text-slate-400"> (~{estimatedNoteMinutes} min)</span>
              </p>
              <ul className="space-y-2">
                {dueNotes.slice(0, 4).map((note) => (
                  <li key={note.id} className="flex items-center gap-3 py-1.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <NotebookPen className="w-3.5 h-3.5 text-teal-500" />
                    </div>
                    <span className="text-slate-700 truncate">{note.title}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Planned study today</h2>
            <button
              onClick={() => onNavigate('planner')}
              className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              Planner <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : todayPlan.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nothing planned"
              hint="Assign topics to today in the Planner to see them here."
              action={
                <button
                  onClick={() => onNavigate('planner')}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600"
                >
                  Open Planner
                </button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {todayPlan.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${p.done ? 'bg-teal-50' : 'bg-indigo-50'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${p.done ? 'text-teal-500' : 'text-indigo-400'}`} />
                  </div>
                  <span className={p.done ? 'text-slate-400 line-through truncate' : 'text-slate-700 truncate'}>
                    {topicNames[p.topic_id] ?? 'Topic'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
