import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// TODO: Need to generate jwt for the default
const JWT_SECRET = process.env.JWT_SECRET || "default_rahasia";

// Middleware 1: Satpam Pengecek Tiket (Token JWT)
export const authenticateToken = (
    req: Request | any,
    res: Response,
    next: NextFunction,
): any => {
    // Cari token di header tipe "Authorization" dengan format: "Bearer <token_disini>"
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res
            .status(401)
            .json({ message: "Access denied. Token not found." });
    }

    try {
        // Dekripsi isi token menggunakan rahasia kita
        const decoded = jwt.verify(token, JWT_SECRET);

        // Simpan data (userId & role) hasil dekripsi ke req.user agar bisa dibaca fungsi berikutnya
        req.user = decoded;

        // Persilakan masuk ke proses selanjutnya
        next();
    } catch (error) {
        return res.status(403).json({
            message: "Session is invalid or has expired (Invalid Token).",
        });
    }
};

// Middleware 2: Pengecek Hak Akses (Role Base Access)
// Fungsi ini menerima array roles (misal: ["ADMIN", "OPERATOR"])
export const authorizeRole = (allowedRoles: string[]) => {
    return (req: Request | any, res: Response, next: NextFunction): any => {
        // Cek apakah role dari user yang login (diambil dari token) ada di dalam daftar yang diizinkan
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "You do not have access rights (role) for this action.",
            });
        }
        next();
    };
};
