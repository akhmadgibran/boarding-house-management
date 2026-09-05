import { Request, Response } from "express";
import { prisma } from "../utils/db";
import { AssetStatus, PaymentMethod, RoomStatus } from "@prisma/client";
import {
    getCurrentOccupancyByRoomId,
    getCurrentOccupancyMapByRoomIds,
    releaseCurrentRoomOccupancy,
} from "../utils/occupancyService";

interface AssetInput {
    assetMasterId: string;
    name: string;
    details: string;
}

// GET /api/admin/rooms - Ambil semua Kamar beserta aset-asetnya
export const getAllRooms = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const now = new Date();
        const roomsWithAssets = await prisma.room.findMany({
            include: {
                assets: { include: { assetMaster: true } },
                _count: { select: { invoices: true } },
            },
            orderBy: { name: "asc" },
        });

        const roomIds = roomsWithAssets.map((room) => room.id);

        const invoicesWithPayments = roomIds.length > 0
            ? await prisma.invoice.findMany({
                where: { roomId: { in: roomIds } },
                select: {
                    roomId: true,
                    invoicePayments: { select: { paymentId: true } },
                },
            })
            : [];

        const paymentIdsByRoomId = new Map<string, Set<string>>();
        for (const invoice of invoicesWithPayments) {
            let roomPayments = paymentIdsByRoomId.get(invoice.roomId);
            if (!roomPayments) {
                roomPayments = new Set<string>();
                paymentIdsByRoomId.set(invoice.roomId, roomPayments);
            }

            for (const invoicePayment of invoice.invoicePayments) {
                if (invoicePayment.paymentId) {
                    roomPayments.add(invoicePayment.paymentId);
                }
            }
        }

        const occupancyByRoomId = await getCurrentOccupancyMapByRoomIds(
            prisma,
            roomIds,
            now,
        );

        const rooms = roomsWithAssets.map((room) => {
            const currentOccupancy = occupancyByRoomId.get(room.id) ?? null;
            const activeOccupant = currentOccupancy?.occupant
                ? {
                    id: currentOccupancy.occupant.id,
                    email: currentOccupancy.occupant.email,
                    name: currentOccupancy.occupant.occupantDetails?.name ?? null,
                }
                : null;

            const { _count, ...roomData } = room;

            const invoiceCount = _count?.invoices ?? 0;
            const transactionCount = paymentIdsByRoomId.get(room.id)?.size ?? 0;

            return {
                ...roomData,
                status: currentOccupancy ? RoomStatus.OCCUPIED : RoomStatus.VACANT,
                _count: {
                    payments: transactionCount,
                    invoices: invoiceCount,
                },
                activeOccupant,
            };
        });

        return res.status(200).json({ rooms });
    } catch (error) {
        console.error("Gagal mengambil daftar kamar:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// GET /api/admin/rooms/:id - Ambil detail satu Kamar
export const getRoomById = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const id = req.params.id as string;
        const room = await prisma.room.findUnique({
            where: { id },
            include: {
                assets: { include: { assetMaster: true, maintenanceLog: true } },
                invoices: {
                    select: {
                        id: true,
                        priceApplied: true,
                        paidNominal: true,
                        periodStart: true,
                        periodEnd: true,
                        status: true,
                        isDpReservation: true,
                        waitingForRoomVacant: true,
                        occupant: {
                            select: {
                                email: true,
                                occupantDetails: { select: { name: true } },
                            },
                        },
                        invoicePayments: {
                            select: {
                                payment: {
                                    select: {
                                        paymentDate: true,
                                        paymentMethod: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { periodStart: "desc" },
                },
            },
        });

        if (!room) {
            return res.status(404).json({ message: "Room not found." });
        }

        const payments = room.invoices.map((invoice) => {
            const latestPayment = invoice.invoicePayments.reduce<{
                paymentDate: Date;
                paymentMethod: PaymentMethod;
            } | null>((latest, invoicePayment) => {
                const payment = invoicePayment.payment;
                if (!latest || payment.paymentDate > latest.paymentDate) {
                    return payment;
                }

                return latest;
            }, null);

            const { invoicePayments, ...invoiceData } = invoice;

            return {
                ...invoiceData,
                paidDate: latestPayment?.paymentDate ?? null,
                paymentMethod: latestPayment?.paymentMethod ?? null,
            };
        });

        const currentOccupancy = await getCurrentOccupancyByRoomId(prisma, id, new Date());
        const { invoices, ...roomData } = room;

        return res.status(200).json({
            room: {
                ...roomData,
                status: currentOccupancy ? RoomStatus.OCCUPIED : RoomStatus.VACANT,
                payments,
            },
        });
    } catch (error) {
        console.error("Gagal mengambil detail kamar:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// POST /api/admin/rooms - Buat Kamar baru + assign aset dari Asset Master
export const createRoom = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const { name, price, assets } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({ message: "Room 'name' field is required." });
        }

        if (price === undefined || typeof price !== "number" || price <= 0) {
            return res.status(400).json({ message: "Field 'price' is required and must be a positive number." });
        }

        if (assets !== undefined && !Array.isArray(assets)) {
            return res.status(400).json({ message: "Field 'assets' must be an array." });
        }

        const assetList: AssetInput[] = Array.isArray(assets) ? assets : [];

        // Validasi setiap item aset
        for (const asset of assetList) {
            if (!asset.assetMasterId || !asset.name || !asset.details) {
                return res.status(400).json({
                    message: "Each asset must have 'assetMasterId', 'name', and 'details'.",
                });
            }
            const masterExists = await prisma.assetMaster.findUnique({
                where: { id: asset.assetMasterId },
            });
            if (!masterExists) {
                return res.status(404).json({
                    message: `Asset Master with id '${asset.assetMasterId}' not found.`,
                });
            }
        }

        // Fix TS2375: Gunakan spread operator agar 'assets' tidak pernah bernilai undefined secara eksplisit
        const room = await prisma.room.create({
            data: {
                name: name.trim(),
                price,
                status: RoomStatus.VACANT,
                ...(assetList.length > 0 && {
                    assets: {
                        create: assetList.map((asset) => ({
                            assetMasterId: asset.assetMasterId,
                            name: asset.name.trim(),
                            details: asset.details.trim(),
                            status: AssetStatus.GOOD,
                        })),
                    },
                }),
            },
            include: {
                assets: { include: { assetMaster: true } },
            },
        });

        return res.status(201).json({ message: "Room successfully created.", room });
    } catch (error) {
        console.error("Gagal membuat kamar:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// PUT /api/admin/rooms/:id - Update informasi Kamar (nama, harga, status, & aset)
export const updateRoom = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const id = req.params.id as string;
        const { name, price, status, assets } = req.body;

        const existing = await prisma.room.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Room not found." });
        }

        if (status !== undefined) {
            return res.status(400).json({
                message: "Room status cannot be changed manually. Use the available occupancy flow.",
            });
        }

        if (assets !== undefined && !Array.isArray(assets)) {
            return res.status(400).json({ message: "Field 'assets' must be an array." });
        }

        const assetList: { id?: string; assetMasterId: string; name: string; details: string }[] = 
            Array.isArray(assets) ? assets : [];

        // Validasi setiap item aset
        for (const asset of assetList) {
            if (!asset.assetMasterId || !asset.name || !asset.details) {
                return res.status(400).json({
                    message: "Each asset must have 'assetMasterId', 'name', and 'details'.",
                });
            }
            const masterExists = await prisma.assetMaster.findUnique({
                where: { id: asset.assetMasterId },
            });
            if (!masterExists) {
                return res.status(404).json({
                    message: `Asset Master with id '${asset.assetMasterId}' not found.`,
                });
            }
        }

        let updatedRoom;
        try {
            updatedRoom = await prisma.$transaction(async (tx) => {
                // Update basic room info
                await tx.room.update({
                    where: { id },
                    data: {
                        ...(name && { name: name.trim() }),
                        ...(price !== undefined && { price }),
                        ...(status && { status }),
                    },
                });

                if (assets !== undefined) {
                    const payloadAssetIds = assetList.filter(a => a.id).map(a => a.id as string);
                    
                    // 1. Delete assets that are not in the payload
                    const existingAssets = await tx.asset.findMany({ where: { roomId: id } });
                    const assetsToDelete = existingAssets.filter(a => !payloadAssetIds.includes(a.id));
                    
                    if (assetsToDelete.length > 0) {
                        const deleteIds = assetsToDelete.map(a => a.id);
                        await tx.asset.deleteMany({
                            where: { id: { in: deleteIds } }
                        });
                    }

                    // 2. Upsert assets from payload
                    for (const asset of assetList) {
                        if (asset.id) {
                            await tx.asset.update({
                                where: { id: asset.id },
                                data: {
                                    name: asset.name.trim(),
                                    details: asset.details.trim(),
                                }
                            });
                        } else {
                            await tx.asset.create({
                                data: {
                                    roomId: id,
                                    assetMasterId: asset.assetMasterId,
                                    name: asset.name.trim(),
                                    details: asset.details.trim(),
                                    status: AssetStatus.GOOD,
                                }
                            });
                        }
                    }
                }

                return await tx.room.findUnique({
                    where: { id },
                    include: { assets: { include: { assetMaster: true } } }
                });
            });
        } catch (error: any) {
            // P2003: Foreign key constraint failed (e.g. Asset has MaintenanceLog/FinancialRecord)
            if (error.code === 'P2003') {
                return res.status(409).json({ 
                    message: "Some assets cannot be deleted because they have maintenance or financial expense history. Please cancel the deletion of these assets." 
                });
            }
            throw error; // Let the outer catch handle other errors
        }

        return res.status(200).json({ message: "Room successfully updated.", room: updatedRoom });
    } catch (error) {
        console.error("Gagal memperbarui kamar:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// DELETE /api/admin/rooms/:id - Hapus Kamar
export const deleteRoom = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const id = req.params.id as string;

        const existing = await prisma.room.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Room not found." });
        }

        // Fix TS2339: query count terpisah, bukan _count di findUnique
        const paymentCount = await prisma.invoice.count({ where: { roomId: id } });
        if (paymentCount > 0) {
            return res.status(409).json({
                message: `Cannot be deleted. This room has ${paymentCount} payment history.`,
            });
        }

        await prisma.$transaction([
            prisma.asset.deleteMany({ where: { roomId: id } }),
            prisma.room.delete({ where: { id } }),
        ]);

        return res.status(200).json({ message: "Room successfully deleted." });
    } catch (error) {
        console.error("Gagal menghapus kamar:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// PATCH /api/admin/rooms/:id/checkout - Proses checkout penghuni lama
export const checkoutRoom = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const id = req.params.id as string;
        const now = new Date();

        const room = await prisma.room.findUnique({ where: { id } });
        if (!room) {
            return res.status(404).json({ message: "Room not found." });
        }

        const currentOccupancy = await getCurrentOccupancyByRoomId(prisma, id, now);
        if (!currentOccupancy) {
            return res.status(400).json({
                message: "Room has no active occupant currently. Occupancy synchronization may be needed.",
            });
        }

        const result = await prisma.$transaction((tx) =>
            releaseCurrentRoomOccupancy(tx, id, now),
        );

        return res.status(200).json({
            message: result.activatedReservation
                ? "Previous tenant successfully checked out. Active reservation has been converted to a regular invoice."
                : "Previous tenant successfully checked out. Room is now vacant."
        });
    } catch (error) {
        console.error("Gagal melakukan checkout kamar:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
