import { type IRouter, Router } from "express";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);

export default router;
