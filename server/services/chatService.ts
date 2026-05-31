import { z } from 'zod';
import { conversationStore, messageStore } from '../db/database.js';
import { generateReply } from './gemini.js';
import { HttpError } from '../utils/httpError.js';

export const MAX_MESSAGE_CHARS = 2000;

const messageSchema = z.object({
  message: z.string().max(MAX_MESSAGE_CHARS),
  sessionId: z.string().uuid().optional()
});

const cleanMessage = (value: string) => value.replace(/\s+/g, ' ').trim();

const fallbackReply =
  "I'm having trouble reaching the AI service right now. Please try again in a moment, or reach Spur at support@spurnow.com / WhatsApp +91 95990 55272 if it is urgent.";

export const createChatReply = async (payload: unknown) => {
  const parsed = messageSchema.safeParse(payload);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path.includes('message') && issue.code === 'too_big') {
      throw new HttpError(
        413,
        'message_too_long',
        `Please keep messages under ${MAX_MESSAGE_CHARS} characters.`
      );
    }
    throw new HttpError(400, 'invalid_request', 'Send a message as plain text.');
  }

  const text = cleanMessage(parsed.data.message);
  if (!text) {
    throw new HttpError(400, 'empty_message', 'Type a message before sending.');
  }

  const conversation = conversationStore.getOrCreate(parsed.data.sessionId);
  const userMessage = messageStore.insert(conversation.id, 'user', text);
  const history = messageStore.recent(conversation.id, 16);

  let degraded = false;
  let reply: string;

  try {
    reply = await generateReply(history);
  } catch (error) {
    degraded = true;
    console.error('[llm]', error instanceof Error ? error.message : error);
    reply = fallbackReply;
  }

  const aiMessage = messageStore.insert(conversation.id, 'ai', reply);

  return {
    reply,
    sessionId: conversation.id,
    degraded,
    messages: [userMessage, aiMessage]
  };
};

export const getConversationHistory = (sessionId: string) => {
  if (!z.string().uuid().safeParse(sessionId).success) {
    throw new HttpError(400, 'invalid_session', 'This chat session is not valid.');
  }

  const conversation = conversationStore.find(sessionId);
  if (!conversation) {
    throw new HttpError(404, 'session_not_found', 'This chat session was not found.');
  }

  return {
    sessionId: conversation.id,
    messages: messageStore.list(conversation.id)
  };
};
