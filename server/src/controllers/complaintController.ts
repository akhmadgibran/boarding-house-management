import { Request, Response } from "express";
import { prisma } from "../utils/db";
import {
    Role,
    AssetStatus,
    ComplaintStatus,
    ComplaintCategory,
    MaintenanceStatus,
} from "@prisma/client";

// Occupant: Mendapatkan aset di kamarnya
export const getOccupantAssets = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const occupantId = (req as any).user?.userId;
        if (!occupantId)
            return res.status(401).json({ message: "Unauthorized." });

        const activeInvoice = await prisma.invoice.findFirst({
            where: {
                occupantId: occupantId,
                status: { not: "UNPAID" },
            },
            orderBy: {
                periodEnd: "desc",
            },
        });

        if (!activeInvoice) {
            return res
                .status(404)
                .json({
                    message: "No active room data for this user.",
                });
        }

        const roomId = activeInvoice.roomId;

        const assets = await prisma.asset.findMany({
            where: { roomId: roomId },
        });

        return res.status(200).json({ roomId, assets });
    } catch (error) {
        console.error("Gagal mengambil aset kamar:", error);
        return res
            .status(500)
            .json({ message: "Internal server error." });
    }
};

// Occupant: Mendapatkan daftar komplain miliknya
export const getOccupantComplaints = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const occupantId = (req as any).user?.userId;
        if (!occupantId)
            return res.status(401).json({ message: "Unauthorized." });

        const complaints = await prisma.complaint.findMany({
            where: { reportedById: occupantId },
            include: {
                asset: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json({ complaints });
    } catch (error) {
        console.error("Gagal mengambil daftar komplain pengguna:", error);
        return res
            .status(500)
            .json({ message: "Internal server error." });
    }
};

// Occupant: Mengajukan komplain
export const submitComplaint = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const occupantId = (req as any).user?.userId;
        if (!occupantId)
            return res.status(401).json({ message: "Unauthorized." });

        const { category, assetId, details } = req.body;

        if (!category || !details) {
            return res
                .status(400)
                .json({ message: "Category and details are required." });
        }

        if (category === ComplaintCategory.ASSET && !assetId) {
            return res
                .status(400)
                .json({
                    message: "Asset must be selected for asset-related complaints.",
                });
        }

        await prisma.$transaction(async (tx) => {
            // Jika kategori ASSET, validasi aset dan ubah status jadi BROKEN
            if (category === ComplaintCategory.ASSET) {
                const activeInvoice = await tx.invoice.findFirst({
                    where: {
                        occupantId: occupantId,
                        status: { not: "UNPAID" },
                    },
                    orderBy: { periodEnd: "desc" },
                });

                if (!activeInvoice) {
                    throw new Error("You do not have an active room.");
                }

                const asset = await tx.asset.findUnique({
                    where: { id: assetId },
                });
                if (!asset || asset.roomId !== activeInvoice.roomId) {
                    throw new Error("Asset not found in your room.");
                }

                if (asset.status !== AssetStatus.GOOD) {
                    throw new Error(
                        "Asset is currently under repair or already broken.",
                    );
                }

                await tx.asset.update({
                    where: { id: assetId },
                    data: { status: AssetStatus.BROKEN },
                });
            }

            // Buat komplain
            await tx.complaint.create({
                data: {
                    category,
                    detail: details,
                    status: ComplaintStatus.PENDING,
                    reportedById: occupantId,
                    assetId:
                        category === ComplaintCategory.ASSET ? assetId : null,
                },
            });
        });

        return res.status(201).json({ message: "Complaint successfully submitted." });
    } catch (error: any) {
        console.error("Gagal mengajukan komplain:", error);
        return res
            .status(400)
            .json({
                message: error.message || "Internal server error.",
            });
    }
};

// Admin/Operator: Mengambil semua komplain
export const getAllComplaints = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const { status, sort } = req.query;
        const whereClause: any = {};

        if (status && status !== "ALL") {
            whereClause.status = status as ComplaintStatus;
        }

        const orderByClause: any = {
            createdAt: sort === "asc" ? "asc" : "desc",
        };

        const complaints = await prisma.complaint.findMany({
            where: whereClause,
            include: {
                asset: {
                    include: {
                        room: { select: { name: true } },
                        assetMaster: { select: { name: true } },
                    },
                },
                reportedBy: {
                    select: {
                        email: true,
                        occupantDetails: { select: { name: true } },
                    },
                },
            },
            orderBy: orderByClause,
        });

        return res.status(200).json({ complaints });
    } catch (error: any) {
        console.error("Gagal mengambil daftar komplain:", error);
        return res
            .status(500)
            .json({ 
                message: "Internal server error.",
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
    }
};

// Admin/Operator: Mengubah status komplain
export const processComplaint = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const id = req.params.id as string;
        const { status, maintenanceDetails } = req.body; // PROCESSED atau RESOLVED

        if (
            ![ComplaintStatus.PROCESSED, ComplaintStatus.RESOLVED].includes(
                status,
            )
        ) {
            return res.status(400).json({ message: "Invalid status." });
        }

        const complaint = await prisma.complaint.findUnique({ where: { id } });
        if (!complaint)
            return res
                .status(404)
                .json({ message: "Complaint not found." });

        const isAssetComplaint =
            complaint.category === ComplaintCategory.ASSET &&
            Boolean(complaint.assetId);

        if (status === ComplaintStatus.PROCESSED && isAssetComplaint) {
            if (
                !maintenanceDetails ||
                typeof maintenanceDetails !== "string" ||
                maintenanceDetails.trim() === ""
            ) {
                return res
                    .status(400)
                    .json({
                        message:
                            "Maintenance details are required for asset complaints.",
                    });
            }
        }

        if (isAssetComplaint && !complaint.assetId) {
            return res
                .status(400)
                .json({ message: "Complaint asset not found." });
        }

        await prisma.$transaction(async (tx) => {
            await tx.complaint.update({
                where: { id },
                data: { status },
            });

            if (!isAssetComplaint || !complaint.assetId) {
                return;
            }

            if (status === ComplaintStatus.PROCESSED) {
                await tx.asset.update({
                    where: { id: complaint.assetId },
                    data: { status: AssetStatus.MAINTENANCE },
                });

                await tx.assetMaintenanceLog.create({
                    data: {
                        assetId: complaint.assetId,
                        details: maintenanceDetails.trim(),
                        status: MaintenanceStatus.PROCESS,
                    },
                });

                return;
            }

            if (status === ComplaintStatus.RESOLVED) {
                await tx.asset.update({
                    where: { id: complaint.assetId },
                    data: { status: AssetStatus.GOOD },
                });

                const latestLog = await tx.assetMaintenanceLog.findFirst({
                    where: {
                        assetId: complaint.assetId,
                        status: { not: MaintenanceStatus.FINISHED },
                    },
                    orderBy: { createdAt: "desc" },
                });

                if (latestLog) {
                    await tx.assetMaintenanceLog.update({
                        where: { id: latestLog.id },
                        data: { status: MaintenanceStatus.FINISHED },
                    });
                } else {
                    await tx.assetMaintenanceLog.create({
                        data: {
                            assetId: complaint.assetId,
                            details: "Selesai via komplain.",
                            status: MaintenanceStatus.FINISHED,
                        },
                    });
                }
            }
        });

        return res
            .status(200)
            .json({ message: `Complaint status changed to ${status}.` });
    } catch (error) {
        console.error("Gagal memproses komplain:", error);
        return res
            .status(500)
            .json({ message: "Internal server error." });
    }
};
