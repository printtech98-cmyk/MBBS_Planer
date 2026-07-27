import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { getSubjects, getTopics } from '@/lib/db';
import type { Subject, Topic } from '@/lib/types';
import { Card, PageHeader, EmptyState, Skeleton, ErrorBanner } from '@/components/ui';
import { BarChart3, TrendingUp, PieChart as PieIcon } from 'lucide-react';

const COLORS = {
  not_started: '#cbd5e1',
  in_progress: '#f59e0b',
  completed: '#14b8a6',
  bar: '#0ea5e9',
  line: '#0ea5e9',
};

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        const [subs, tops] = await Promise.all([getSubjects(), getTopics()]);
        setSubjects(subs);
        setTopics(tops);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load progress data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subjectData = useMemo(() => {
    return subjects
      .map((s) => {
        const subTopics = topics.filter((t) => t.subject_id === s.id);
        const done = subTopics.filter((t) => t.status === 'completed').length;
        const pct = subTopics.length === 0 ? 0 : Math.round((done / subTopics.length) * 100);
        return { name: s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name, pct, full: s.name };
      })
      .filter((d) => d.pct > 0 || topics.some((t) => t.subject_id === subjects.find((s) => s.name === d.full)?.id));
  }, [subjects, topics]);

  const completionOverTime = useMemo(() => {
    const completed = topics
      .filter((t) => t.status === 'completed' && t.completed_at)
      .map((t) => ({ date: t.completed_at!.slice(0, 10) }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    if (completed.length === 0) return [];
    const byDate: Record<string, number> = {};
    completed.forEach((c) => (byDate[c.date] = (byDate[c.date] ?? 0) + 1));
    let cumulative = 0;
    return Object.entries(byDate)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, count]) => {
        cumulative += count;
        return { date, completed: cumulative };
      });
  }, [topics]);

  const donutData = useMemo(() => {
    const counts = { not_started: 0, in_progress: 0, completed: 0 };
    topics.forEach((t) => (counts[t.status] += 1));
    return [
      { name: 'Not started', value: counts.not_started, key: 'not_started' },
      { name: 'In progress', value: counts.in_progress, key: 'in_progress' },
      { name: 'Completed', value: counts.completed, key: 'completed' },
    ].filter((d) => d.value > 0);
  }, [topics]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Progress" subtitle="Visualize how your study is going." />
        <div className="space-y-6">
          <Card className="p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-64 w-full" />
          </Card>
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6"><Skeleton className="h-64 w-full" /></Card>
            <Card className="p-6"><Skeleton className="h-64 w-full" /></Card>
          </div>
        </div>
      </div>
    );
  }

  const hasData = topics.length > 0;

  return (
    <div>
      <PageHeader title="Progress" subtitle="Visualize how your study is going." />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {!hasData ? (
        <Card className="p-6">
          <EmptyState icon={BarChart3} title="No data yet" hint="Add subjects and topics to see your progress charts." />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-sky-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">Completion by subject</h2>
                <p className="text-sm text-slate-500">Percentage of topics completed per subject.</p>
              </div>
            </div>
            {subjectData.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No subjects with topics yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, subjectData.length * 48)}>
                <BarChart data={subjectData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} width={110} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(v) => [`${v}%`, 'Completed']}
                    labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ''}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                  />
                  <Bar dataKey="pct" radius={[0, 6, 6, 0]} fill={COLORS.bar} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800">Topics completed over time</h2>
                  <p className="text-sm text-slate-500">Cumulative completed topics.</p>
                </div>
              </div>
              {completionOverTime.length === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center">No topics completed yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={completionOverTime} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} labelFormatter={(d) => `By ${d}`} />
                    <Line type="monotone" dataKey="completed" stroke={COLORS.line} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.line }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <PieIcon className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800">Topic status</h2>
                  <p className="text-sm text-slate-500">Breakdown across all topics.</p>
                </div>
              </div>
              {donutData.length === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center">No topics yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3}>
                      {donutData.map((d) => (
                        <Cell key={d.key} fill={COLORS[d.key as keyof typeof COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
