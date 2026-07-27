MBBS Study Planner + Revision Tracker

A study and spaced-revision tracker built for medical students, who juggle enormous syllabi, tight exam timelines, and the need to revisit material multiple times before it actually sticks.

The problem

MBBS (medical school) students cover an unusually large volume of material per subject, and cramming it once before an exam isn't enough to retain it long-term — a fact well established by spaced-repetition research, but hard to actually practice without a system. Most students end up managing their syllabus, exam dates, and revision schedule across scattered notebooks, sticky notes, or nothing at all, which makes it easy to lose track of what's been covered, what needs re-revising, and how much time is actually left before an exam.

MBBS Study Planner solves this by giving students one place to: log their subjects and topics, see exam countdowns, get an AI-generated day-by-day study schedule from their own syllabus, and automatically receive spaced revision reminders (at 1, 3, 7, 16, and 35 days) every time they mark a topic complete — so revision happens on a schedule instead of by memory.

Who it's for: MBBS/medical students preparing for exams, though the same approach works for any student with a large, multi-topic syllabus and fixed exam dates.

Live app

https://mbbs-study-planner-xxrs.bolt.host

Features
Account system — email/password signup and login, so each student's data is private to them
Subjects — add, edit, and delete subjects, each with an exam date
Topics — add topics under each subject, and track status: Not Started / In Progress / Completed
Automatic spaced revision reminders — the moment a topic is marked Completed, the app automatically schedules 5 revision reminders at +1, +3, +7, +16, and +35 days, based on spaced-repetition intervals
Daily Planner — assign topics to specific study dates and check them off as you go
Revision Reminders page — see every upcoming and overdue spaced-revision reminder across all subjects, grouped by due date
Progress dashboard — completion percentage per subject, topics completed over time, and a breakdown of not-started/in-progress/completed topics, all as charts
AI-generated study schedule — turns a pasted syllabus into a realistic day-by-day study plan, automatically respecting the exam date and reserving the final days for revision only
Responsive design — usable on both desktop and mobile
Visible error handling — every database action shows a clear message if something fails, instead of failing silently
The AI feature

Generate AI Study Schedule — on any subject's page, the student pastes or edits their syllabus as a list of topics, sets the exam date and their available study hours per day, and the app calls an AI model to generate a complete day-by-day study plan. The student previews the plan and can accept it directly into their Daily Planner with one click.

This turns the tedious, error-prone part of exam prep — manually spreading dozens of topics across the weeks before an exam, while still leaving room for revision — into a single click, while keeping the student in control (they can regenerate or edit before accepting).

System prompt used
You are a study planning assistant for medical students preparing for exams. Given a syllabus (a list of topics), an exam date, today's date, and available study hours per day, produce a realistic day-by-day study schedule as JSON only — no explanation, no markdown, just a valid JSON array.

Each element must be: {"date": "YYYY-MM-DD", "topics": ["topic name", ...], "notes": "short note or empty string"}.

Rules:
- Cover every single day from today's date through the exam date, inclusive.
- Distribute all syllabus topics across the available days, giving harder-sounding or larger topics more days if needed, and grouping small related topics together on the same day.
- Never schedule more topics on one day than can reasonably be studied in the given hours per day (assume roughly 1-2 hours per topic depending on apparent complexity).
- Reserve the final 3 days before the exam date for revision of previously covered topics only — do not introduce new topics in this window, and set notes to "Revision" on these days.
- Make the day immediately before the exam a light day with at most 1-2 topics for final review, notes: "Light review day".
- If the number of days available is too short to reasonably cover all topics at the given pace, still distribute all topics across all available days as evenly as possible (compress rather than drop topics), and add a note on the first day: "Tight schedule — consider extra study hours".
- Respond with valid JSON only. No prose, no code fences, no explanation.

The request is handled by a Supabase Edge Function, which calls the AI model server-side (so the API key never reaches the browser) and returns the structured JSON schedule, which the frontend then renders as a preview table before the student accepts it.

Tools, services, and AI models used
bolt.new — AI app builder used to scaffold and iterate on the entire codebase
React + Vite + TypeScript + Tailwind CSS — frontend
Recharts — progress charts
Supabase — Postgres database, email/password authentication, and Edge Functions (server-side AI calls, keeping the API key off the client)
Google Gemini (gemini-3.6-flash) — the AI model powering the study schedule generator, called through an OpenAI-compatible endpoint from a Supabase Edge Function
Claude (Anthropic) — used throughout the build process to plan the architecture, write the prompts fed into bolt.new, write the AI system prompt above, and debug issues along the way
Screenshots

Show Image Dashboard showing overall progress, due-today reminders, and upcoming exams.

Show Image A subject page with its topics and status tracking.

Show Image The AI-generated study schedule preview, ready to accept into the planner.

Show Image Progress charts showing completion by subject and over time.

How to run this project locally
bash
git clone https://github.com/printtech98-cmyk/MBBS_Planer.git
cd MBBS_Planer
npm install


Requires a Supabase project with the subjects, topics, study_plan_entries, and revision_reminders tables (row-level security enabled), email/password authentication, and an Edge Function (generate-schedule) configured with the following secrets:

AI_API_KEY — Gemini API key
AI_API_BASE_URL — https://generativelanguage.googleapis.com/v1beta/openai/
AI_API_MODEL — gemini-3.6-flash

Then run:

bash
npm run dev

The app will be available at http://localhost:5173.
