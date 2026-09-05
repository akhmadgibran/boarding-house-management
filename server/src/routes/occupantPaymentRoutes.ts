import { Router } from "express";
import {
    getMyInvoices,
    getMyPaymentTransactions,
} from "../controllers/paymentController";
import { authenticateToken, authorizeRole } from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticateToken, authorizeRole(["OCCUPANT"]));

router.get("/", getMyInvoices);
router.get("/transactions", getMyPaymentTransactions);

export default router;
