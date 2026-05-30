import express from 'express';
import { handleChat } from '../controllers/chatController.js';
import { verifyToken } from '../middleware/auth.js';

const chatRouter = express.Router();

chatRouter.post('/', verifyToken, handleChat);
export default chatRouter;
