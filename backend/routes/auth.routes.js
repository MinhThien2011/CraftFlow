import { Router } from "express";
import { changePassword, getUserInfo, login, logout, refreshPassword } from "../controllers/authController.js";
import { jwtAuth } from "../middleware/jwtAuth.js";

const authRouter = Router();

authRouter.get('/',(req , res)=>{
    res.status(200).json({
        success: true,
        message: "Welcome to the Crab Flow Auth API",
    })
})

authRouter.post('/login', login);
authRouter.get('/user',jwtAuth, getUserInfo);
authRouter.post('/refresh-password', refreshPassword);
authRouter.post('/change-password', changePassword);
authRouter.post('/logout', logout);

export default authRouter;