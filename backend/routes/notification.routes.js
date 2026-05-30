import { Router } from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';

const notificationRouter = Router();

notificationRouter.use(jwtAuth);

notificationRouter.get('/', notificationController.getMyNotifications);
notificationRouter.patch('/:id/read', notificationController.markRead);
notificationRouter.patch('/read-all', notificationController.markAllRead);

export default notificationRouter;
