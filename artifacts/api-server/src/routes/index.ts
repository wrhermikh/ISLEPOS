import { Router, type IRouter } from "express";
import authRouter from "./auth";
import healthRouter from "./health";
import staffRouter from "./staff";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(staffRouter);

export default router;
