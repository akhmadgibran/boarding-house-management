import { Router } from "express";
import { authenticateToken, authorizeRole } from "../middlewares/authMiddleware";
import { Role } from "@prisma/client";
import {
    getOccupantAssets,
    getOccupantComplaints,
    submitComplaint,
    getAllComplaints,
    processComplaint
} from "../controllers/complaintController";

const router = Router();

// Routes untuk Occupant
router.get("/my-assets", authenticateToken, authorizeRole([Role.OCCUPANT]), getOccupantAssets);
router.get("/my-complaints", authenticateToken, authorizeRole([Role.OCCUPANT]), getOccupantComplaints);
router.post("/", authenticateToken, authorizeRole([Role.OCCUPANT]), submitComplaint);

// Routes untuk Admin & Operator
router.get("/", authenticateToken, authorizeRole([Role.ADMIN, Role.OPERATOR]), getAllComplaints);
router.put("/:id/status", authenticateToken, authorizeRole([Role.ADMIN, Role.OPERATOR]), processComplaint);

export default router;
