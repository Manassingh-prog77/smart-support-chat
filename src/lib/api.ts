import type { ChatResponse, HistoryResponse } from './types';

const parseJson = async (response: Response) => {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.message ?? 'The chat service did not accept that request.';
    throw new Error(message);
  }

  return body;
};

export const sendChatMessage = async (message: string, sessionId?: string) => {
  const response = await fetch('/chat/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId })
  });

  return (await parseJson(response)) as ChatResponse;
};

export const fetchHistory = async (sessionId: string) => {
  const response = await fetch(`/chat/history/${sessionId}`);
  return (await parseJson(response)) as HistoryResponse;
};
