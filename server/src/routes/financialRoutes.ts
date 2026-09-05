import { Router } from "express";
import {
    createExpense,
    backfillIncomeFromPayments,
    getAllFinancialRecords,
    updateExpense,
} from "../controllers/financialController";
import {
    authenticateToken,
    authorizeRole,
} from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticateToken, authorizeRole(["ADMIN", "OPERATOR"]));

// GET /api/admin/financial - Lihat semua data keuangan
router.get("/", getAllFinancialRecords);

// POST /api/admin/financial/backfill-income - Tambah pemasukan dari pembayaran yang belum tercatat
router.post(
    "/backfill-income",
    authorizeRole(["ADMIN"]),
    backfillIncomeFromPayments,
);

// POST /api/admin/financial/expenses - Tambah data pengeluaran baru
router.post("/expenses", createExpense);

// PUT /api/admin/financial/expenses/:id - Edit data pengeluaran
router.put("/expenses/:id", updateExpense);

export default router;
