import { Request, Response } from "express";
import { prisma } from "../utils/db";
import { listCurrentOccupancies } from "../utils/occupancyService";
import {
    upsertOccupancySnapshot,
    backfillOccupancySnapshots,
} from "../utils/occupancySnapshotService";

export const getDashboardSummary = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const now = new Date();
        const [totalRooms, currentOccupancies] = await Promise.all([
            prisma.room.count(),
            listCurrentOccupancies(prisma, now),
        ]);
        const occupiedRooms = new Set(currentOccupancies.map((item) => item.roomId)).size;
        const totalActiveTenants = new Set(
            currentOccupancies
                .map((item) => item.occupantId)
                .filter((occupantId): occupantId is string => Boolean(occupantId)),
        ).size;

        // 3. Hitung pendapatan bulan ini
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
        );

        const [monthlyIncomeRecords, totalIncomeRecords, totalExpenseRecords] =
            await Promise.all([
                prisma.financialRecord.aggregate({
                    where: {
                        type: "INCOME",
                        date: {
                            gte: startOfMonth,
                            lte: endOfMonth,
                        },
                    },
                    _sum: {
                        amount: true,
                    },
                }),
                prisma.financialRecord.aggregate({
                    where: { type: "INCOME" },
                    _sum: { amount: true },
                }),
                prisma.financialRecord.aggregate({
                    where: { type: "EXPENSE" },
                    _sum: { amount: true },
                }),
            ]);
        const monthlyIncome = monthlyIncomeRecords._sum.amount || 0;
        const endingBalance =
            (totalIncomeRecords._sum.amount || 0) -
            (totalExpenseRecords._sum.amount || 0);

        // 4. Hitung tagihan outstanding (belum dibayar / belum lunas)
        const unpaidInvoices = await prisma.invoice.findMany({
            where: { status: { not: "PAID" } },
            select: { priceApplied: true, paidNominal: true },
        });

        const totalOutstanding = unpaidInvoices.reduce((sum, inv) => {
            return sum + (inv.priceApplied - inv.paidNominal);
        }, 0);

        // 5. Ambil aktivitas terkini (5 pembayaran terakhir)
        const recentPaymentsData = await prisma.payment.findMany({
            take: 5,
            orderBy: { paymentDate: "desc" },
            include: {
                occupant: {
                    include: { occupantDetails: true },
                },
            },
        });

        const recentActivities = recentPaymentsData.map((payment) => ({
            id: payment.id,
            tenantName: payment.occupant.occupantDetails?.name || "Unknown",
            amount: payment.amount,
            date: payment.paymentDate,
            method: payment.paymentMethod,
            type: "PAYMENT",
        }));

        return res.status(200).json({
            summary: {
                totalRooms,
                occupiedRooms,
                totalActiveTenants,
                monthlyIncome,
                totalOutstanding,
                endingBalance,
            },
            recentActivities,
        });
    } catch (error) {
        console.error("Gagal mengambil dashboard summary:", error);
        return res
            .status(500)
            .json({
                message:
                    "Internal server error while loading dashboard data.",
            });
    }
};

/**
 * GET /api/admin/dashboard/occupancy-snapshots?year=2025
 * Mengembalikan array 12 elemen snapshot per bulan untuk tahun tertentu.
 * Bulan yang belum ada snapshot-nya akan diisi null.
 */
export const getOccupancySnapshots = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const year = parseInt(req.query.year as string) || new Date().getFullYear();

        if (isNaN(year) || year < 2000 || year > 2100) {
            return res.status(400).json({ message: "Invalid 'year' parameter." });
        }

        const records = await prisma.roomOccupancySnapshot.findMany({
            where: { year },
            orderBy: { month: "asc" },
        });

        // Buat array 12 elemen (index 0 = Jan, index 11 = Des), null jika belum ada
        const snapshots: (typeof records[0] | null)[] = Array.from(
            { length: 12 },
            (_, i) => records.find((r) => r.month === i + 1) ?? null,
        );

        return res.status(200).json({ year, snapshots });
    } catch (error) {
        console.error("Gagal mengambil occupancy snapshots:", error);
        return res.status(500).json({
            message: "Error retrieving occupancy snapshot data.",
        });
    }
};

/**
 * POST /api/admin/dashboard/occupancy-snapshots/trigger
 * Body: { year?: number, month?: number }
 * Trigger manual snapshot untuk bulan tertentu (default: bulan ini).
 */
export const triggerOccupancySnapshot = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const now = new Date();
        const year = parseInt(req.body.year) || now.getFullYear();
        const month = parseInt(req.body.month) || now.getMonth() + 1;

        if (isNaN(year) || year < 2000 || year > 2100) {
            return res.status(400).json({ message: "Invalid 'year' parameter." });
        }
        if (isNaN(month) || month < 1 || month > 12) {
            return res.status(400).json({ message: "Parameter 'month' must be between 1-12." });
        }

        const snapshot = await upsertOccupancySnapshot(year, month);

        return res.status(200).json({
            message: `Snapshot for month ${year}-${String(month).padStart(2, "0")} successfully recorded.`,
            snapshot,
        });
    } catch (error) {
        console.error("Gagal trigger occupancy snapshot:", error);
        return res.status(500).json({
            message: "Error recording occupancy snapshot.",
        });
    }
};

/**
 * POST /api/admin/dashboard/occupancy-snapshots/backfill
 * Body: { fromYear?: number }
 * Backfill seluruh data historis dari fromYear sampai bulan lalu.
 */
export const backfillOccupancySnapshotsHandler = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const fromYear = parseInt(req.body.fromYear) || 2024;

        if (isNaN(fromYear) || fromYear < 2000 || fromYear > new Date().getFullYear()) {
            return res.status(400).json({ message: "Invalid 'fromYear' parameter." });
        }

        const result = await backfillOccupancySnapshots(fromYear);

        return res.status(200).json({
            message: `Backfill complete. ${result.processed} months successfully processed.`,
            ...result,
        });
    } catch (error) {
        console.error("Gagal backfill occupancy snapshots:", error);
        return res.status(500).json({
            message: "Error during occupancy snapshot backfill.",
        });
    }
};
