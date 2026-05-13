import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus
} from '../controllers/userController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';
import { imageUploader } from '../middleware/cloudinary_uploader.js';

const userRouter = Router();

// --- General Access (Authenticated) ---
userRouter.use(jwtAuth);

// Profile management
userRouter.patch('/profile', imageUploader('avatars', 'avatar'), updateUser);

// --- Administrative Access (Admin Only) ---
userRouter.use(rolePermission([ROLES.ADMIN]));

userRouter.get('/', getAllUsers);
userRouter.get('/:id', getUserById);
userRouter.post('/', imageUploader('avatars', 'avatar'), createUser);
userRouter.patch('/:id/status', updateUserStatus);
userRouter.delete('/:id', deleteUser);

export default userRouter;
