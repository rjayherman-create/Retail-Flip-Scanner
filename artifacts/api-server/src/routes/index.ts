import { Router, type IRouter } from "express";
import healthRouter from "./health";
import inventoryRouter from "./inventory";
import watchlistRouter from "./watchlist";
import scanRouter from "./scan";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(inventoryRouter);
router.use(watchlistRouter);
router.use(scanRouter);
router.use(dashboardRouter);

export default router;
