import { Router } from "express";
import authRouter from "./auth.routes.js";

const mainRouter = Router();

mainRouter.get('/',(req , res)=>{
    res.status(200).json({
        success: true,
        message: "Welcome to the Crab Flow API",
    })
})
mainRouter.use('/auth', authRouter);

export default mainRouter;
