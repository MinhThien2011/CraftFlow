import { Router } from 'express';
import { 
  getAllUsers, 
  getUserById,
  createUser, 
  updateUser, 
  deleteUser, 
  toggleUserStatus 
} from '../controllers/userController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const userRouter = Router();

// --- Private Routes (Logged in users) ---
userRouter.use(jwtAuth);

// Profile management
userRouter.patch('/profile/:id', updateUser);

// --- Admin Only Routes ---
userRouter.use(rolePermission([ROLES.ADMIN]));

userRouter.get('/', getAllUsers);
userRouter.get('/:id', getUserById);
userRouter.post('/', createUser);
userRouter.patch('/:id/status', toggleUserStatus);
userRouter.delete('/:id', deleteUser);

export default userRouter;
