import { Request, Response } from "express";
import { prisma } from "../utils/db";
import { TransactionType, ExpenseCategory } from "@prisma/client";

// POST /api/admin/financial/expenses
export const createExpense = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const { amount, description, expenseCategory, assetId } = req.body;

        if (
            amount === undefined ||
            amount === null ||
            typeof amount !== "number" ||
            Number.isNaN(amount) ||
            amount < 0
        ) {
            return res
                .status(400)
                .json({
                    message:
                        "Field 'amount' is required and must be a non-negative number.",
                });
        }
        if (!description || typeof description !== "string") {
            return res
                .status(400)
                .json({ message: "Field 'description' is required." });
        }
        if (
            !expenseCategory ||
            !Object.values(ExpenseCategory).includes(expenseCategory)
        ) {
            return res
                .status(400)
                .json({
                    message: `Field 'expenseCategory' is required and must be valid (${Object.values(ExpenseCategory).join(", ")}).`,
                });
        }

        if (expenseCategory === ExpenseCategory.ASSET_REPAIR) {
            if (!assetId) {
                return res
                    .status(400)
                    .json({
                        message:
                            "Field 'assetId' is required if category is ASSET_REPAIR.",
                    });
            }
            const asset = await prisma.asset.findUnique({
                where: { id: assetId },
            });
            if (!asset) {
                return res
                    .status(404)
                    .json({ message: "Asset not found." });
            }
        }

        const expense = await prisma.financialRecord.create({
            data: {
                type: TransactionType.EXPENSE,
                amount,
                description,
                expenseCategory,
                ...(expenseCategory === ExpenseCategory.ASSET_REPAIR &&
                    assetId && { assetId }),
                date: new Date(),
            },
        });

        return res
            .status(201)
            .json({
                message: "Expense data successfully added.",
                expense,
            });
    } catch (error) {
        console.error("Gagal menambah pengeluaran:", error);
        return res
            .status(500)
            .json({ message: "Internal server error." });
    }
};

// PUT /api/admin/financial/expenses/:id
export const updateExpense = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        const { amount, description, expenseCategory, assetId } = req.body;
        const normalizedAssetId = Array.isArray(assetId) ? assetId[0] : assetId;

        if (!id) {
            return res
                .status(400)
                .json({ message: "Expense ID is required." });
        }
        if (
            amount === undefined ||
            amount === null ||
            typeof amount !== "number" ||
            Number.isNaN(amount) ||
            amount < 0
        ) {
            return res
                .status(400)
                .json({
                    message:
                        "Field 'amount' is required and must be a non-negative number.",
                });
        }
        if (
            !description ||
            typeof description !== "string" ||
            description.trim() === ""
        ) {
            return res
                .status(400)
                .json({ message: "Field 'description' is required." });
        }
        if (
            !expenseCategory ||
            !Object.values(ExpenseCategory).includes(expenseCategory)
        ) {
            return res
                .status(400)
                .json({
                    message: `Field 'expenseCategory' is required and must be valid (${Object.values(ExpenseCategory).join(", ")}).`,
                });
        }

        const existingExpense = await prisma.financialRecord.findFirst({
            where: {
                id,
                type: TransactionType.EXPENSE,
            },
        });

        if (!existingExpense) {
            return res
                .status(404)
                .json({ message: "Expense data not found." });
        }

        let validatedAssetId: string | null = null;
        if (expenseCategory === ExpenseCategory.ASSET_REPAIR) {
            if (!normalizedAssetId || typeof normalizedAssetId !== "string") {
                return res
                    .status(400)
                    .json({
                        message:
                            "Field 'assetId' is required if category is ASSET_REPAIR.",
                    });
            }

            const asset = await prisma.asset.findUnique({
                where: { id: normalizedAssetId },
            });
            if (!asset) {
                return res
                    .status(404)
                    .json({ message: "Asset not found." });
            }

            validatedAssetId = normalizedAssetId;
        }

        const expense = await prisma.financialRecord.update({
            where: { id },
            data: {
                amount,
                description: description.trim(),
                expenseCategory,
                assetId: validatedAssetId,
            },
        });

        return res
            .status(200)
            .json({
                message: "Expense data successfully updated.",
                expense,
            });
    } catch (error) {
        console.error("Gagal memperbarui pengeluaran:", error);
        return res
            .status(500)
            .json({ message: "Internal server error." });
    }
};

// GET /api/admin/financial
export const getAllFinancialRecords = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const { type } = req.query;
        const filter: any = {};

        if (type) {
            if (
                !Object.values(TransactionType).includes(
                    type as TransactionType,
                )
            ) {
                return res
                    .status(400)
                    .json({ message: "Invalid transaction type." });
            }
            filter.type = type;
        }

        const records = await prisma.financialRecord.findMany({
            where: filter,
            orderBy: { date: "desc" },
            include: {
                payment: {
                    select: {
                        id: true,
                        paymentMethod: true,
                        paymentDate: true,
                        occupant: {
                            select: {
                                id: true,
                                email: true,
                                occupantDetails: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                        invoicePayments: {
                            select: {
                                amountApplied: true,
                                invoice: {
                                    select: {
                                        id: true,
                                        room: { select: { name: true } },
                                    },
                                },
                            },
                        },
                    },
                },
                asset: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        roomId: true,
                        room: {
                            select: {
                                name: true,
                                status: true,
                            },
                        },
                    },
                },
            },
        });

        return res.status(200).json({ records });
    } catch (error) {
        console.error("Gagal mengambil data keuangan:", error);
        return res
            .status(500)
            .json({ message: "Internal server error." });
    }
};

// POST /api/admin/financial/backfill-income
export const backfillIncomeFromPayments = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const inserted = await prisma.$executeRaw`
            INSERT INTO \`financialrecord\` (
                \`id\`,
                \`type\`,
                \`amount\`,
                \`description\`,
                \`date\`,
                \`paymentId\`,
                \`expenseCategory\`,
                \`assetId\`,
                \`createdAt\`,
                \`updatedAt\`
            )
            SELECT
                UUID(),
                'INCOME',
                p.amount,
                CONCAT('Pembayaran ', COALESCE(p.importCode, p.id)),
                p.paymentDate,
                p.id,
                NULL,
                NULL,
                p.paymentDate,
                p.paymentDate
            FROM \`payment\` p
            LEFT JOIN \`financialrecord\` fr
                ON fr.paymentId = p.id AND fr.type = 'INCOME'
            WHERE fr.id IS NULL AND p.amount > 0;
        `;

        return res.status(200).json({
            message: "Income backfill from payments successfully executed.",
            inserted: Number(inserted),
        });
    } catch (error) {
        console.error(
            "Gagal menjalankan backfill pemasukan dari pembayaran:",
            error,
        );
        return res
            .status(500)
            .json({ message: "Internal server error." });
    }
};
