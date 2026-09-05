import { Request, Response } from "express";
import { prisma } from "../utils/db";

// GET /api/admin/asset-masters - Ambil semua Asset Master
export const getAllAssetMasters = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const assetMasters = await prisma.assetMaster.findMany({
            include: { _count: { select: { assets: true } } },
            orderBy: { name: "asc" },
        });
        return res.status(200).json({ assetMasters });
    } catch (error) {
        console.error("Gagal mengambil asset master:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// POST /api/admin/asset-masters - Buat Asset Master baru
export const createAssetMaster = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const { name } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({ message: "Field 'name' is required." });
        }

        const existing = await prisma.assetMaster.findFirst({
            where: { name: { equals: name.trim() } },
        });
        if (existing) {
            return res.status(409).json({ message: `Asset Master with name '${name}' already exists.` });
        }

        const assetMaster = await prisma.assetMaster.create({
            data: { name: name.trim() },
        });

        return res.status(201).json({ message: "Asset Master successfully created.", assetMaster });
    } catch (error) {
        console.error("Gagal membuat asset master:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// PUT /api/admin/asset-masters/:id - Update Asset Master
export const updateAssetMaster = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const id = req.params.id as string;
        const { name } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({ message: "Field 'name' is required." });
        }

        const existing = await prisma.assetMaster.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Asset Master not found." });
        }

        const updated = await prisma.assetMaster.update({
            where: { id },
            data: { name: name.trim() },
        });

        return res.status(200).json({ message: "Asset Master successfully updated.", assetMaster: updated });
    } catch (error) {
        console.error("Gagal memperbarui asset master:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// DELETE /api/admin/asset-masters/:id - Hapus Asset Master
export const deleteAssetMaster = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const id = req.params.id as string;

        const existing = await prisma.assetMaster.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Asset Master not found." });
        }

        const assetCount = await prisma.asset.count({ where: { assetMasterId: id } });
        if (assetCount > 0) {
            return res.status(409).json({
                message: `Cannot be deleted. This Asset Master is still used by ${assetCount} room assets.`,
            });
        }

        await prisma.assetMaster.delete({ where: { id } });

        return res.status(200).json({ message: "Asset Master successfully deleted." });
    } catch (error) {
        console.error("Gagal menghapus asset master:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
