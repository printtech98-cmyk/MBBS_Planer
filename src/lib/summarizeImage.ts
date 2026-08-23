const SYSTEM_PROMPT =
  'You are a study assistant creating detailed revision notes from a page of a medical student\'s lecture material. ' +
  'From the image provided, produce thorough, well-organized notes a student could study from directly, not a short summary. ' +
  'Structure your response with clear headings and bullet points covering every distinct concept, fact, list, classification, ' +
  'or process shown on the page. If the page contains a diagram, chart, table, or labeled illustration, describe it in detail ' +
  'as its own section — what it shows, its key labeled parts, and what relationship or process it illustrates — so a student ' +
  'who cannot see the image can still understand it fully from your notes. Only include information that is actually visible ' +
  'in the image — do not add outside medical facts, and do not guess at text or diagrams that are unclear or illegible; if ' +
  'part of the image is unreadable, explicitly say so rather than inventing content. Use precise medical terminology as shown ' +
  'on the page.';

const AI_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms / 1000}s. Please try again.`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export async function summarizeImage(base64Data: string, mimeType: string = 'image/png'): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Add it to your .env file.');
  }

  console.log('[AI] Sending summarize request, image base64 length:', base64Data.length, 'mime:', mimeType);
  const res = await withTimeout(
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: 'user',
              parts: [
                { text: 'Please create detailed revision notes from this page of my lecture material.' },
                { inlineData: { mimeType, data: base64Data } },
              ],
            },
          ],
          generationConfig: { temperature: 0.3 },
        }),
      },
    ),
    AI_TIMEOUT_MS,
    'AI summary request',
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error('[AI] API error:', res.status, errText);
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  console.log('[AI] Response received, candidates:', data?.candidates?.length);
  const summary: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof summary !== 'string' || !summary.trim()) {
    console.error('[AI] Empty response:', JSON.stringify(data).slice(0, 300));
    throw new Error('Gemini returned an empty response. Please try again.');
  }
  console.log('[AI] Summary extracted, length:', summary.length);
  return summary;
}
