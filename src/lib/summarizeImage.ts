const SYSTEM_PROMPT =
  'You are a study assistant creating a revision-friendly summary of a page from a medical student\'s lecture material. ' +
  'Summarize the key information visible in the image accurately, in plain language suitable for exam revision, ' +
  'using short paragraphs or bullet points. Only summarize what is actually visible in the image — do not add outside ' +
  'medical facts, and do not guess at text or diagrams that are unclear or illegible; if part of the image is unreadable, ' +
  'say so rather than inventing content.';

export async function summarizeImage(base64Data: string, mimeType: string = 'image/png'): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Add it to your .env file.');
  }

  const res = await fetch(
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
              { text: 'Please summarize the key information visible in this page from my lecture material.' },
              { inlineData: { mimeType, data: base64Data } },
            ],
          },
        ],
        generationConfig: { temperature: 0.3 },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const summary: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof summary !== 'string' || !summary.trim()) {
    throw new Error('Gemini returned an empty response. Please try again.');
  }
  return summary;
}
