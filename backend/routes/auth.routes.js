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

authRouter.post('/login', loginLimiter, login);

authRouter.use(jwtAuth);

authRouter.get('/user', strictLimiter, getUserInfo);
authRouter.post('/logout', logout);
authRouter.post('/change-password', strictLimiter, changePassword);
authRouter.post('/refresh-password', strictLimiter, refreshPassword);

export default authRouter;
