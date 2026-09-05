import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../utils/db";
import {
    Prisma,
    Role,
    ProfileStatus,
    OccupantOccupation,
} from "@prisma/client";
import {
    buildCurrentOccupancyWhere,
    recalculateRoomProjection,
    releaseCurrentOccupancyForOccupant,
} from "../utils/occupancyService";

function parseOptionalDate(
    value: unknown,
    fieldName: string,
): Date | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (value === null || value === "") {
        return null;
    }

    if (typeof value !== "string") {
        throw new Error(`Field \'${fieldName}\' must be a date.`);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Field \'${fieldName}\' is invalid.`);
    }

    return date;
}

async function cleanupUnpaidFutureInvoices(
    tx: Prisma.TransactionClient,
    occupantId: string,
    now: Date,
) {
    await tx.invoice.deleteMany({
        where: {
            occupantId,
            status: "UNPAID",
            invoicePayments: { none: {} },
            OR: [
                { waitingForRoomVacant: true },
                { periodStart: { gt: now } },
            ],
        },
    });
}

// Admin: Membuat user Operator baru
export const createOperator = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const { email, password, name, phoneNumber, address } = req.body;

        // Validasi field wajib
        if (!email || !password || !name || !phoneNumber || !address) {
            return res.status(400).json({
                message:
                    "All fields (email, password, name, phoneNumber, address) are required.",
            });
        }

        // Cek apakah email sudah dipakai
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: "Email is already registered." });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                password: passwordHash,
                role: Role.OPERATOR,
                operatorDetails: {
                    create: {
                        name,
                        phoneNumber,
                        address,
                        status: ProfileStatus.ACTIVE,
                    },
                },
            },
            include: { operatorDetails: true },
        });

        const { password: _, ...userWithoutPassword } = newUser;
        return res.status(201).json({
            message: "Operator successfully created.",
            user: userWithoutPassword,
        });
    } catch (error) {
        console.error("Gagal membuat operator:", error);
        return res
            .status(500)
            .json({ message: "Internal server error." });
    }
};

// Admin: Membuat user Occupant baru
export const createOccupant = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const {
            email,
            password,
            name,
            phoneNumber,
            address,
            occupation,
            moveInDate,
            moveOutDate,
        } = req.body;

        // Validasi field wajib
        if (
            !email ||
            !password ||
            !name ||
            !phoneNumber ||
            !address ||
            !occupation
        ) {
            return res.status(400).json({
                message:
                    "All fields (email, password, name, phoneNumber, address, occupation) are required.",
            });
        }

        // Validasi nilai occupation
        if (!Object.values(OccupantOccupation).includes(occupation)) {
            return res.status(400).json({
                message: `Invalid occupation. Accepted values: ${Object.values(OccupantOccupation).join(", ")}`,
            });
        }

        // Cek apakah email sudah dipakai
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: "Email is already registered." });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        let parsedMoveInDate: Date | null | undefined;
        let parsedMoveOutDate: Date | null | undefined;

        try {
            parsedMoveInDate = parseOptionalDate(moveInDate, "moveInDate");
            parsedMoveOutDate = parseOptionalDate(moveOutDate, "moveOutDate");
        } catch (parseError) {
            const message =
                parseError instanceof Error
                    ? parseError.message
                    : "Invalid date field.";
            return res.status(400).json({ message });
        }

        const newUser = await prisma.user.create({
            data: {
                email,
                password: passwordHash,
                role: Role.OCCUPANT,
                occupantDetails: {
                    create: {
                        name,
                        phoneNumber,
                        address,
                        occupation: occupation as OccupantOccupation,
                        status: ProfileStatus.ACTIVE,
                        ...(parsedMoveInDate !== undefined && {
                            moveInDate: parsedMoveInDate,
                        }),
                        ...(parsedMoveOutDate !== undefined && {
                            moveOutDate: parsedMoveOutDate,
                        }),
                    },
                },
            },
            include: { occupantDetails: true },
        });

        const { password: _, ...userWithoutPassword } = newUser;
        return res.status(201).json({
            message: "Occupant successfully created.",
            user: userWithoutPassword,
        });
    } catch (error) {
        console.error("Gagal membuat occupant:", error);
        return res
            .status(500)
            .json({ message: "Internal server error." });
    }
};

// Admin: Mendapatkan daftar semua User (hanya yang belum soft-deleted)
export const getAllUsers = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const users = await prisma.user.findMany({
            where: { deletedAt: null }, // filter soft-deleted
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                occupantDetails: true,
                operatorDetails: true,
                invoices: {
                    where: { waitingForRoomVacant: true },
                    select: { id: true },
                    take: 1,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return res.status(200).json({ users });
    } catch (error) {
        console.error("Gagal mengambil daftar user:", error);
        return res
            .status(500)
            .json({ message: "Internal server error." });
    }
};

// Admin: Mengedit user Operator
export const updateOperator = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const id = req.params.id as string;
        const { email, password, name, phoneNumber, address, status } =
            req.body;

        const user = await prisma.user.findUnique({
            where: { id },
            include: { operatorDetails: true },
        });

        if (!user || user.role !== Role.OPERATOR) {
            return res
                .status(404)
                .json({ message: "Operator not found." });
        }

        const updateData: any = {
            ...(email && { email }),
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                ...updateData,
                operatorDetails: {
                    update: {
                        ...(name && { name }),
                        ...(phoneNumber && { phoneNumber }),
                        ...(address && { address }),
                        ...(status && { status }),
                    },
                },
            },
            include: { operatorDetails: true },
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        return res
            .status(200)
            .json({
                message: "Operator successfully updated.",
                user: userWithoutPassword,
            });
    } catch (error) {
        console.error("Gagal mengupdate operator:", error);
        return res
            .status(500)
            .json({ message: "Internal server error." });
    }
};

// Admin: Mengedit user Occupant
export const updateOccupant = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const id = req.params.id as string;
        const {
            email,
            password,
            name,
            phoneNumber,
            address,
            occupation,
            status,
            moveInDate,
            moveOutDate,
        } = req.body;

        const user = await prisma.user.findUnique({
            where: { id },
            include: { occupantDetails: true },
        });

        if (!user || user.role !== Role.OCCUPANT) {
            return res
                .status(404)
                .json({ message: "Occupant not found." });
        }

        const updateData: any = {
            ...(email && { email }),
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        if (
            occupation &&
            !Object.values(OccupantOccupation).includes(occupation)
        ) {
            return res.status(400).json({
                message: `Invalid occupation. Accepted values: ${Object.values(OccupantOccupation).join(", ")}`,
            });
        }

        let parsedMoveInDate: Date | null | undefined;
        let parsedMoveOutDate: Date | null | undefined;

        try {
            parsedMoveInDate = parseOptionalDate(moveInDate, "moveInDate");
            parsedMoveOutDate = parseOptionalDate(moveOutDate, "moveOutDate");
        } catch (parseError) {
            const message =
                parseError instanceof Error
                    ? parseError.message
                    : "Invalid date field.";
            return res.status(400).json({ message });
        }

        // Cek apakah status berubah menjadi DEACTIVE
        const isBeingDeactivated =
            status === ProfileStatus.DEACTIVE &&
            user.occupantDetails?.status !== ProfileStatus.DEACTIVE;

        // Cek apakah status berubah dari DEACTIVE ke ACTIVE
        const isBeingReactivated =
            status === ProfileStatus.ACTIVE &&
            user.occupantDetails?.status === ProfileStatus.DEACTIVE;

        const updatedUser = await prisma.$transaction(async (tx) => {
            const updated = await tx.user.update({
                where: { id },
                data: {
                    ...updateData,
                    occupantDetails: {
                        update: {
                            ...(name && { name }),
                            ...(phoneNumber && { phoneNumber }),
                            ...(address && { address }),
                            ...(occupation && {
                                occupation: occupation as OccupantOccupation,
                            }),
                            ...(status && { status }),
                            ...(parsedMoveInDate !== undefined && {
                                moveInDate: parsedMoveInDate,
                            }),
                            ...(parsedMoveOutDate !== undefined && {
                                moveOutDate: parsedMoveOutDate,
                            }),
                        },
                    },
                },
                include: { occupantDetails: true },
            });

            // Jika occupant dinonaktifkan, lepaskan relasi kamar + bersihkan tagihan
            if (isBeingDeactivated) {
                const now = new Date();
                await releaseCurrentOccupancyForOccupant(tx, id, now);
                await cleanupUnpaidFutureInvoices(tx, id, now);
            }

            // Jika occupant diaktifkan kembali, kembalikan relasi kamar
            if (isBeingReactivated) {
                const now = new Date();
                const activeInvoices = await tx.invoice.findMany({
                    where: {
                        occupantId: id,
                        ...buildCurrentOccupancyWhere(now),
                    },
                    select: { roomId: true },
                });

                const roomIds = [
                    ...new Set(activeInvoices.map((inv) => inv.roomId)),
                ];

                if (roomIds.length > 0) {
                    for (const roomId of roomIds) {
                        await recalculateRoomProjection(tx, roomId, now);
                    }
                }
            }

            return updated;
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        return res
            .status(200)
            .json({
                message: "Occupant successfully updated.",
                user: userWithoutPassword,
            });
    } catch (error) {
        console.error("Gagal mengupdate occupant:", error);
        return res
            .status(500)
            .json({ message: "Internal server error." });
    }
};

// Admin: Soft-delete user (data invoice/payment tetap aman)
export const deleteUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = req.params.id as string;

        const user = await prisma.user.findUnique({
            where: { id },
            include: { occupantDetails: true, operatorDetails: true },
        });

        if (!user || user.deletedAt) {
            return res.status(404).json({ message: "User not found." });
        }

        // Tidak boleh menghapus akun ADMIN
        if (user.role === Role.ADMIN) {
            return res
                .status(403)
                .json({ message: "Admin account cannot be deleted." });
        }

        // OPERATOR hanya boleh soft-delete OCCUPANT
        const reqUser = (req as any).user;
        if (reqUser?.role === Role.OPERATOR && user.role !== Role.OCCUPANT) {
            return res
                .status(403)
                .json({
                    message:
                        "Operators can only delete occupant data.",
                });
        }

        const now = new Date();

        await prisma.$transaction(async (tx) => {
            if (user.role === Role.OCCUPANT) {
                await releaseCurrentOccupancyForOccupant(tx, id, now);
                await cleanupUnpaidFutureInvoices(tx, id, now);
                await tx.occupantDetails.update({
                    where: { userId: id },
                    data: {
                        status: ProfileStatus.DEACTIVE,
                        moveOutDate: now,
                    },
                });
            } else if (user.role === Role.OPERATOR) {
                // Nonaktifkan profil operator
                await tx.operatorDetails.update({
                    where: { userId: id },
                    data: { status: ProfileStatus.DEACTIVE },
                });
            }

            // Soft-delete: tandai deletedAt
            await tx.user.update({
                where: { id },
                data: { deletedAt: now },
            });
        });

        return res.status(200).json({ message: "User successfully deleted." });
    } catch (error) {
        console.error("Gagal menghapus user:", error);
        return res
            .status(500)
            .json({ message: "Internal server error." });
    }
};
