import dotenv from "dotenv";
// Muat variable environment dari file .env
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import occupantPaymentRoutes from "./routes/occupantPaymentRoutes";
import financialRoutes from "./routes/financialRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import complaintRoutes from "./routes/complaintRoutes";
import { startPaymentScheduler } from "./utils/paymentScheduler";

const app = express();
const PORT = Number(process.env.PORT) || 5000;
console.log("CORS Origin Allowed:", process.env.CORS_ORIGIN);

app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // Pastikan OPTIONS diizinkan
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

// Middleware
app.use(helmet());
// !! OLD CORS, DIPINDAH KE ATAS DAN MODIFIKASI YANG BAGUS
// app.use(
//     cors({
//         origin: process.env.CORS_ORIGIN || "*",
//         credentials: true,
//     }),
// );
// !!!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Registrasi Custom Routes Start ---
app.use("/api/auth", authRoutes);
app.use("/api/admin/payments", paymentRoutes);
app.use("/api/occupant/payments", occupantPaymentRoutes);
app.use("/api/admin/financial", financialRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/admin", adminRoutes);
// --- Registrasi Custom Routes End ---

// Route Dasar (Health Check)
app.get("/", (req: Request, res: Response) => {
    res.send("API Backend Kost Project Berjalan Lancar! ");
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    startPaymentScheduler(); // Aktifkan auto-generate tagihan
});
