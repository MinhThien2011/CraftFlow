import { Router } from 'express';
import { getSystemLogs } from '../controllers/systemController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { ROLES } from '../utils/constants.js';
import { rolePermission } from '../middleware/rolePermission.js';

const systemRouter = Router();

// --- Admin Only Routes ---
systemRouter.use(jwtAuth);
systemRouter.use(rolePermission([ROLES.ADMIN]));

systemRouter.get('/logs', getSystemLogs);

export default systemRouter;
