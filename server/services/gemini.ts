import { env } from '../config/env.js';
import { spurKnowledge } from '../knowledge/spurKnowledge.js';
import type { Sender } from '../types.js';

type ChatMessage = {
  sender: Sender;
  text: string;
};

type GeminiContent = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_HISTORY_MESSAGES = 14;
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash'];

class GeminiRequestError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

const systemPrompt = `
You are Spur's AI support agent inside a website live chat widget.

Your job:
- Help prospects and customers understand Spur, its products, setup, pricing shape, integrations, and support paths.
- Be concise, specific, and warm. Sound like a practical support teammate, not a generic model.
- Keep most answers under 140 words and always finish the final sentence.
- Use short paragraphs or bullets when it makes the answer easier to scan.
- Render markdown normally when useful, but do not over-format.
- If the user asks something unrelated to Spur or customer engagement automation, politely decline in one sentence and offer to help with Spur topics.
- Do not answer general trivia, celebrity questions, medical/legal/financial advice, coding help, or unrelated research.
- Do not invent account-specific facts, private policies, exact refunds, or binding pricing. Route those to Spur support.
- If an issue needs a human, suggest support@spurnow.com, WhatsApp +91 95990 55272, or booking a demo.

Use this verified Spur context:
${spurKnowledge}
`.trim();

const roleFor = (sender: Sender): 'user' | 'model' => (sender === 'ai' ? 'model' : 'user');

const compactHistory = (messages: ChatMessage[]): GeminiContent[] => {
  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
  const contents: GeminiContent[] = [];

  for (const message of recentMessages) {
    const text = message.text.trim();
    if (!text) continue;

    const role = roleFor(message.sender);
    const previous = contents.at(-1);

    if (previous?.role === role) {
      previous.parts[0].text += `\n\n${text}`;
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  while (contents[0]?.role === 'model') {
    contents.shift();
  }

  return contents;
};

const extractReply = (payload: unknown): string => {
  const response = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text;
};

export const generateReply = async (history: ChatMessage[]) => {
  if (!env.geminiApiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const modelCandidates = Array.from(new Set([env.geminiModel, ...FALLBACK_MODELS].filter(Boolean)));
  let lastError: unknown;

  for (const model of modelCandidates) {
    try {
      return await requestGeminiModel(model, history);
    } catch (error) {
      lastError = error;

      const isModelAvailabilityError =
        error instanceof GeminiRequestError &&
        (error.status === 404 || (error.status === 400 && /not found|not supported/i.test(error.message)));

      if (!isModelAvailabilityError) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini request failed.');
};

const requestGeminiModel = async (model: string, history: ChatMessage[]) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.geminiApiKey
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: compactHistory(history),
          generationConfig: {
            topP: 0.9,
            maxOutputTokens: 900
          }
        })
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new GeminiRequestError(
        response.status,
        `Gemini request failed with ${response.status}: ${errorBody.slice(0, 300)}`
      );
    }

    return extractReply(await response.json());
  } finally {
    clearTimeout(timeout);
  }
};
