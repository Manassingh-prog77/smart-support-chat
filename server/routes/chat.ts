import { Router } from 'express';
import { createChatReply, getConversationHistory } from '../services/chatService.js';

export const chatRouter = Router();

chatRouter.post('/message', async (request, response, next) => {
  try {
    response.json(await createChatReply(request.body));
  } catch (error) {
    next(error);
  }
});

chatRouter.get('/history/:sessionId', (request, response, next) => {
  try {
    response.json(getConversationHistory(request.params.sessionId));
  } catch (error) {
    next(error);
  }
});
