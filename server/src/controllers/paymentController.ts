import { Request, Response } from "express";
import { prisma } from "../utils/db";
import { PaymentStatus, TransactionType, PaymentMethod, ProfileStatus } from "@prisma/client";
import {
    getCurrentOccupancyByRoomId,
    recalculateRoomProjection,
} from "../utils/occupancyService";

type AuthenticatedRequest = Request & {
    user?: {
        userId?: string;
        role?: string;
    };
};

type InvoiceQueryOptions = {
    forceOccupantId?: string;
};

type TransactionQueryOptions = {
    forceOccupantId?: string;
};

class HttpError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
    }
}

async function fetchInvoicesForResponse(req: Request, options: InvoiceQueryOptions = {}) {
    const { status, roomId, occupantId, page, limit, search, periodDate } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (roomId) filters.roomId = roomId as string;
    if (options.forceOccupantId) {
        filters.occupantId = options.forceOccupantId;
    } else if (occupantId) {
        filters.occupantId = occupantId as string;
    }
    if (periodDate) {
        const relationDate = new Date(periodDate as string);
        relationDate.setUTCHours(23, 59, 59, 999);

        if (Number.isNaN(relationDate.getTime())) {
            throw new Error("INVALID_PERIOD_DATE");
        }
        filters.periodStart = { lte: relationDate };
        filters.periodEnd = { gt: relationDate };
    }

    if (req.query.hasPayment === "true") {
        filters.paidNominal = { gt: 0 };
    }

    if (search) {
        filters.OR = [
            { room: { name: { contains: search as string } } },
            { occupant: { occupantDetails: { name: { contains: search as string } } } },
        ];
    }

    const currentPage = page ? parseInt(page as string, 10) : 1;
    const perPage = limit ? parseInt(limit as string, 10) : 10;
    const skip = (currentPage - 1) * perPage;

    const [total, invoices] = await prisma.$transaction([
        prisma.invoice.count({ where: filters }),
        prisma.invoice.findMany({
            where: filters,
            skip,
            take: perPage,
            include: {
                room: { select: { id: true, name: true, price: true } },
                occupant: {
                    select: {
                        id: true,
                        email: true,
                        occupantDetails: { select: { name: true } },
                    },
                },
            },
            orderBy: { periodStart: "desc" },
        }),
    ]);

    const priorOccupantIds = Array.from(
        new Set(invoices.map((inv) => inv.priorOccupantId).filter((id): id is string => Boolean(id))),
    );

    const priorOccupantMap = new Map<string, { id: string; email: string; occupantDetails: { name: string } | null }>();

    if (priorOccupantIds.length > 0) {
        const priorOccupants = await prisma.user.findMany({
            where: { id: { in: priorOccupantIds } },
            select: { id: true, email: true, occupantDetails: { select: { name: true } } },
        });
        for (const priorOccupant of priorOccupants) {
            priorOccupantMap.set(priorOccupant.id, priorOccupant);
        }
    }

    const invoiceIds = invoices.map((invoice) => invoice.id);
    const allInvoicePayments = invoiceIds.length > 0
        ? await prisma.invoicePayment.findMany({
            where: { invoiceId: { in: invoiceIds } },
            include: {
                payment: {
                    select: {
                        id: true,
                        paymentDate: true,
                        paymentMethod: true,
                        amount: true,
                        note: true,
                    },
                },
            },
        })
        : [];

    const invoicePaymentsMap = new Map<string, any[]>();
    for (const invoicePayment of allInvoicePayments) {
        const list = invoicePaymentsMap.get(invoicePayment.invoiceId) || [];
        list.push(invoicePayment);
        invoicePaymentsMap.set(invoicePayment.invoiceId, list);
    }

    const invoicesWithPriorOccupant = invoices.map((invoice) => ({
        ...invoice,
        priorOccupant: invoice.priorOccupantId ? (priorOccupantMap.get(invoice.priorOccupantId) ?? null) : null,
        invoicePayments: invoicePaymentsMap.get(invoice.id) || [],
    }));

    const totalPages = Math.ceil(total / perPage);

    return {
        invoices: invoicesWithPriorOccupant,
        meta: { total, page: currentPage, limit: perPage, totalPages },
    };
}

async function fetchPaymentTransactionsForResponse(
    req: Request,
    options: TransactionQueryOptions = {},
) {
    const { page, limit, search, year, roomId, occupantId } = req.query;

    const filters: any = {};

    if (options.forceOccupantId) {
        filters.occupantId = options.forceOccupantId;
    } else if (occupantId) {
        filters.occupantId = occupantId as string;
    }

    if (roomId) {
        filters.invoicePayments = {
            some: { invoice: { roomId: roomId as string } },
        };
    }

    if (search) {
        filters.OR = [
            { occupant: { occupantDetails: { name: { contains: search as string } } } },
            { occupant: { email: { contains: search as string } } },
            { invoicePayments: { some: { invoice: { room: { name: { contains: search as string } } } } } },
        ];
    }

    if (year && year !== "ALL") {
        const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
        filters.paymentDate = {
            gte: startOfYear,
            lte: endOfYear,
        };
    }

    const currentPage = page ? parseInt(page as string, 10) : 1;
    const perPage = limit ? parseInt(limit as string, 10) : 10;
    const skip = (currentPage - 1) * perPage;

    const [total, transactions] = await prisma.$transaction([
        prisma.payment.count({ where: filters }),
        prisma.payment.findMany({
            where: filters,
            skip,
            take: perPage,
            include: {
                occupant: {
                    select: {
                        id: true,
                        email: true,
                        occupantDetails: { select: { name: true } },
                    },
                },
                invoicePayments: {
                    include: {
                        invoice: {
                            select: {
                                id: true,
                                periodStart: true,
                                periodEnd: true,
                                room: { select: { name: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { paymentDate: "desc" },
        }),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return {
        transactions,
        meta: { total, page: currentPage, limit: perPage, totalPages },
    };
}

// GET /api/admin/payments (mengambil Invoice)
export const getAllInvoices = async (req: Request, res: Response): Promise<any> => {
    try {
        const response = await fetchInvoicesForResponse(req);
        return res.status(200).json(response);
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_PERIOD_DATE") {
            return res.status(400).json({ message: "Invalid 'periodDate' query." });
        }

        console.error("Gagal mengambil daftar invoice:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

export const getMyInvoices = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const occupantId = req.user?.userId;
        if (!occupantId) {
            return res.status(401).json({ message: "Access denied. Invalid token." });
        }

        const response = await fetchInvoicesForResponse(req, { forceOccupantId: occupantId });
        return res.status(200).json(response);
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_PERIOD_DATE") {
            return res.status(400).json({ message: "Invalid 'periodDate' query." });
        }

        console.error("Gagal mengambil daftar invoice penghuni:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

export const getInvoiceById = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = req.params.id as string;
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                room: { select: { id: true, name: true, price: true } },
                occupant: {
                    select: {
                        id: true,
                        email: true,
                        occupantDetails: { select: { name: true, phoneNumber: true } },
                    },
                },
                invoicePayments: {
                    include: { payment: true }
                }
            },
        });

        if (!invoice) return res.status(404).json({ message: "Invoice not found." });

        const priorOccupant = invoice.priorOccupantId
            ? await prisma.user.findUnique({
                where: { id: invoice.priorOccupantId },
                select: { id: true, email: true, occupantDetails: { select: { name: true } } },
            })
            : null;

        return res.status(200).json({ invoice: { ...invoice, priorOccupant } });
    } catch (error) {
        console.error("Gagal mengambil detail invoice:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// POST /api/admin/payments/invoice - Buat tagihan manual
export const createInvoice = async (req: Request, res: Response): Promise<any> => {
    try {
        const { roomId, occupantId, periodStart, note, paymentMode, initialPaidNominal, paymentMethod } = req.body;

        if (!roomId || !occupantId || !periodStart) {
            return res.status(400).json({ message: "Fields 'roomId', 'occupantId', and 'periodStart' are required." });
        }

        const start = new Date(periodStart);
        if (Number.isNaN(start.getTime())) return res.status(400).json({ message: "Invalid 'periodStart' field." });

        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        const now = new Date();
        const checkStart = new Date(start);
        checkStart.setUTCHours(23, 59, 59, 999);
        const paidAmount = initialPaidNominal ? Number(initialPaidNominal) : 0;

        if (paidAmount > 0 && !paymentMethod) {
            return res.status(400).json({ message: "paymentMethod is required if initialPaidNominal exists" });
        }

        const result = await prisma.$transaction(async (tx) => {
            await tx.$queryRawUnsafe(
                "SELECT id FROM `room` WHERE id = ? FOR UPDATE",
                roomId,
            );
            await tx.$queryRawUnsafe(
                "SELECT id FROM `user` WHERE id = ? FOR UPDATE",
                occupantId,
            );

            const roomInTx = await tx.room.findUnique({
                where: { id: roomId },
                select: { id: true, price: true },
            });
            if (!roomInTx) {
                throw new HttpError(404, "Room not found.");
            }

            const occupantInTx = await tx.user.findUnique({
                where: { id: occupantId },
                include: { occupantDetails: true },
            });
            if (!occupantInTx || !occupantInTx.occupantDetails) {
                throw new HttpError(404, "Occupant not found.");
            }
            if (occupantInTx.occupantDetails.status !== ProfileStatus.ACTIVE) {
                throw new HttpError(409, "Cannot create new invoice for inactive occupant.");
            }

            let statusToSet: PaymentStatus = PaymentStatus.UNPAID;
            if (paidAmount > 0) {
                if (paidAmount >= roomInTx.price) statusToSet = PaymentStatus.PAID;
                else statusToSet = PaymentStatus.NOT_FULLY_PAID;
            }

            const currentOccupancy = await getCurrentOccupancyByRoomId(tx, roomId, now);
            const roomIsCurrentlyOccupied = Boolean(currentOccupancy);

            const existingInvoice = await tx.invoice.findFirst({
                where: { roomId, occupantId, periodStart: start },
            });
            if (existingInvoice) {
                throw new HttpError(409, "Invoice for this period already exists.");
            }

            const existingWaitingDpReservation = await tx.invoice.findFirst({
                where: {
                    roomId,
                    waitingForRoomVacant: true,
                    isDpReservation: true,
                    periodEnd: { gt: now },
                },
            });
            if (existingWaitingDpReservation) {
                throw new HttpError(409, "This room already has an active DP reservation.");
            }

            const overlappingOccupantInvoice = await tx.invoice.findFirst({
                where: {
                    occupantId,
                    periodStart: { lt: end },
                    periodEnd: { gt: checkStart },
                },
                include: { room: { select: { name: true } } },
            });
            if (overlappingOccupantInvoice) {
                throw new HttpError(
                    409,
                    `Occupant is already related to ${overlappingOccupantInvoice.room?.name ?? "kamar lain"} during an overlapping period.`,
                );
            }

            const overlappingRoomInvoice = await tx.invoice.findFirst({
                where: {
                    roomId,
                    ...(paymentMode === "DP" && roomIsCurrentlyOccupied && currentOccupancy
                        ? { id: { not: currentOccupancy.id } }
                        : {}),
                    occupantId: { not: occupantId },
                    waitingForRoomVacant: false,
                    periodStart: { lt: end },
                    periodEnd: { gt: checkStart },
                },
                include: {
                    occupant: {
                        select: {
                            email: true,
                            occupantDetails: { select: { name: true } },
                        },
                    },
                },
            });

            if (overlappingRoomInvoice) {
                throw new HttpError(
                    409,
                    "Kamar sudah terelasi dengan penghuni lain during an overlapping period.",
                );
            }

            let isDpReservation = false;
            let waitingForRoomVacant = false;
            let priorOccupantId: string | null = null;

            if (paymentMode === "DP" && roomIsCurrentlyOccupied) {
                isDpReservation = true;
                waitingForRoomVacant = true;
                priorOccupantId = currentOccupancy?.occupantId ?? null;
            }

            const invoiceData = {
                roomId,
                occupantId,
                periodStart: start,
                periodEnd: end,
                priceApplied: roomInTx.price,
                paidNominal: paidAmount,
                status: statusToSet,
                isDpReservation,
                waitingForRoomVacant,
                note,
                ...(priorOccupantId && { priorOccupantId }),
            };

            const inv = await tx.invoice.create({ data: invoiceData });

            if (paidAmount > 0) {
                const pay = await tx.payment.create({
                    data: {
                        occupantId,
                        amount: paidAmount,
                        paymentMethod: paymentMethod as PaymentMethod,
                        note: "Pembayaran awal tagihan",
                    },
                });
                await tx.invoicePayment.create({
                    data: {
                        invoiceId: inv.id,
                        paymentId: pay.id,
                        amountApplied: paidAmount,
                    },
                });
                await tx.financialRecord.create({
                    data: {
                        type: TransactionType.INCOME,
                        amount: paidAmount,
                        description: "Pembayaran awal tagihan",
                        paymentId: pay.id,
                    },
                });
            }

            await recalculateRoomProjection(tx, roomId, now);

            return inv;
        });

        return res.status(201).json({ message: "Invoice successfully created.", invoice: result });
    } catch (error) {
        if (error instanceof HttpError) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        console.error("Gagal membuat tagihan:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// POST /api/admin/payments/transaction - Catat pembayaran (cicil / lunas)
export const recordPaymentTransaction = async (req: Request, res: Response): Promise<any> => {
    try {
        const { occupantId, invoiceIds, totalAmount, paymentMethod, note } = req.body;
        
        if (!occupantId || !invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0 || !totalAmount || !paymentMethod) {
            return res.status(400).json({ message: "Fields occupantId, invoiceIds (array), totalAmount, and paymentMethod are required." });
        }

        if (totalAmount <= 0) return res.status(400).json({ message: "totalAmount must be greater than 0." });

        const invoices = await prisma.invoice.findMany({
            where: { id: { in: invoiceIds }, occupantId },
            orderBy: { periodStart: 'asc' }
        });

        if (invoices.length !== invoiceIds.length) {
            return res.status(404).json({ message: "Some invoices not found or do not belong to the occupant." });
        }

        let totalSisa = 0;
        const sisaPerInvoice = invoices.map(inv => {
            const sisa = inv.priceApplied - inv.paidNominal;
            totalSisa += sisa;
            return { ...inv, sisa };
        });

        if (totalAmount > totalSisa) {
            return res.status(400).json({ 
                message: `Payment exceeds total remaining invoice. Total remaining: ${totalSisa}, amount paid: ${totalAmount}. Overpayment is not allowed.` 
            });
        }

        // DP guard: cicilan boleh, pelunasan penuh diblokir selama waitingForRoomVacant
        // Simulasi alokasi untuk mengecek apakah ada invoice DP yang akan menjadi PAID
        let simulatedRemaining = totalAmount;
        for (const inv of sisaPerInvoice) {
            if (simulatedRemaining <= 0) break;
            if (inv.sisa <= 0) continue;

            const amountToApply = Math.min(simulatedRemaining, inv.sisa);
            simulatedRemaining -= amountToApply;

            const projectedPaidNominal = inv.paidNominal + amountToApply;
            if (inv.waitingForRoomVacant && projectedPaidNominal >= inv.priceApplied) {
                return res.status(403).json({
                    message: "Cannot fully pay this DP invoice because the room is still occupied by the previous tenant. Installments are allowed, but full payment can only be made after the previous tenant checks out."
                });
            }
        }

        await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: { occupantId, amount: totalAmount, paymentMethod: paymentMethod as PaymentMethod, note }
            });

            await tx.financialRecord.create({
                data: { type: TransactionType.INCOME, amount: totalAmount, description: `Pembayaran tagihan (${invoiceIds.length} bulan)`, paymentId: payment.id }
            });

            let remainingAmount = totalAmount;
            
            for (const inv of sisaPerInvoice) {
                if (remainingAmount <= 0) break;
                if (inv.sisa <= 0) continue;

                const amountToApply = Math.min(remainingAmount, inv.sisa);
                remainingAmount -= amountToApply;

                await tx.invoicePayment.create({
                    data: { invoiceId: inv.id, paymentId: payment.id, amountApplied: amountToApply }
                });

                const newPaidNominal = inv.paidNominal + amountToApply;
                let newStatus: PaymentStatus = PaymentStatus.UNPAID;
                if (newPaidNominal >= inv.priceApplied) newStatus = PaymentStatus.PAID;
                else if (newPaidNominal > 0) newStatus = PaymentStatus.NOT_FULLY_PAID;

                await tx.invoice.update({
                    where: { id: inv.id },
                    data: { paidNominal: newPaidNominal, status: newStatus }
                });
            }
        });

        return res.status(200).json({ message: "Payment successfully recorded." });
    } catch (error) {
        console.error("Error recordPaymentTransaction:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

export const updateInvoice = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = req.params.id as string;
        const { status, note } = req.body;

        const existing = await prisma.invoice.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: "Invoice not found." });

        if (status && !Object.values(PaymentStatus).includes(status)) {
            return res.status(400).json({ message: `Invalid status. Accepted values: ${Object.values(PaymentStatus).join(", ")}` });
        }

        const updated = await prisma.invoice.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(note !== undefined && { note }),
            },
        });

        return res.status(200).json({ message: "Invoice successfully updated.", invoice: updated });
    } catch (error) {
        console.error("Gagal memperbarui tagihan:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

export const deleteInvoice = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = req.params.id as string;

        const existing = await prisma.invoice.findUnique({ 
            where: { id },
            include: {
                _count: {
                    select: { invoicePayments: true }
                }
            }
        });

        if (!existing) {
            return res.status(404).json({ message: "Invoice not found." });
        }

        if (existing._count.invoicePayments > 0) {
            return res.status(400).json({ 
                message: "Cannot delete/cancel invoice because it already has payment history." 
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.invoice.delete({
                where: { id }
            });
            await recalculateRoomProjection(tx, existing.roomId, new Date());
        });

        return res.status(200).json({ message: "Invoice successfully cancelled/deleted." });
    } catch (error) {
        console.error("Gagal menghapus tagihan:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// GET /api/admin/payments/transactions - List semua transaksi pembayaran
export const getAllPaymentTransactions = async (req: Request, res: Response): Promise<any> => {
    try {
        const response = await fetchPaymentTransactionsForResponse(req);
        return res.status(200).json(response);
    } catch (error) {
        console.error("Gagal mengambil daftar transaksi pembayaran:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

export const getMyPaymentTransactions = async (
    req: AuthenticatedRequest,
    res: Response,
): Promise<any> => {
    try {
        const occupantId = req.user?.userId;
        if (!occupantId) {
            return res.status(401).json({ message: "Access denied. Invalid token." });
        }

        const response = await fetchPaymentTransactionsForResponse(req, { forceOccupantId: occupantId });
        return res.status(200).json(response);
    } catch (error) {
        console.error("Gagal mengambil daftar transaksi pembayaran penghuni:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};
