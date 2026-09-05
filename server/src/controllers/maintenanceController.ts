import { Request, Response } from "express";
import { prisma } from "../utils/db";
import { MaintenanceStatus, AssetStatus } from "@prisma/client";

// Get logs by assetId
export const getMaintenanceLogs = async (req: Request, res: Response): Promise<any> => {
    try {
        const assetId = String(req.params.assetId);

        const logs = await prisma.assetMaintenanceLog.findMany({
            where: { assetId: assetId },
            orderBy: { createdAt: "desc" },
        });

        // Get current asset status
        const asset = await prisma.asset.findUnique({
            where: { id: assetId },
            select: { status: true, name: true }
        });

        return res.status(200).json({ asset, logs });
    } catch (error) {
        console.error("Gagal mengambil log maintenance:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// Create a new log
export const createMaintenanceLog = async (req: Request, res: Response): Promise<any> => {
    try {
        const assetId = String(req.params.assetId);
        const { details, status, assetStatus } = req.body;

        if (!details || !status) {
            return res.status(400).json({ message: "Details and status are required." });
        }

        await prisma.$transaction(async (tx) => {
            await tx.assetMaintenanceLog.create({
                data: {
                    assetId: assetId,
                    details,
                    status: status as MaintenanceStatus
                }
            });

            if (assetStatus) {
                await tx.asset.update({
                    where: { id: assetId },
                    data: { status: assetStatus as AssetStatus }
                });
            }
        });

        return res.status(201).json({ message: "Maintenance log successfully added." });
    } catch (error) {
        console.error("Gagal membuat log maintenance:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// Update a log
export const updateMaintenanceLog = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = String(req.params.id);
        const { details, status, assetStatus, assetId } = req.body;

        await prisma.$transaction(async (tx) => {
            await tx.assetMaintenanceLog.update({
                where: { id: id },
                data: {
                    ...(details && { details }),
                    ...(status && { status: status as MaintenanceStatus })
                }
            });

            if (assetStatus && assetId) {
                await tx.asset.update({
                    where: { id: String(assetId) },
                    data: { status: assetStatus as AssetStatus }
                });
            }
        });

        return res.status(200).json({ message: "Maintenance log successfully updated." });
    } catch (error) {
        console.error("Gagal mengubah log maintenance:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// Delete a log
export const deleteMaintenanceLog = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = String(req.params.id);

        await prisma.assetMaintenanceLog.delete({
            where: { id: id }
        });

        return res.status(200).json({ message: "Maintenance log successfully deleted." });
    } catch (error) {
        console.error("Gagal menghapus log maintenance:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
