export type Sender = 'user' | 'ai';

export type MessageRecord = {
  id: string;
  conversationId: string;
  sender: Sender;
  text: string;
  createdAt: string;
};

export type ConversationRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  metadata: string | null;
};
