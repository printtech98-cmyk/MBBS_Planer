import { useState, type FormEvent } from 'react';
import { generateSchedule } from '@/lib/gemini';
import { saveTopic, addPlanEntries } from '@/lib/db';
import type { Subject, Topic } from '@/lib/types';
import { todayISO } from '@/lib/dates';
import { X, Loader2, Sparkles, AlertCircle, CalendarDays, Clock, RefreshCw, Check } from 'lucide-react';

interface ScheduleDay {
  date: string;
  topics: string[];
  notes: string;
}

interface GenerateScheduleModalProps {
  subject: Subject;
  existingTopics: Topic[];
  onClose: () => void;
  onAccepted: () => void;
}

export default function GenerateScheduleModal({
  subject,
  existingTopics,
  onClose,
  onAccepted,
}: GenerateScheduleModalProps) {
  const prefill = existingTopics.map((t) => t.name).join('\n');
  const [syllabusText, setSyllabusText] = useState(prefill);
  const [examDate, setExamDate] = useState(subject.exam_date ?? '');
  const [hoursPerDay, setHoursPerDay] = useState('3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleDay[] | null>(null);
  const [accepting, setAccepting] = useState(false);

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSchedule(null);
    if (!syllabusText.trim()) {
      setError('Paste your syllabus topics first.');
      return;
    }
    if (!examDate) {
      setError('Please set an exam date.');
      return;
    }
    setLoading(true);
    try {
      const result = await generateSchedule({
        syllabusText,
        examDate,
        hoursPerDay: Number(hoursPerDay) || 3,
        todayDate: todayISO(),
      });
      setSchedule(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate schedule.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const accept = async () => {
    if (!schedule) return;
    setAccepting(true);
    setError(null);
    try {
      const subjectId = subject.id;
      const nameToTopicId = new Map<string, string>();
      existingTopics.forEach((t) => nameToTopicId.set(t.name.toLowerCase(), t.id));

      const entriesToInsert: { topic_id: string; planned_date: string }[] = [];

      for (const day of schedule) {
        for (const topicName of day.topics) {
          const key = topicName.toLowerCase();
          let topicId = nameToTopicId.get(key);
          if (!topicId) {
            const created = await saveTopic({ subject_id: subjectId, name: topicName });
            nameToTopicId.set(key, created.id);
            topicId = created.id;
          }
          entriesToInsert.push({ topic_id: topicId, planned_date: day.date });
        }
      }

      if (entriesToInsert.length > 0) {
        await addPlanEntries(entriesToInsert);
      }

      onAccepted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save schedule.';
      setError(msg);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 text-lg">Generate AI Study Schedule</h2>
              <p className="text-sm text-slate-500">{subject.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!schedule && (
            <form onSubmit={generate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Syllabus topics
                  <span className="text-slate-400 font-normal"> (one per line, or comma separated)</span>
                </label>
                <textarea
                  value={syllabusText}
                  onChange={(e) => setSyllabusText(e.target.value)}
                  rows={7}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none resize-y font-mono text-sm"
                  placeholder="Anatomy of the upper limb&#10;Cardiovascular system&#10;Respiratory system, ..."
                />
                {existingTopics.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Pre-filled with your {existingTopics.length} existing topic{existingTopics.length === 1 ? '' : 's'}.
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam date</label>
                  <div className="relative">
                    <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      value={examDate}
                      min="2024-01-01"
                      max="2035-12-31"
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Study hours / day</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="number"
                      min="1"
                      max="16"
                      value={hoursPerDay}
                      onChange={(e) => setHoursPerDay(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-medium hover:from-sky-600 hover:to-teal-600 transition shadow-md shadow-sky-200 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate schedule
                  </>
                )}
              </button>
            </form>
          )}

          {schedule && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">{schedule.length} days</span> scheduled.
                </p>
                <button
                  onClick={() => {
                    setSchedule(null);
                    setError(null);
                  }}
                  className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left font-medium px-3 py-2 w-28">Date</th>
                      <th className="text-left font-medium px-3 py-2">Topics</th>
                      <th className="text-left font-medium px-3 py-2 w-32">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schedule.map((day, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{day.date}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {day.topics.length === 0 ? (
                            <span className="text-slate-400 italic">—</span>
                          ) : (
                            <span>{day.topics.join(', ')}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {day.notes ? (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-md ${
                                day.notes === 'Revision'
                                  ? 'bg-amber-50 text-amber-600'
                                  : day.notes === 'Light review day'
                                    ? 'bg-teal-50 text-teal-600'
                                    : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {day.notes}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 mt-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {schedule && (
          <div className="p-6 border-t border-slate-100 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={accept}
              disabled={accepting}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Accept & Add to Planner
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
