import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { getPlanEntries, getTopics, getSubjects, addPlanEntry, updatePlanEntry, deletePlanEntry } from '@/lib/db';
import type { StudyPlanEntry, Topic, Subject } from '@/lib/types';
import { todayISO, formatDateShort, relativeDay, startOfWeek } from '@/lib/dates';
import { Card, PageHeader, EmptyState, SkeletonGrid, ErrorBanner } from '@/components/ui';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, CheckCircle2, X } from 'lucide-react';

interface EnrichedEntry extends StudyPlanEntry {
  topic?: Topic;
  subject?: Subject;
}

export default function PlannerPage() {
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek());
  const [entries, setEntries] = useState<EnrichedEntry[]>([]);
  const [allTopics, setAllTopics] = useState<{ topic: Topic; subject: Subject | null }[]>([]);
  const [assignDate, setAssignDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [weekStart]);

  const loadEntries = async () => {
    setError(null);
    try {
      const [raw, topics, subjects] = await Promise.all([
        getPlanEntries(days[0], days[6]),
        getTopics(),
        getSubjects(),
      ]);
      const enriched: EnrichedEntry[] = raw.map((e) => {
        const topic = topics.find((t) => t.id === e.topic_id);
        const subject = topic ? subjects.find((s) => s.id === topic.subject_id) : undefined;
        return { ...e, topic, subject };
      });
      setEntries(enriched);
      setAllTopics(
        topics
          .filter((t) => t.status !== 'completed')
          .map((t) => ({ topic: t, subject: subjects.find((s) => s.id === t.subject_id) ?? null })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load planner.');
    }
  };

  useEffect(() => {
    (async () => {
      await loadEntries();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const entriesByDate = useMemo(() => {
    const map: Record<string, EnrichedEntry[]> = {};
    days.forEach((d) => (map[d] = []));
    entries.forEach((e) => {
      if (map[e.planned_date]) map[e.planned_date].push(e);
    });
    return map;
  }, [entries, days]);

  const toggleDone = async (entry: EnrichedEntry) => {
    setError(null);
    setBusy(true);
    try {
      await updatePlanEntry(entry.id, { done: !entry.done });
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry.');
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (entry: EnrichedEntry) => {
    setError(null);
    setBusy(true);
    try {
      await deletePlanEntry(entry.id);
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove entry.');
    } finally {
      setBusy(false);
    }
  };

  const assignTopic = async (topicId: string) => {
    if (!assignDate) return;
    setError(null);
    setBusy(true);
    try {
      await addPlanEntry({ topic_id: topicId, planned_date: assignDate });
      setAssignDate(null);
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign topic.');
    } finally {
      setBusy(false);
    }
  };

  const today = todayISO();

  if (loading) return <SkeletonGrid count={7} />;

  return (
    <div>
      <PageHeader title="Daily Planner" subtitle="Assign topics to study days and check them off." />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() - 7);
            setWeekStart(d);
          }}
          className="p-2 rounded-xl text-slate-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-slate-800 text-sm sm:text-base">
            {formatDateShort(days[0])} – {formatDateShort(days[6])}
          </p>
          <button onClick={() => setWeekStart(startOfWeek())} className="text-xs text-sky-600 hover:text-sky-700">
            Jump to this week
          </button>
        </div>
        <button
          onClick={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + 7);
            setWeekStart(d);
          }}
          className="p-2 rounded-xl text-slate-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {allTopics.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={CalendarDays}
            title="No topics to plan"
            hint="Create topics on the Subjects page first, then assign them to study days here."
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
          {days.map((date) => {
            const dayEntries = entriesByDate[date] ?? [];
            const isToday = date === today;
            const d = new Date(date + 'T00:00:00');
            return (
              <Card key={date} className={`p-4 flex flex-col min-h-[180px] ${isToday ? 'ring-2 ring-sky-300' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-slate-400 uppercase">{d.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                    <p className={`font-semibold ${isToday ? 'text-sky-600' : 'text-slate-800'}`}>
                      {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={() => setAssignDate(date)} className="p-1.5 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600" title="Assign topic">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 space-y-1.5">
                  {dayEntries.length === 0 ? (
                    <p className="text-xs text-slate-300 pt-2">Nothing planned</p>
                  ) : (
                    dayEntries.map((e) => (
                      <div key={e.id} className="group flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
                        <button onClick={() => toggleDone(e)} disabled={busy} className="flex-shrink-0">
                          <CheckCircle2 className={`w-4 h-4 ${e.done ? 'text-teal-500' : 'text-slate-300 hover:text-sky-400'}`} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${e.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {e.topic?.name ?? 'Topic'}
                          </p>
                          {e.subject?.name && <p className="text-[10px] text-slate-400 truncate">{e.subject.name}</p>}
                        </div>
                        <button onClick={() => removeEntry(e)} disabled={busy} className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-rose-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {assignDate && <AssignModal date={assignDate} topics={allTopics} onClose={() => setAssignDate(null)} onAssign={assignTopic} />}
    </div>
  );
}

function AssignModal({
  date,
  topics,
  onClose,
  onAssign,
}: {
  date: string;
  topics: { topic: Topic; subject: Subject | null }[];
  onClose: () => void;
  onAssign: (topicId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = topics.filter(
    ({ topic, subject }) =>
      topic.name.toLowerCase().includes(query.toLowerCase()) ||
      (subject?.name ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-800 text-lg">Assign topic</h2>
            <p className="text-sm text-slate-500">{formatDateShort(date)} · {relativeDay(date)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none mb-3"
          />
        </form>
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {filtered.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No topics found" hint="Create topics on the Subjects page first." />
          ) : (
            <ul className="space-y-1.5">
              {filtered.map(({ topic, subject }) => (
                <li key={topic.id}>
                  <button
                    onClick={() => onAssign(topic.id)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-sky-50 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-sky-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{topic.name}</p>
                      {subject?.name && <p className="text-xs text-slate-400">{subject.name}</p>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
