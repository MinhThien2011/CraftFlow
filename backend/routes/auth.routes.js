import { Router } from "express";
import { changePassword, getUserInfo, login, logout, refreshPassword } from "../controllers/authController.js";
import { jwtAuth } from "../middleware/jwtAuth.js";
import { loginLimiter, strictLimiter } from "../middleware/rateLimit.js";

const authRouter = Router();

authRouter.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to the Crab Flow Auth API",
    })
})

authRouter.post('/login', loginLimiter, login);
authRouter.get('/user', jwtAuth, getUserInfo);
authRouter.post('/refresh-password', strictLimiter, refreshPassword);
authRouter.post('/change-password', jwtAuth, strictLimiter, changePassword);
authRouter.post('/logout', jwtAuth, logout);

export default authRouter;