import { Router, Request, Response } from "express";
import {
    getAllInvoices,
    getInvoiceById,
    createInvoice,
    recordPaymentTransaction,
    updateInvoice,
    deleteInvoice,
    getAllPaymentTransactions,
} from "../controllers/paymentController";
import { generateNextPeriodPayments } from "../utils/paymentScheduler";
import { authenticateToken, authorizeRole } from "../middlewares/authMiddleware";

const router = Router();

// Semua route butuh token + role ADMIN atau OPERATOR
router.use(authenticateToken, authorizeRole(["ADMIN", "OPERATOR"]));

// GET    /api/admin/payments           - List semua invoice (query: ?status=UNPAID&roomId=x&occupantId=x)
router.get("/", getAllInvoices);

// GET    /api/admin/payments/transactions - List semua transaksi (pembayaran)
router.get("/transactions", getAllPaymentTransactions);

// POST   /api/admin/payments           - Buat tagihan manual
router.post("/", createInvoice);

// GET    /api/admin/payments/:id       - Detail 1 tagihan
router.get("/:id", getInvoiceById);

// PATCH  /api/admin/payments/transaction - Catat pembayaran (cicil / lunas) untuk banyak tagihan
router.post("/transaction", recordPaymentTransaction);

// PUT    /api/admin/payments/:id       - Edit invoice (koreksi status/note)
router.put("/:id", updateInvoice);

// DELETE /api/admin/payments/:id       - Hapus/batalkan tagihan
router.delete("/:id", deleteInvoice);

// POST   /api/admin/payments/generate  - Trigger manual auto-generate tagihan
router.post("/generate", async (req: Request, res: Response): Promise<any> => {
    try {
        const count = await generateNextPeriodPayments();
        return res.status(200).json({
            message: `${count} tagihan baru berhasil di-generate.`,
        });
    } catch (error) {
        console.error("Gagal generate tagihan:", error);
        return res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
});

export default router;
