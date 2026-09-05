import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ProfileStatus, Role, RoomStatus } from "@prisma/client";
import { prisma } from "../utils/db";
import {
    createRoom,
    getAllRooms,
    updateRoom,
    checkoutRoom,
} from "../controllers/roomController";
import {
    createInvoice,
} from "../controllers/paymentController";
import {
    updateOccupant,
    deleteUser,
} from "../controllers/adminController";
import { generateNextPeriodPayments } from "../utils/paymentScheduler";
import { getDashboardSummary } from "../controllers/dashboardController";

type RoomRecord = {
    id: string;
    name: string;
    price: number;
    status: "OCCUPIED" | "VACANT";
};

type OccupantDetailsRecord = {
    id: string;
    userId: string;
    name: string;
    phoneNumber: string;
    address: string;
    occupation: "BEKERJA" | "KULIAH";
    status: "ACTIVE" | "DEACTIVE";
    moveInDate: Date | null;
    moveOutDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

type UserRecord = {
    id: string;
    email: string;
    password: string;
    role: "ADMIN" | "OPERATOR" | "OCCUPANT";
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    occupantDetails: OccupantDetailsRecord | null;
    operatorDetails: null;
};

type InvoiceRecord = {
    id: string;
    roomId: string;
    occupantId: string | null;
    priceApplied: number;
    paidNominal: number;
    periodStart: Date;
    periodEnd: Date;
    note: string | null;
    status: "PAID" | "UNPAID" | "NOT_FULLY_PAID";
    isDpReservation: boolean;
    waitingForRoomVacant: boolean;
    priorOccupantId: string | null;
    invoicePayments: Array<{ id: string; invoiceId: string; paymentId: string; amountApplied: number }>;
};

type PaymentRecord = {
    id: string;
    occupantId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: "TRANSFER" | "QRIS" | "E_WALLET" | "CASH";
    note: string | null;
};

type FinancialRecord = {
    id: string;
    type: "INCOME" | "EXPENSE";
    amount: number;
    description: string;
    date: Date;
    paymentId: string | null;
};

type MockResponse = {
    statusCode: number;
    body: any;
    status: (code: number) => MockResponse;
    json: (payload: any) => MockResponse;
};

function createMockResponse(): MockResponse {
    return {
        statusCode: 200,
        body: null,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: any) {
            this.body = payload;
            return this;
        },
    };
}

function cloneDate(value: Date | null | undefined): Date | null {
    if (!value) return null;
    return new Date(value);
}

function sortRecords<T>(records: T[], orderBy?: any): T[] {
    if (!orderBy) return [...records];

    const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
    const sorted = [...records];
    sorted.sort((left: any, right: any) => {
        for (const clause of clauses) {
            const [field, direction] = Object.entries(clause)[0] as [string, "asc" | "desc"];
            const leftValue = left[field];
            const rightValue = right[field];
            const leftComparable = leftValue instanceof Date ? leftValue.getTime() : leftValue;
            const rightComparable = rightValue instanceof Date ? rightValue.getTime() : rightValue;

            if (leftComparable === rightComparable) {
                continue;
            }

            if (leftComparable < rightComparable) {
                return direction === "asc" ? -1 : 1;
            }

            return direction === "asc" ? 1 : -1;
        }

        return 0;
    });

    return sorted;
}

function matchesValue(value: any, condition: any): boolean {
    if (condition && typeof condition === "object" && !(condition instanceof Date) && !Array.isArray(condition)) {
        if ("not" in condition) {
            return !matchesValue(value, condition.not);
        }
        if ("in" in condition) {
            return Array.isArray(condition.in) && condition.in.includes(value);
        }
        if ("lt" in condition && !(value < condition.lt)) {
            return false;
        }
        if ("lte" in condition && !(value <= condition.lte)) {
            return false;
        }
        if ("gt" in condition && !(value > condition.gt)) {
            return false;
        }
        if ("gte" in condition && !(value >= condition.gte)) {
            return false;
        }
        return true;
    }

    return value === condition;
}

function matchesWhere(record: any, where: any): boolean {
    if (!where) return true;

    const entries = Object.entries(where);
    return entries.every(([key, condition]) => {
        if (key === "OR") {
            return Array.isArray(condition) && condition.some((item) => matchesWhere(record, item));
        }
        if (key === "AND") {
            return Array.isArray(condition) && condition.every((item) => matchesWhere(record, item));
        }
        if (key === "invoicePayments" && condition && typeof condition === "object" && "none" in condition) {
            return Array.isArray(record.invoicePayments) && record.invoicePayments.length === 0;
        }
        return matchesValue(record[key], condition);
    });
}

class MockPrismaHarness {
    rooms: RoomRecord[] = [];
    users: UserRecord[] = [];
    invoices: InvoiceRecord[] = [];
    payments: PaymentRecord[] = [];
    financialRecords: FinancialRecord[] = [];
    roomOccupancySnapshots: Array<{
        id: string;
        year: number;
        month: number;
        occupiedRooms: number;
        totalRooms: number;
        snapshotDate: Date;
        createdAt: Date;
        updatedAt: Date;
    }> = [];
    assetMasters: Array<{ id: string; name: string }> = [];
    assets: any[] = [];

    originalRoot: Record<string, any> = {};
    originalModels = new Map<string, Record<string, any>>();

    room: any = {
        findUnique: async (_args?: any) => undefined,
        findMany: async (_args?: any) => [],
        create: async (_args?: any) => undefined,
        update: async (_args?: any) => undefined,
        updateMany: async (_args?: any) => ({ count: 0 }),
        count: async (_args?: any) => 0,
        delete: async (_args?: any) => undefined,
    };

    invoice: any = {
        findFirst: async (_args?: any) => undefined,
        findMany: async (_args?: any) => [],
        findUnique: async (_args?: any) => undefined,
        create: async (_args?: any) => undefined,
        update: async (_args?: any) => undefined,
        delete: async (_args?: any) => undefined,
        deleteMany: async (_args?: any) => ({ count: 0 }),
        count: async (_args?: any) => 0,
    };

    user: any = {
        findUnique: async (_args?: any) => undefined,
        findMany: async (_args?: any) => [],
        update: async (_args?: any) => undefined,
    };

    occupantDetails: any = {
        updateMany: async (_args?: any) => ({ count: 0 }),
        update: async (_args?: any) => undefined,
        count: async (_args?: any) => 0,
    };

    payment: any = {
        create: async (_args?: any) => undefined,
        findMany: async (_args?: any) => [],
        count: async (_args?: any) => 0,
    };

    invoicePayment: any = {
        create: async (_args?: any) => undefined,
        findMany: async (_args?: any) => [],
    };

    financialRecord: any = {
        create: async (_args?: any) => undefined,
        aggregate: async (_args?: any) => ({ _sum: { amount: 0 } }),
    };

    roomOccupancySnapshot: any = {
        findMany: async (_args?: any) => [],
        upsert: async (_args?: any) => undefined,
    };

    assetMaster: any = {
        findUnique: async (_args?: any) => undefined,
    };

    async $queryRawUnsafe() {
        return [];
    }

    async $transaction(input: any) {
        if (Array.isArray(input)) {
            return Promise.all(input);
        }
        return input(this);
    }

    constructor() {
        this.bindMethods();
    }

    bindMethods() {
        this.room.findUnique = async (args: any) => {
            const room = this.rooms.find((item) => item.id === args.where.id) ?? null;
            return room ? this.includeRoom(room, args.include) : null;
        };

        this.room.findMany = async (args: any = {}) => {
            const filtered = this.rooms.filter((room) => matchesWhere(room, args.where));
            return sortRecords(filtered, args.orderBy).map((room) => this.includeRoom(room, args.include));
        };

        this.room.create = async (args: any) => {
            const room: RoomRecord = {
                id: randomUUID(),
                name: args.data.name,
                price: args.data.price,
                status: args.data.status,
            };
            this.rooms.push(room);
            return this.includeRoom(room, args.include);
        };

        this.room.update = async (args: any) => {
            const room = this.rooms.find((item) => item.id === args.where.id);
            if (!room) throw new Error("Room not found");
            Object.assign(room, args.data);
            return this.includeRoom(room, args.include);
        };

        this.room.updateMany = async (args: any) => {
            const targets = this.rooms.filter((room) => matchesWhere(room, args.where));
            for (const target of targets) {
                Object.assign(target, args.data);
            }
            return { count: targets.length };
        };

        this.room.count = async (args: any = {}) =>
            this.rooms.filter((room) => matchesWhere(room, args.where)).length;

        this.room.delete = async (args: any) => {
            const index = this.rooms.findIndex((room) => room.id === args.where.id);
            const [deleted] = this.rooms.splice(index, 1);
            return deleted;
        };

        this.invoice.findUnique = async (args: any) => {
            const invoice = this.invoices.find((item) => item.id === args.where.id) ?? null;
            return invoice ? this.includeInvoice(invoice, args.include) : null;
        };

        this.invoice.findFirst = async (args: any = {}) => {
            const filtered = sortRecords(
                this.invoices.filter((invoice) => matchesWhere(invoice, args.where)),
                args.orderBy,
            );
            const invoice = filtered[0] ?? null;
            return invoice ? this.includeInvoice(invoice, args.include) : null;
        };

        this.invoice.findMany = async (args: any = {}) => {
            let filtered = this.invoices.filter((invoice) => matchesWhere(invoice, args.where));
            filtered = sortRecords(filtered, args.orderBy);
            if (typeof args.skip === "number") {
                filtered = filtered.slice(args.skip);
            }
            if (typeof args.take === "number") {
                filtered = filtered.slice(0, args.take);
            }
            return filtered.map((invoice) => this.includeInvoice(invoice, args.include));
        };

        this.invoice.create = async (args: any) => {
            const invoice: InvoiceRecord = {
                id: randomUUID(),
                roomId: args.data.roomId,
                occupantId: args.data.occupantId ?? null,
                priceApplied: args.data.priceApplied,
                paidNominal: args.data.paidNominal ?? 0,
                periodStart: new Date(args.data.periodStart),
                periodEnd: new Date(args.data.periodEnd),
                note: args.data.note ?? null,
                status: args.data.status,
                isDpReservation: Boolean(args.data.isDpReservation),
                waitingForRoomVacant: Boolean(args.data.waitingForRoomVacant),
                priorOccupantId: args.data.priorOccupantId ?? null,
                invoicePayments: [],
            };
            this.invoices.push(invoice);
            return this.includeInvoice(invoice, args.include);
        };

        this.invoice.update = async (args: any) => {
            const invoice = this.invoices.find((item) => item.id === args.where.id);
            if (!invoice) throw new Error("Invoice not found");
            Object.assign(invoice, args.data);
            if (args.data.periodStart) invoice.periodStart = new Date(args.data.periodStart);
            if (args.data.periodEnd) invoice.periodEnd = new Date(args.data.periodEnd);
            return this.includeInvoice(invoice, args.include);
        };

        this.invoice.delete = async (args: any) => {
            const index = this.invoices.findIndex((invoice) => invoice.id === args.where.id);
            const [deleted] = this.invoices.splice(index, 1);
            return deleted;
        };

        this.invoice.deleteMany = async (args: any) => {
            const before = this.invoices.length;
            this.invoices = this.invoices.filter((invoice) => !matchesWhere(invoice, args.where));
            return { count: before - this.invoices.length };
        };

        this.invoice.count = async (args: any = {}) =>
            this.invoices.filter((invoice) => matchesWhere(invoice, args.where)).length;

        this.user.findUnique = async (args: any) => {
            const user = this.users.find((item) => {
                if (args.where.id) return item.id === args.where.id;
                if (args.where.email) return item.email === args.where.email;
                return false;
            }) ?? null;
            return user ? this.includeUser(user, args.include, args.select) : null;
        };

        this.user.findMany = async (args: any = {}) => {
            const filtered = this.users.filter((user) => matchesWhere(user, args.where));
            return filtered.map((user) => this.includeUser(user, args.include, args.select));
        };

        this.user.update = async (args: any) => {
            const user = this.users.find((item) => item.id === args.where.id);
            if (!user) throw new Error("User not found");

            if (args.data.email) user.email = args.data.email;
            if (args.data.password) user.password = args.data.password;
            if ("deletedAt" in args.data) user.deletedAt = cloneDate(args.data.deletedAt);
            user.updatedAt = new Date();

            if (args.data.occupantDetails?.update && user.occupantDetails) {
                Object.assign(user.occupantDetails, args.data.occupantDetails.update);
                if ("moveInDate" in args.data.occupantDetails.update) {
                    user.occupantDetails.moveInDate = cloneDate(args.data.occupantDetails.update.moveInDate);
                }
                if ("moveOutDate" in args.data.occupantDetails.update) {
                    user.occupantDetails.moveOutDate = cloneDate(args.data.occupantDetails.update.moveOutDate);
                }
                user.occupantDetails.updatedAt = new Date();
            }

            return this.includeUser(user, args.include);
        };

        this.occupantDetails.updateMany = async (args: any) => {
            const targets = this.users
                .map((user) => user.occupantDetails)
                .filter((details): details is OccupantDetailsRecord => Boolean(details))
                .filter((details) => matchesWhere(details, args.where));

            for (const target of targets) {
                Object.assign(target, args.data);
                if ("moveInDate" in args.data) target.moveInDate = cloneDate(args.data.moveInDate);
                if ("moveOutDate" in args.data) target.moveOutDate = cloneDate(args.data.moveOutDate);
                target.updatedAt = new Date();
            }

            return { count: targets.length };
        };

        this.occupantDetails.update = async (args: any) => {
            const target = this.users
                .map((user) => user.occupantDetails)
                .filter((details): details is OccupantDetailsRecord => Boolean(details))
                .find((details) => details.userId === args.where.userId);

            if (!target) throw new Error("Occupant details not found");
            Object.assign(target, args.data);
            if ("moveInDate" in args.data) target.moveInDate = cloneDate(args.data.moveInDate);
            if ("moveOutDate" in args.data) target.moveOutDate = cloneDate(args.data.moveOutDate);
            target.updatedAt = new Date();
            return target;
        };

        this.occupantDetails.count = async (args: any = {}) =>
            this.users
                .map((user) => user.occupantDetails)
                .filter((details): details is OccupantDetailsRecord => Boolean(details))
                .filter((details) => matchesWhere(details, args.where)).length;

        this.payment.create = async (args: any) => {
            const payment: PaymentRecord = {
                id: randomUUID(),
                occupantId: args.data.occupantId,
                amount: args.data.amount,
                paymentDate: args.data.paymentDate ? new Date(args.data.paymentDate) : new Date(),
                paymentMethod: args.data.paymentMethod,
                note: args.data.note ?? null,
            };
            this.payments.push(payment);
            return payment;
        };

        this.payment.findMany = async () => [];
        this.payment.count = async () => 0;

        this.invoicePayment.create = async (args: any) => {
            const invoice = this.invoices.find((item) => item.id === args.data.invoiceId);
            if (!invoice) throw new Error("Invoice not found");
            const relation = {
                id: randomUUID(),
                invoiceId: args.data.invoiceId,
                paymentId: args.data.paymentId,
                amountApplied: args.data.amountApplied,
            };
            invoice.invoicePayments.push(relation);
            return relation;
        };

        this.invoicePayment.findMany = async (args: any = {}) => {
            const all = this.invoices.flatMap((invoice) =>
                invoice.invoicePayments.map((invoicePayment) => ({
                    ...invoicePayment,
                    payment: this.payments.find((payment) => payment.id === invoicePayment.paymentId) ?? null,
                })),
            );
            return all.filter((item) => matchesWhere(item, args.where));
        };

        this.financialRecord.create = async (args: any) => {
            const record: FinancialRecord = {
                id: randomUUID(),
                type: args.data.type,
                amount: args.data.amount,
                description: args.data.description,
                date: args.data.date ? new Date(args.data.date) : new Date(),
                paymentId: args.data.paymentId ?? null,
            };
            this.financialRecords.push(record);
            return record;
        };

        this.financialRecord.aggregate = async (args: any = {}) => {
            const filtered = this.financialRecords.filter((item) => matchesWhere(item, args.where));
            return {
                _sum: {
                    amount: filtered.reduce((sum, item) => sum + item.amount, 0),
                },
            };
        };

        this.roomOccupancySnapshot.findMany = async (args: any = {}) => {
            const filtered = this.roomOccupancySnapshots.filter((item) => matchesWhere(item, args.where));
            return sortRecords(filtered, args.orderBy);
        };

        this.roomOccupancySnapshot.upsert = async (args: any) => {
            const existing = this.roomOccupancySnapshots.find(
                (item) => item.year === args.where.year_month.year && item.month === args.where.year_month.month,
            );
            if (existing) {
                Object.assign(existing, args.update);
                existing.updatedAt = new Date();
                return existing;
            }

            const created = {
                id: randomUUID(),
                year: args.create.year,
                month: args.create.month,
                occupiedRooms: args.create.occupiedRooms,
                totalRooms: args.create.totalRooms,
                snapshotDate: new Date(args.create.snapshotDate),
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            this.roomOccupancySnapshots.push(created);
            return created;
        };

        this.assetMaster.findUnique = async (args: any) =>
            this.assetMasters.find((item) => item.id === args.where.id) ?? null;
    }

    includeRoom(room: RoomRecord, include?: any) {
        const result: any = { ...room };
        if (include?.assets) {
            result.assets = this.assets.filter((asset) => asset.roomId === room.id);
        }
        if (include?._count?.select?.invoices) {
            result._count = {
                invoices: this.invoices.filter((invoice) => invoice.roomId === room.id).length,
            };
        }
        return result;
    }

    includeUser(user: UserRecord, include?: any, select?: any) {
        const source: any = {
            ...user,
            occupantDetails: user.occupantDetails ? { ...user.occupantDetails } : null,
            operatorDetails: user.operatorDetails,
        };

        if (select) {
            const selected: any = {};
            for (const key of Object.keys(select)) {
                const selection = select[key];
                if (selection === true) {
                    selected[key] = source[key];
                } else if (key === "occupantDetails" && selection?.select) {
                    selected.occupantDetails = user.occupantDetails
                        ? Object.fromEntries(
                            Object.entries(selection.select).map(([field]) => [field, (user.occupantDetails as any)[field]]),
                        )
                        : null;
                } else if (key === "invoices" && selection?.where) {
                    let invoices = this.invoices.filter((invoice) => invoice.occupantId === user.id && matchesWhere(invoice, selection.where));
                    invoices = sortRecords(invoices, selection.orderBy);
                    if (typeof selection.take === "number") {
                        invoices = invoices.slice(0, selection.take);
                    }
                    selected.invoices = invoices.map((invoice) => ({ id: invoice.id }));
                }
            }
            return selected;
        }

        if (include?.occupantDetails) {
            source.occupantDetails = user.occupantDetails ? { ...user.occupantDetails } : null;
        }

        return source;
    }

    includeInvoice(invoice: InvoiceRecord, include?: any) {
        const result: any = {
            ...invoice,
            periodStart: new Date(invoice.periodStart),
            periodEnd: new Date(invoice.periodEnd),
            invoicePayments: invoice.invoicePayments.map((item) => ({ ...item })),
        };

        if (include?.room) {
            const room = this.rooms.find((item) => item.id === invoice.roomId) ?? null;
            result.room = room
                ? Object.fromEntries(
                    Object.keys(include.room.select ?? {}).map((field) => [field, (room as any)[field]]),
                )
                : null;
        }

        if (include?.occupant) {
            const occupant = invoice.occupantId
                ? this.users.find((item) => item.id === invoice.occupantId) ?? null
                : null;

            if (!occupant) {
                result.occupant = null;
            } else {
                result.occupant = {
                    id: occupant.id,
                    email: occupant.email,
                    ...(include.occupant.select?.occupantDetails
                        ? {
                            occupantDetails: occupant.occupantDetails
                                ? Object.fromEntries(
                                    Object.keys(include.occupant.select.occupantDetails.select ?? {}).map((field) => [field, (occupant.occupantDetails as any)[field]]),
                                )
                                : null,
                        }
                        : {}),
                };
            }
        }

        return result;
    }

    install() {
        const root = prisma as any;
        for (const key of ["$transaction", "$queryRawUnsafe"]) {
            this.originalRoot[key] = root[key];
        }
        root.$transaction = this.$transaction.bind(this);
        root.$queryRawUnsafe = this.$queryRawUnsafe.bind(this);

        const modelMap: Record<string, any> = {
            room: this.room,
            invoice: this.invoice,
            user: this.user,
            occupantDetails: this.occupantDetails,
            payment: this.payment,
            invoicePayment: this.invoicePayment,
            financialRecord: this.financialRecord,
            roomOccupancySnapshot: this.roomOccupancySnapshot,
            assetMaster: this.assetMaster,
        };

        for (const [model, methods] of Object.entries(modelMap)) {
            const target = root[model];
            const original: Record<string, any> = {};
            for (const [methodName, implementation] of Object.entries(methods)) {
                original[methodName] = target[methodName];
                target[methodName] = implementation;
            }
            this.originalModels.set(model, original);
        }
    }

    restore() {
        const root = prisma as any;
        for (const [key, value] of Object.entries(this.originalRoot)) {
            root[key] = value;
        }
        for (const [model, methods] of this.originalModels.entries()) {
            const target = root[model];
            for (const [methodName, implementation] of Object.entries(methods)) {
                target[methodName] = implementation;
            }
        }
    }

    seedOccupant(name: string, status: "ACTIVE" | "DEACTIVE" = "ACTIVE") {
        const now = new Date();
        const user: UserRecord = {
            id: randomUUID(),
            email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
            password: "secret",
            role: Role.OCCUPANT,
            deletedAt: null,
            createdAt: now,
            updatedAt: now,
            operatorDetails: null,
            occupantDetails: {
                id: randomUUID(),
                userId: "",
                name,
                phoneNumber: "0800000000",
                address: "Jl. Test",
                occupation: "BEKERJA",
                status,
                moveInDate: null,
                moveOutDate: null,
                createdAt: now,
                updatedAt: now,
            },
        };
        user.occupantDetails!.userId = user.id;
        this.users.push(user);
        return user;
    }

    seedRoom(name: string, price = 1000000, status: "VACANT" | "OCCUPIED" = "VACANT") {
        const room: RoomRecord = {
            id: randomUUID(),
            name,
            price,
            status,
        };
        this.rooms.push(room);
        return room;
    }

    seedInvoice(input: Partial<InvoiceRecord> & Pick<InvoiceRecord, "roomId" | "occupantId" | "periodStart" | "periodEnd">) {
        const invoice: InvoiceRecord = {
            id: randomUUID(),
            roomId: input.roomId,
            occupantId: input.occupantId,
            priceApplied: input.priceApplied ?? 1000000,
            paidNominal: input.paidNominal ?? 0,
            periodStart: new Date(input.periodStart),
            periodEnd: new Date(input.periodEnd),
            note: input.note ?? null,
            status: input.status ?? "UNPAID",
            isDpReservation: input.isDpReservation ?? false,
            waitingForRoomVacant: input.waitingForRoomVacant ?? false,
            priorOccupantId: input.priorOccupantId ?? null,
            invoicePayments: input.invoicePayments ?? [],
        };
        this.invoices.push(invoice);
        return invoice;
    }
}

function daysFromNow(days: number) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + days);
    return date;
}

function mockReq(overrides: Record<string, any> = {}) {
    return {
        body: {},
        params: {},
        query: {},
        headers: {},
        user: { userId: randomUUID(), role: Role.ADMIN },
        ...overrides,
    };
}

test("create room sets VACANT by default", async () => {
    const harness = new MockPrismaHarness();
    harness.install();

    try {
        const req = mockReq({
            body: {
                name: "Kamar 101",
                price: 1250000,
            },
        });
        const res = createMockResponse();

        await createRoom(req as any, res as any);

        assert.equal(res.statusCode, 201);
        assert.equal(res.body.room.status, RoomStatus.VACANT);
        assert.equal(harness.rooms[0]?.status, RoomStatus.VACANT);
    } finally {
        harness.restore();
    }
});

test("future regular invoice keeps room vacant and hides activeOccupant", async () => {
    const harness = new MockPrismaHarness();
    harness.install();

    try {
        const occupant = harness.seedOccupant("Future Tenant");
        const room = harness.seedRoom("Kamar Future");

        const createReq = mockReq({
            body: {
                roomId: room.id,
                occupantId: occupant.id,
                periodStart: daysFromNow(7).toISOString(),
                paymentMode: "SEWA_REGULER",
                initialPaidNominal: 0,
            },
        });
        const createRes = createMockResponse();
        await createInvoice(createReq as any, createRes as any);

        assert.equal(createRes.statusCode, 201);
        assert.equal(harness.rooms[0]?.status, RoomStatus.VACANT);

        const roomsRes = createMockResponse();
        await getAllRooms(mockReq() as any, roomsRes as any);

        assert.equal(roomsRes.statusCode, 200);
        assert.equal(roomsRes.body.rooms[0].status, RoomStatus.VACANT);
        assert.equal(roomsRes.body.rooms[0].activeOccupant, null);
    } finally {
        harness.restore();
    }
});

test("future overlapping room invoice is rejected even when room is currently vacant", async () => {
    const harness = new MockPrismaHarness();
    harness.install();

    try {
        const occupantA = harness.seedOccupant("Occupant A");
        const occupantB = harness.seedOccupant("Occupant B");
        const room = harness.seedRoom("Kamar Overlap");
        const periodStart = daysFromNow(10);

        await createInvoice(
            mockReq({
                body: {
                    roomId: room.id,
                    occupantId: occupantA.id,
                    periodStart: periodStart.toISOString(),
                    paymentMode: "SEWA_REGULER",
                    initialPaidNominal: 0,
                },
            }) as any,
            createMockResponse() as any,
        );

        const conflictRes = createMockResponse();
        await createInvoice(
            mockReq({
                body: {
                    roomId: room.id,
                    occupantId: occupantB.id,
                    periodStart: periodStart.toISOString(),
                    paymentMode: "SEWA_REGULER",
                    initialPaidNominal: 0,
                },
            }) as any,
            conflictRes as any,
        );

        assert.equal(conflictRes.statusCode, 409);
    } finally {
        harness.restore();
    }
});

test("DP for occupied room creates waiting reservation without replacing current occupant", async () => {
    const harness = new MockPrismaHarness();
    harness.install();

    try {
        const currentOccupant = harness.seedOccupant("Current Occupant");
        const nextOccupant = harness.seedOccupant("Next Occupant");
        const room = harness.seedRoom("Kamar DP");

        harness.seedInvoice({
            roomId: room.id,
            occupantId: currentOccupant.id,
            periodStart: daysFromNow(-3),
            periodEnd: daysFromNow(27),
            priceApplied: room.price,
        });
        room.status = RoomStatus.OCCUPIED;

        const res = createMockResponse();
        await createInvoice(
            mockReq({
                body: {
                    roomId: room.id,
                    occupantId: nextOccupant.id,
                    periodStart: daysFromNow(1).toISOString(),
                    paymentMode: "DP",
                    initialPaidNominal: 0,
                },
            }) as any,
            res as any,
        );

        assert.equal(res.statusCode, 201);
        const created = harness.invoices.find((invoice) => invoice.id === res.body.invoice.id);
        assert.ok(created);
        assert.equal(created?.waitingForRoomVacant, true);
        assert.equal(created?.isDpReservation, true);
        assert.equal(created?.priorOccupantId, currentOccupant.id);
        assert.equal(room.status, RoomStatus.OCCUPIED);

        const roomsRes = createMockResponse();
        await getAllRooms(mockReq() as any, roomsRes as any);
        assert.equal(roomsRes.body.rooms[0].activeOccupant.id, currentOccupant.id);
    } finally {
        harness.restore();
    }
});

test("checkout occupied room with waiting DP transfers occupancy", async () => {
    const harness = new MockPrismaHarness();
    harness.install();

    try {
        const oldOccupant = harness.seedOccupant("Old Occupant");
        const newOccupant = harness.seedOccupant("New Occupant");
        const room = harness.seedRoom("Kamar Checkout", 1000000, RoomStatus.OCCUPIED);

        const activeInvoice = harness.seedInvoice({
            roomId: room.id,
            occupantId: oldOccupant.id,
            periodStart: daysFromNow(-5),
            periodEnd: daysFromNow(25),
            priceApplied: room.price,
        });
        const waitingDp = harness.seedInvoice({
            roomId: room.id,
            occupantId: newOccupant.id,
            periodStart: daysFromNow(2),
            periodEnd: daysFromNow(32),
            priceApplied: room.price,
            isDpReservation: true,
            waitingForRoomVacant: true,
            priorOccupantId: oldOccupant.id,
        });

        const res = createMockResponse();
        await checkoutRoom(
            mockReq({
                params: { id: room.id },
            }) as any,
            res as any,
        );

        assert.equal(res.statusCode, 200);
        assert.ok(activeInvoice.periodEnd <= new Date());
        assert.equal(oldOccupant.occupantDetails?.status, ProfileStatus.DEACTIVE);
        assert.equal(newOccupant.occupantDetails?.status, ProfileStatus.ACTIVE);
        assert.equal(waitingDp.waitingForRoomVacant, false);
        assert.equal(waitingDp.isDpReservation, false);
        assert.equal(waitingDp.priorOccupantId, null);
        assert.equal(room.status, RoomStatus.OCCUPIED);
    } finally {
        harness.restore();
    }
});

test("deactivating occupant reuses occupancy release flow and activates waiting DP", async () => {
    const harness = new MockPrismaHarness();
    harness.install();

    try {
        const oldOccupant = harness.seedOccupant("Deactivate Old");
        const newOccupant = harness.seedOccupant("Deactivate New");
        const room = harness.seedRoom("Kamar Deactivate", 1000000, RoomStatus.OCCUPIED);

        harness.seedInvoice({
            roomId: room.id,
            occupantId: oldOccupant.id,
            periodStart: daysFromNow(-4),
            periodEnd: daysFromNow(26),
            priceApplied: room.price,
        });
        const waitingDp = harness.seedInvoice({
            roomId: room.id,
            occupantId: newOccupant.id,
            periodStart: daysFromNow(3),
            periodEnd: daysFromNow(33),
            priceApplied: room.price,
            isDpReservation: true,
            waitingForRoomVacant: true,
            priorOccupantId: oldOccupant.id,
        });

        const res = createMockResponse();
        await updateOccupant(
            mockReq({
                params: { id: oldOccupant.id },
                body: { status: ProfileStatus.DEACTIVE },
            }) as any,
            res as any,
        );

        assert.equal(res.statusCode, 200);
        assert.equal(oldOccupant.occupantDetails?.status, ProfileStatus.DEACTIVE);
        assert.equal(newOccupant.occupantDetails?.status, ProfileStatus.ACTIVE);
        assert.equal(waitingDp.waitingForRoomVacant, false);
        assert.equal(waitingDp.isDpReservation, false);
        assert.equal(room.status, RoomStatus.OCCUPIED);
    } finally {
        harness.restore();
    }
});

test("soft deleting occupant reuses occupancy release flow and marks deletedAt", async () => {
    const harness = new MockPrismaHarness();
    harness.install();

    try {
        const oldOccupant = harness.seedOccupant("Delete Old");
        const newOccupant = harness.seedOccupant("Delete New");
        const room = harness.seedRoom("Kamar Delete", 1000000, RoomStatus.OCCUPIED);

        harness.seedInvoice({
            roomId: room.id,
            occupantId: oldOccupant.id,
            periodStart: daysFromNow(-2),
            periodEnd: daysFromNow(28),
            priceApplied: room.price,
        });
        const waitingDp = harness.seedInvoice({
            roomId: room.id,
            occupantId: newOccupant.id,
            periodStart: daysFromNow(1),
            periodEnd: daysFromNow(31),
            priceApplied: room.price,
            isDpReservation: true,
            waitingForRoomVacant: true,
            priorOccupantId: oldOccupant.id,
        });

        const res = createMockResponse();
        await deleteUser(
            mockReq({
                params: { id: oldOccupant.id },
                user: { userId: randomUUID(), role: Role.ADMIN },
            }) as any,
            res as any,
        );

        assert.equal(res.statusCode, 200);
        assert.ok(oldOccupant.deletedAt instanceof Date);
        assert.equal(waitingDp.waitingForRoomVacant, false);
        assert.equal(waitingDp.isDpReservation, false);
        assert.equal(room.status, RoomStatus.OCCUPIED);
    } finally {
        harness.restore();
    }
});

test("manual room status update is rejected", async () => {
    const harness = new MockPrismaHarness();
    harness.install();

    try {
        const room = harness.seedRoom("Manual Status");
        const res = createMockResponse();

        await updateRoom(
            mockReq({
                params: { id: room.id },
                body: { status: RoomStatus.OCCUPIED },
            }) as any,
            res as any,
        );

        assert.equal(res.statusCode, 400);
    } finally {
        harness.restore();
    }
});

test("scheduler uses current occupancy invoice, not stale room.status", async () => {
    const harness = new MockPrismaHarness();
    harness.install();

    try {
        const occupant = harness.seedOccupant("Scheduler Occupant");
        const room = harness.seedRoom("Kamar Scheduler", 900000, RoomStatus.VACANT);
        const currentInvoice = harness.seedInvoice({
            roomId: room.id,
            occupantId: occupant.id,
            periodStart: daysFromNow(-28),
            periodEnd: daysFromNow(2),
            priceApplied: room.price,
        });

        const count = await generateNextPeriodPayments();

        assert.equal(count, 1);
        assert.equal(harness.invoices.length, 2);
        const generated = harness.invoices.find((invoice) => invoice.id !== currentInvoice.id);
        assert.ok(generated);
        assert.equal(generated?.roomId, room.id);
        assert.equal(generated?.occupantId, occupant.id);
    } finally {
        harness.restore();
    }
});

test("dashboard summary counts only current occupancies, not stale room status", async () => {
    const harness = new MockPrismaHarness();
    harness.install();

    try {
        const expiredOccupant = harness.seedOccupant("Expired Tenant");
        const activeOccupant = harness.seedOccupant("Active Tenant");
        const staleOccupiedRoom = harness.seedRoom("Stale Occupied", 1000000, RoomStatus.OCCUPIED);
        const staleVacantRoom = harness.seedRoom("Stale Vacant", 1000000, RoomStatus.VACANT);

        harness.seedInvoice({
            roomId: staleOccupiedRoom.id,
            occupantId: expiredOccupant.id,
            periodStart: daysFromNow(-60),
            periodEnd: daysFromNow(-30),
            priceApplied: staleOccupiedRoom.price,
        });
        harness.seedInvoice({
            roomId: staleVacantRoom.id,
            occupantId: activeOccupant.id,
            periodStart: daysFromNow(-1),
            periodEnd: daysFromNow(29),
            priceApplied: staleVacantRoom.price,
        });

        const res = createMockResponse();
        await getDashboardSummary(mockReq() as any, res as any);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.summary.totalRooms, 2);
        assert.equal(res.body.summary.occupiedRooms, 1);
        assert.equal(res.body.summary.totalActiveTenants, 1);
    } finally {
        harness.restore();
    }
});
