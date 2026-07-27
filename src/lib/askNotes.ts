export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface AskNotesResponse {
  answer: string;
}

export async function askAboutNote(
  noteContent: string,
  question: string,
  conversationHistory: ChatTurn[],
): Promise<string> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-notes`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };

  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ noteContent, question, conversationHistory }),
    });
  } catch {
    throw new Error('Could not reach the AI service. Please check your connection and try again.');
  }

  if (!res.ok) {
    throw new Error(`The AI service returned an error (${res.status}). Please try again.`);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error('The AI service returned an unexpected response. Please try again.');
  }

  if (!data || typeof data !== 'object' || typeof (data as AskNotesResponse).answer !== 'string') {
    throw new Error('The AI service returned an unexpected response. Please try again.');
  }

  return (data as AskNotesResponse).answer;
}
