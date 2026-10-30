import { Router, type IRouter } from "express";
import authRouter from "./auth";
import healthRouter from "./health";
import productsRouter from "./products";
import salesRouter from "./sales";
import staffRouter from "./staff";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(staffRouter);
router.use(productsRouter);
router.use(salesRouter);

export default router;
