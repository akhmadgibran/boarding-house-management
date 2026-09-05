import { prisma } from "./db";

/**
 * Menghitung jumlah kamar yang terisi pada akhir bulan tertentu.
 * Logika: kamar dianggap terisi jika ada Invoice aktif yang:
 *   - periodStart <= hari_terakhir_bulan
 *   - periodEnd   >= hari_terakhir_bulan
 *   - waitingForRoomVacant = false
 *   - occupantId IS NOT NULL
 */
export async function computeOccupiedRoomsForMonth(
    year: number,
    month: number, // 1–12
): Promise<{
    occupiedRooms: number;
    totalRooms: number;
    snapshotDate: Date;
}> {
    // Hari terakhir bulan tersebut (jam 23:59:59 UTC)
    const lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const [activeInvoices, totalRooms] = await Promise.all([
        prisma.invoice.findMany({
            where: {
                occupantId: { not: null },
                waitingForRoomVacant: false,
                periodStart: { lte: lastDay },
                periodEnd: { gte: lastDay },
            },
            select: { roomId: true },
        }),
        prisma.room.count(),
    ]);

    // Distinct roomId dari invoice aktif
    const occupiedRoomIds = new Set(activeInvoices.map((inv) => inv.roomId));

    return {
        occupiedRooms: occupiedRoomIds.size,
        totalRooms,
        snapshotDate: lastDay,
    };
}

/**
 * Hitung dan simpan (upsert) snapshot okupansi untuk satu bulan.
 * Aman dipanggil berulang kali — akan update data jika sudah ada.
 */
export async function upsertOccupancySnapshot(
    year: number,
    month: number, // 1–12
) {
    const computed = await computeOccupiedRoomsForMonth(year, month);

    const snapshot = await prisma.roomOccupancySnapshot.upsert({
        where: { year_month: { year, month } },
        update: {
            occupiedRooms: computed.occupiedRooms,
            totalRooms: computed.totalRooms,
            snapshotDate: computed.snapshotDate,
        },
        create: {
            year,
            month,
            occupiedRooms: computed.occupiedRooms,
            totalRooms: computed.totalRooms,
            snapshotDate: computed.snapshotDate,
        },
    });

    console.log(
        `[OccupancySnapshot] Upsert berhasil: ${year}-${String(month).padStart(2, "0")} → ${computed.occupiedRooms}/${computed.totalRooms} kamar terisi`,
    );

    return snapshot;
}

/**
 * Backfill snapshot untuk semua bulan dari fromYear sampai bulan lalu.
 * Aman dijalankan berulang kali (upsert).
 * @param fromYear Tahun awal backfill (default: 2024)
 */
export async function backfillOccupancySnapshots(fromYear = 2024): Promise<{
    processed: number;
    skipped: number;
    errors: { year: number; month: number; error: string }[];
}> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1–12

    let processed = 0;
    let skipped = 0;
    const errors: { year: number; month: number; error: string }[] = [];

    for (let y = fromYear; y <= currentYear; y++) {
        const maxMonth = y === currentYear ? currentMonth - 1 : 12;

        for (let m = 1; m <= maxMonth; m++) {
            try {
                await upsertOccupancySnapshot(y, m);
                processed++;
            } catch (err) {
                errors.push({
                    year: y,
                    month: m,
                    error: err instanceof Error ? err.message : String(err),
                });
                skipped++;
                console.error(
                    `[OccupancySnapshot] Gagal backfill ${y}-${m}:`,
                    err,
                );
            }
        }
    }

    console.log(
        `[OccupancySnapshot] Backfill selesai. Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors.length}`,
    );

    return { processed, skipped, errors };
}
