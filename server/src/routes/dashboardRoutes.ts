import { Router } from "express";
import {
    getDashboardSummary,
    getOccupancySnapshots,
    triggerOccupancySnapshot,
    backfillOccupancySnapshotsHandler,
} from "../controllers/dashboardController";
import { authenticateToken, authorizeRole } from "../middlewares/authMiddleware";

const router = Router();

// GET  /api/admin/dashboard/summary — Ringkasan dashboard (ADMIN & OPERATOR)
router.get("/summary", authenticateToken, authorizeRole(["ADMIN", "OPERATOR"]), getDashboardSummary);

// GET  /api/admin/dashboard/occupancy-snapshots?year=YYYY — Ambil snapshot per tahun (ADMIN & OPERATOR)
router.get("/occupancy-snapshots", authenticateToken, authorizeRole(["ADMIN", "OPERATOR"]), getOccupancySnapshots);

// POST /api/admin/dashboard/occupancy-snapshots/trigger — Manual trigger snapshot (ADMIN only)
router.post("/occupancy-snapshots/trigger", authenticateToken, authorizeRole(["ADMIN"]), triggerOccupancySnapshot);

// POST /api/admin/dashboard/occupancy-snapshots/backfill — Backfill data historis (ADMIN only)
router.post("/occupancy-snapshots/backfill", authenticateToken, authorizeRole(["ADMIN"]), backfillOccupancySnapshotsHandler);

export default router;
