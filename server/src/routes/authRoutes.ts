import { Router } from "express";
import { login, getMe } from "../controllers/authController";
import { authenticateToken } from "../middlewares/authMiddleware";
const router = Router();
// Endpoint Publik: Siapapun bisa mencoba login
router.post("/login", login);
// Endpoint Private: Hanya yang punya token valid (melewati authenticateToken) yang bisa lanjut ke getMe
router.get("/me", authenticateToken, getMe);
export default router;
