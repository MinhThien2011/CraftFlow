import { Router } from "express";
import { 
    changePassword, 
    getUserInfo, 
    login, 
    logout, 
    refreshPassword 
} from "../controllers/authController.js";
import { jwtAuth } from "../middleware/jwtAuth.js";
import { loginLimiter, strictLimiter } from "../middleware/rateLimit.js";

const authRouter = Router();

// Public Authentication
authRouter.post('/login', loginLimiter, login);
authRouter.post('/refresh-password', strictLimiter, refreshPassword);

// Authenticated Routes
authRouter.use(jwtAuth);

authRouter.get('/user', getUserInfo);
authRouter.post('/logout', logout);
authRouter.post('/change-password', strictLimiter, changePassword);

export default authRouter;
