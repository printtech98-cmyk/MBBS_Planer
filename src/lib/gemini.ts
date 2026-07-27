const SYSTEM_PROMPT = `You are a study planning assistant for medical students preparing for exams. Given a syllabus (a list of topics), an exam date, today's date, and available study hours per day, produce a realistic day-by-day study schedule as JSON only — no explanation, no markdown, just a valid JSON array.

Each element must be: {"date": "YYYY-MM-DD", "topics": ["topic name", ...], "notes": "short note or empty string"}.

Rules:
- Cover every single day from today's date through the exam date, inclusive.
- Distribute all syllabus topics across the available days, giving harder-sounding or larger topics (judge by name) more days if needed, and grouping small related topics together on the same day.
- Never schedule more topics on one day than can reasonably be studied in the given hours per day (assume roughly 1-2 hours per topic depending on apparent complexity).
- Reserve the final 3 days before the exam date for revision of previously covered topics only — do not introduce new topics in this window, and set notes to "Revision" on these days.
- Make the day immediately before the exam a light day with at most 1-2 topics for final review, notes: "Light review day".
- If the number of days available is too short to reasonably cover all topics at the given pace, still distribute all topics across all available days as evenly as possible (compress rather than drop topics), and add a note on the first day: "Tight schedule — consider extra study hours".
- Respond with valid JSON only. No prose, no code fences, no explanation.`;

export interface ScheduleDay {
  date: string;
  topics: string[];
  notes: string;
}

export interface ScheduleRequest {
  syllabusText: string;
  examDate: string;
  hoursPerDay: number;
  todayDate: string;
}

function extractJson(text: string): unknown {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned);
}

function isValidSchedule(value: unknown): value is ScheduleDay[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as ScheduleDay).date === 'string' &&
      Array.isArray((item as ScheduleDay).topics) &&
      (item as ScheduleDay).topics.every((t) => typeof t === 'string') &&
      typeof (item as ScheduleDay).notes === 'string',
  );
}

export async function generateSchedule(req: ScheduleRequest): Promise<ScheduleDay[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Add it to your .env file.');
  }

  const userPrompt = `Syllabus (one topic per line):\n${req.syllabusText}\n\nToday's date: ${req.todayDate}\nExam date: ${req.examDate}\nStudy hours available per day: ${req.hoursPerDay}\n\nGenerate the schedule as a JSON array only.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.4 },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof content !== 'string') {
    throw new Error('Gemini returned an unexpected response shape.');
  }

  let schedule: unknown;
  try {
    schedule = extractJson(content);
  } catch {
    throw new Error('Gemini response was not valid JSON. Please try again.');
  }

  if (!isValidSchedule(schedule)) {
    throw new Error('Gemini response did not match the expected schedule format. Please try again.');
  }

  return schedule;
}
