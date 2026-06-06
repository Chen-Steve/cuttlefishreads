import OpenAI from "openai";

export type TranslateInput = {
  /** Source-language chapter title. */
  title: string;
  /** Source-language paragraphs in reading order. */
  paragraphs: string[];
  /** Target language, e.g. "English". */
  targetLanguage: string;
  /** API key. Falls back to GEMINI_API_KEY / GOOGLE_API_KEY when omitted. */
  apiKey?: string;
  /** Model id. Defaults to DEFAULT_MODEL. */
  model?: string;
};

export type TranslateResult = {
  title: string;
  /** Translated body as a single string, paragraphs separated by blank lines. */
  content: string;
};

// Backed by Gemini via its OpenAI-compatible endpoint, so we can reuse the
// `openai` client. To move to a different provider later, swap this module's
// body — callers only depend on translateChapter().
export const DEFAULT_MODEL = "gemini-2.5-flash";

const GEMINI_OPENAI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

const PARA_SEP = "\n\n";

function buildPrompt(input: TranslateInput): string {
  const body = input.paragraphs.join(PARA_SEP);
  return [
    `Translate the following web novel chapter into ${input.targetLanguage}.`,
    "",
    "Rules:",
    "- Produce a fluent, natural literary translation, not a literal one.",
    "- Preserve the original paragraph breaks exactly (one blank line between paragraphs).",
    "- Keep names, honorifics, and game-system/status-window text consistent.",
    "- Do not add notes, summaries, or commentary of your own.",
    '- Return ONLY a JSON object of the form {"title": "...", "body": "..."}.',
    '- In "body", separate paragraphs with a single blank line (\\n\\n).',
    "",
    `TITLE: ${input.title}`,
    "",
    "CHAPTER:",
    body,
  ].join("\n");
}

/** Pull a JSON object out of a model response, tolerating ```json fences. */
function parseJsonResponse(raw: string): { title?: unknown; body?: unknown } {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  try {
    return JSON.parse(text);
  } catch {
    // Last resort: grab the first {...} block.
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    throw new Error("Translation model returned invalid JSON.");
  }
}

/**
 * Translates a single chapter. Provider-agnostic from the caller's point of
 * view — currently backed by Google Gemini (OpenAI-compatible API).
 */
export async function translateChapter(
  input: TranslateInput,
): Promise<TranslateResult> {
  const apiKey =
    input.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No translation API key provided. Enter a Gemini API key or set GEMINI_API_KEY.",
    );
  }

  const client = new OpenAI({ apiKey, baseURL: GEMINI_OPENAI_BASE_URL });
  const model = input.model || DEFAULT_MODEL;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an expert literary translator who localizes Chinese web novels into natural, idiomatic prose while preserving structure.",
      },
      { role: "user", content: buildPrompt(input) },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("Translation model returned an empty response.");
  }

  const parsed = parseJsonResponse(raw);

  const title =
    typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim()
      : input.title;
  const content = typeof parsed.body === "string" ? parsed.body.trim() : "";

  if (!content) {
    throw new Error("Translation model returned no chapter body.");
  }

  return { title, content };
}
