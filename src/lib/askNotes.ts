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
    let detail = '';
    try {
      const errBody = await res.json();
      if (errBody && typeof errBody === 'object' && typeof (errBody as { error?: unknown }).error === 'string') {
        detail = (errBody as { error: string }).error;
      }
    } catch {
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail || `The AI service returned an error (${res.status}). Please try again.`);
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
