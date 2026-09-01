import { useEffect, useMemo, useState } from 'react';
import { getReminders, completeReminder, getTopics, getSubjects } from '@/lib/db';
import type { RevisionReminder, Topic, Subject } from '@/lib/types';
import { formatDate, relativeDay, todayISO } from '@/lib/dates';
import { Card, PageHeader, EmptyState, SkeletonRows, ErrorBanner } from '@/components/ui';
import { Bell, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface EnrichedReminder extends RevisionReminder {
  topic?: Topic;
  subject?: Subject;
}

export default function RemindersPage() {
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<EnrichedReminder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const [raw, topics, subjects] = await Promise.all([getReminders(), getTopics(), getSubjects()]);
      const enriched: EnrichedReminder[] = raw.map((r) => {
        const topic = topics.find((t) => t.id === r.topic_id);
        const subject = topic ? subjects.find((s) => s.id === topic.subject_id) : undefined;
        return { ...r, topic, subject };
      });
      setReminders(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, EnrichedReminder[]> = {};
    reminders.forEach((r) => {
      if (!map[r.due_date]) map[r.due_date] = [];
      map[r.due_date].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [reminders]);

  const complete = async (r: EnrichedReminder) => {
    setError(null);
    setBusy(true);
    try {
      await completeReminder(r.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete reminder.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <SkeletonRows count={5} />;

  const today = todayISO();
  const overdueCount = reminders.filter((r) => r.due_date < today).length;

  return (
    <div>
      <PageHeader title="Revision Reminders" subtitle="Spaced-repetition schedule across all your subjects." />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {reminders.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Bell}
            title="No reminders due"
            hint="Mark topics as completed on the Subjects page and spaced-revision reminders will appear here automatically."
          />
        </Card>
      ) : (
        <>
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {overdueCount} reminder{overdueCount === 1 ? '' : 's'} overdue — catch up soon.
            </div>
          )}

          <div className="space-y-5">
            {grouped.map(([date, items]) => {
              const isOverdue = date < today;
              const isToday = date === today;
              return (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-rose-400' : isToday ? 'bg-sky-500' : 'bg-slate-300'}`} />
                    <h3 className="text-sm font-semibold text-slate-700">{formatDate(date)}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${isOverdue ? 'bg-rose-50 text-rose-600' : isToday ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-500'}`}>
                      {relativeDay(date)}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">{items.length} topic{items.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((r) => {
                      const overdue = r.due_date < today;
                      return (
                        <Card key={r.id} className="p-4 flex items-center gap-3 group">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${overdue ? 'bg-rose-50' : isToday ? 'bg-sky-50' : 'bg-slate-50'}`}>
                            {overdue ? <Clock className="w-4 h-4 text-rose-500" /> : <Bell className={`w-4 h-4 ${isToday ? 'text-sky-500' : 'text-slate-400'}`} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">{r.topic?.name ?? 'Topic'}</p>
                            {r.subject?.name && <p className="text-xs text-slate-400 truncate">{r.subject.name}</p>}
                          </div>
                          <button
                            onClick={() => complete(r)}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 transition disabled:opacity-60"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Done
                          </button>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
