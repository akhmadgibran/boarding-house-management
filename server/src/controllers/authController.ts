import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/db";

// mengambil kunci pas (secret) dari .env
const JWT_SECRET = process.env.JWT_SECRET || "default_rahasia";

export const login = async (req: Request, res: Response): Promise<any> => {
    try {
        // retrieve email and password from request
        const { email, password } = req.body;

        // 1. validate empty input
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required.",
            });
        }

        // 2. find user by email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        // 3. Jika user tidak ditemukan
        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        // 3a. Tolak login jika akun sudah dihapus (soft-deleted)
        if (user.deletedAt) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        // 4. Bandingkan password yang dikirim dengan hash didatabase
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res
                .status(401)
                .json({ message: "Invalid email or password." });
        }

        // 5. Buat token JWT (berlaku 1 hari)
        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
            },
            JWT_SECRET,
            { expiresIn: "1d" },
        );

        // 6. kirim response sukses
        res.status(200).json({
            message: "Login successful",
            token: token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Terjadi kesalahan saat login", error);
        res.status(500).json({
            message: "Internal server error.",
            error: error instanceof Error ? error.message : String(error),
            stack: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : undefined) : undefined
        });
    }
};

export const getMe = async (
    req: Request | any,
    res: Response,
): Promise<any> => {
    try {
        // req.user diisi oleh middleware auth (nantinya)
        const userId = req.user?.userId;
        if (!userId) {
            return res
                .status(401)
                .json({ message: "Access denied. Invalid token." });
        }
        // Ambil data user beserta detail profilnya
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                occupantDetails: true,
                operatorDetails: true,
            },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        // Jangan kirimkan password kembali ke klien
        const { password, ...userWithoutPassword } = user;
        res.status(200).json({ user: userWithoutPassword });
    } catch (error) {
        console.error("Terjadi kesalahan saat mengambil profil:", error);
        res.status(500).json({ 
            message: "Internal server error.",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
