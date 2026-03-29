import { Router } from "express";
import { login } from "../controllers/authController.js";

const authRouter = Router();

authRouter.get('/',(req , res)=>{
    res.status(200).json({
        success: true,
        message: "Welcome to the Crab Flow Auth API",
    })
})

authRouter.get('/login', login);

export default authRouter;