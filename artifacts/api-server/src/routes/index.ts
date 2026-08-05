import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stripeRouter from "./stripe";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stripeRouter);
router.use(aiRouter);

export default router;
