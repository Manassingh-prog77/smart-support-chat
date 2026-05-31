export type Sender = 'user' | 'ai';

export type ChatMessage = {
  id: string;
  conversationId?: string;
  sender: Sender;
  text: string;
  createdAt: string;
  pending?: boolean;
};

export type ChatResponse = {
  reply: string;
  sessionId: string;
  degraded?: boolean;
  messages?: ChatMessage[];
};

export type HistoryResponse = {
  sessionId: string;
  messages: ChatMessage[];
};
