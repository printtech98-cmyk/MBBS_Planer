export interface ChatTurn {
  role: 'user' | 'model';
  content: string;
}

const SYSTEM_PROMPT =
  'You are a study assistant helping a medical student understand their own lecture notes. ' +
  'You will be given the full text of one of their notes and a question about it. ' +
  'Answer using ONLY the information in the provided notes.\n\n' +
  'Rules:\n' +
  '- If the answer is clearly present in the notes, answer it accurately and concisely, in plain language suitable for exam revision, using short paragraphs or bullet points where helpful.\n' +
  '- If the notes don\'t contain enough information to answer the question, say so clearly and do not invent medical facts — instead suggest what part of the notes is related, or say the notes don\'t cover this topic. Never fabricate clinical or scientific information that isn\'t supported by the provided text.\n' +
  '- You may briefly rephrase or clarify a concept from the notes in simpler terms if asked, but do not introduce outside medical facts not present in the notes.\n' +
  '- Keep answers focused and exam-relevant. Avoid unnecessary repetition of the question.\n' +
  '- If the student\'s question is unrelated to the notes and not medical/academic (e.g. small talk), politely redirect them to ask about the note content.';

export async function askAboutNote(
  noteContent: string,
  question: string,
  history: ChatTurn[],
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Add it to your .env file.');
  }

  const lastFour = history.slice(-4);

  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  if (lastFour.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: `NOTES:\n${noteContent}\n\nQUESTION: ${question}` }],
    });
  } else {
    contents.push({
      role: 'user',
      parts: [{ text: `NOTES:\n${noteContent}` }],
    });
    for (const turn of lastFour) {
      contents.push({ role: turn.role, parts: [{ text: turn.content }] });
    }
    contents.push({ role: 'user', parts: [{ text: question }] });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.3 },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const answer: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof answer !== 'string' || !answer.trim()) {
    throw new Error('Gemini returned an empty response. Please try again.');
  }
  return answer;
}
