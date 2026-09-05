import cron from "node-cron";
import { prisma } from "./db";
import { PaymentStatus, ProfileStatus } from "@prisma/client";
import { upsertOccupancySnapshot } from "./occupancySnapshotService";
import { buildCurrentOccupancyWhere } from "./occupancyService";

// Fungsi utama yang bisa dipanggil manual atau via cron
export async function generateNextPeriodPayments(): Promise<number> {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const activeInvoices = await prisma.invoice.findMany({
        where: buildCurrentOccupancyWhere(now),
        include: {
            room: {
                select: {
                    id: true,
                    name: true,
                    price: true,
                },
            },
            occupant: {
                select: {
                    id: true,
                    email: true,
                    occupantDetails: { select: { status: true, name: true } },
                },
            },
        },
        orderBy: [{ roomId: "asc" }, { periodStart: "desc" }],
    });

    let createdCount = 0;

    for (const latestInvoice of activeInvoices) {
        // Pastikan tagihannya akan habis <= 3 hari lagi
        if (latestInvoice.periodEnd > threeDaysLater) continue;

        // Pastikan occupant masih aktif
        if (latestInvoice.occupant?.occupantDetails?.status !== ProfileStatus.ACTIVE) continue;

        // Hitung periode berikutnya: periodEnd lama = start periode baru (exclusive end convention)
        const nextPeriodStart = new Date(latestInvoice.periodEnd);

        const nextPeriodEnd = new Date(nextPeriodStart);
        nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

        // Cek apakah sudah ada invoice untuk periode berikutnya (hindari duplikat)
        const existing = await prisma.invoice.findFirst({
            where: {
                roomId: latestInvoice.roomId,
                occupantId: latestInvoice.occupantId,
                waitingForRoomVacant: false,
                periodStart: { lt: nextPeriodEnd },
                periodEnd: { gt: nextPeriodStart },
            },
        });

        if (existing) continue; // Sudah ada, skip

        // Buat tagihan baru
        await prisma.invoice.create({
            data: {
                roomId: latestInvoice.roomId,
                occupantId: latestInvoice.occupantId,
                priceApplied: latestInvoice.room?.price ?? 0,
                paidNominal: 0,
                periodStart: nextPeriodStart,
                periodEnd: nextPeriodEnd,
                status: PaymentStatus.UNPAID,
                note: "Tagihan otomatis (auto-generated)",
            },
        });

        createdCount++;
    }

    if (createdCount > 0) {
        console.log(
            `[PaymentScheduler] ${createdCount} tagihan baru berhasil di-generate pada ${now.toISOString()}`,
        );
    }

    return createdCount;
}

/**
 * Helper: Mendapatkan tahun dan bulan sebelumnya.
 */
function getPreviousMonth(): { year: number; month: number } {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed: 0 = Jan
    if (month === 0) {
        return { year: now.getFullYear() - 1, month: 12 };
    }
    return { year: now.getFullYear(), month };
}

// Inisialisasi Cron Job
export function startPaymentScheduler(): void {
    // Job 1: Cek & generate tagihan baru — setiap hari jam 00:00
    cron.schedule("0 0 * * *", async () => {
        console.log("[PaymentScheduler] Menjalankan pengecekan tagihan otomatis...");
        try {
            await generateNextPeriodPayments();
        } catch (error) {
            console.error("[PaymentScheduler] Error:", error);
        }
    });

    // Job 2: Snapshot okupansi bulan sebelumnya — setiap tanggal 1 jam 00:05
    cron.schedule("5 0 1 * *", async () => {
        const prev = getPreviousMonth();
        console.log(
            `[OccupancySnapshot] Merekam snapshot bulan ${prev.year}-${String(prev.month).padStart(2, "0")}...`,
        );
        try {
            await upsertOccupancySnapshot(prev.year, prev.month);
        } catch (error) {
            console.error("[OccupancySnapshot] Error saat snapshot otomatis:", error);
        }
    });

    console.log(
        "[Scheduler] Aktif. Job 1: tagihan (setiap hari 00:00) | Job 2: snapshot okupansi (tgl 1 00:05)",
    );
}
