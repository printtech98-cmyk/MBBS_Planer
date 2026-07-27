import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT =
  "You are a study assistant helping a medical student understand their own lecture notes. " +
  "You will be given the full text of one of their notes and a question about it. " +
  "Answer using ONLY the information in the provided notes.\n" +
  "Rules:\n" +
  "- If the answer is clearly present in the notes, answer it accurately and concisely, in plain language suitable for exam revision, using short paragraphs or bullet points where helpful.\n" +
  "- If the notes don't contain enough information to answer the question, say so clearly and do not invent medical facts — instead suggest what part of the notes is related, or say the notes don't cover this topic. Never fabricate clinical or scientific information that isn't supported by the provided text.\n" +
  "- You may briefly rephrase or clarify a concept from the notes in simpler terms if asked, but do not introduce outside medical facts not present in the notes.\n" +
  "- Keep answers focused and exam-relevant. Avoid unnecessary repetition of the question.\n" +
  "- If the student's question is unrelated to the notes and not medical/academic (e.g. small talk), politely redirect them to ask about the note content.";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface AskNotesBody {
  noteContent?: string;
  question?: string;
  conversationHistory?: ChatTurn[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("AI_API_KEY");
    const baseUrl = Deno.env.get("AI_API_BASE_URL");
    const model = Deno.env.get("AI_API_MODEL") ?? "gemini-3.6-flash";

    if (!apiKey || !baseUrl || !model) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured. Set AI_API_KEY, AI_API_BASE_URL, and AI_API_MODEL secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as AskNotesBody;
    const noteContent = (body.noteContent ?? "").trim();
    const question = (body.question ?? "").trim();
    const history = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];

    if (!noteContent) {
      return new Response(
        JSON.stringify({ error: "Missing noteContent." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!question) {
      return new Response(
        JSON.stringify({ error: "Missing question." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const lastFour = history.slice(-4).map((t) => ({
      role: t.role === "assistant" ? "assistant" : "user",
      content: t.content,
    }));

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Here are my notes:\n\n${noteContent}` },
      ...lastFour,
      { role: "user", content: question },
    ];

    const endpoint = baseUrl.endsWith("/") ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;

    const aiRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.3 }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(
        JSON.stringify({ error: `AI provider error (${aiRes.status}): ${errText.slice(0, 300)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiRes.json();
    const answer: string | undefined = aiData?.choices?.[0]?.message?.content;

    if (typeof answer !== "string" || !answer.trim()) {
      return new Response(
        JSON.stringify({ error: "AI provider returned an empty response." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
