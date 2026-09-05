import {
    Prisma,
    PrismaClient,
    ProfileStatus,
    RoomStatus,
} from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;
type RoomOccupancyMapRecord = {
    roomId: string;
    occupantId: string | null;
    occupant: {
        id: string;
        email: string;
        occupantDetails: {
            name: string;
            status: ProfileStatus;
        } | null;
    } | null;
};

type CurrentOccupancyInclude = {
    occupant?: {
        select: {
            id: true;
            email: true;
            occupantDetails: {
                select: {
                    name: true;
                    status: true;
                };
            };
        };
    };
    room?: {
        select: {
            id: true;
            name: true;
            price: true;
        };
    };
};

export function buildCurrentOccupancyWhere(
    atDate: Date = new Date(),
): Prisma.InvoiceWhereInput {
    return {
        waitingForRoomVacant: false,
        occupantId: { not: null },
        periodStart: { lte: atDate },
        periodEnd: { gt: atDate },
    };
}

export async function getCurrentOccupancyByRoomId(
    db: DbClient,
    roomId: string,
    atDate: Date = new Date(),
    include: CurrentOccupancyInclude = {},
) {
    return db.invoice.findFirst({
        where: {
            roomId,
            ...buildCurrentOccupancyWhere(atDate),
        },
        include,
        orderBy: { periodStart: "desc" },
    });
}

export async function getCurrentOccupancyByOccupantId(
    db: DbClient,
    occupantId: string,
    atDate: Date = new Date(),
    include: CurrentOccupancyInclude = {},
) {
    return db.invoice.findFirst({
        where: {
            occupantId,
            ...buildCurrentOccupancyWhere(atDate),
        },
        include,
        orderBy: { periodStart: "desc" },
    });
}

export async function listCurrentOccupancies(
    db: DbClient,
    atDate: Date = new Date(),
    include: CurrentOccupancyInclude = {},
) {
    return db.invoice.findMany({
        where: buildCurrentOccupancyWhere(atDate),
        include,
        orderBy: [{ roomId: "asc" }, { periodStart: "desc" }],
    });
}

export async function getCurrentOccupancyMapByRoomIds(
    db: DbClient,
    roomIds: string[],
    atDate: Date = new Date(),
) {
    if (roomIds.length === 0) {
        return new Map<string, RoomOccupancyMapRecord>();
    }

    const occupancies = await db.invoice.findMany({
        where: {
            roomId: { in: roomIds },
            ...buildCurrentOccupancyWhere(atDate),
        },
        include: {
            occupant: {
                select: {
                    id: true,
                    email: true,
                    occupantDetails: {
                        select: {
                            name: true,
                            status: true,
                        },
                    },
                },
            },
        },
        orderBy: [{ roomId: "asc" }, { periodStart: "desc" }],
    });

    const occupancyByRoomId = new Map<string, RoomOccupancyMapRecord>();
    for (const occupancy of occupancies) {
        if (!occupancyByRoomId.has(occupancy.roomId)) {
            occupancyByRoomId.set(occupancy.roomId, occupancy);
        }
    }

    return occupancyByRoomId;
}

export async function recalculateRoomProjection(
    db: DbClient,
    roomId: string,
    atDate: Date = new Date(),
) {
    const currentOccupancy = await getCurrentOccupancyByRoomId(db, roomId, atDate);
    const status = currentOccupancy ? RoomStatus.OCCUPIED : RoomStatus.VACANT;

    await db.room.update({
        where: { id: roomId },
        data: { status },
    });

    return {
        status,
        currentOccupancy,
    };
}

async function normalizeActivatedReservationPeriod(
    db: DbClient,
    invoiceId: string,
    currentStart: Date,
    atDate: Date,
) {
    if (currentStart <= atDate) {
        return;
    }

    await db.invoice.update({
        where: { id: invoiceId },
        data: {
            periodStart: atDate,
        },
    });
}

export async function releaseCurrentRoomOccupancy(
    db: DbClient,
    roomId: string,
    atDate: Date = new Date(),
) {
    await db.$queryRawUnsafe(
        "SELECT id FROM `room` WHERE id = ? FOR UPDATE",
        roomId,
    );

    const currentOccupancy = await getCurrentOccupancyByRoomId(
        db,
        roomId,
        atDate,
        {
            occupant: {
                select: {
                    id: true,
                    email: true,
                    occupantDetails: {
                        select: {
                            name: true,
                            status: true,
                        },
                    },
                },
            },
        },
    );

    if (!currentOccupancy) {
        return {
            releasedOccupancy: null,
            activatedReservation: null,
            status: RoomStatus.VACANT,
        };
    }

    if (currentOccupancy.periodEnd > atDate) {
        await db.invoice.update({
            where: { id: currentOccupancy.id },
            data: { periodEnd: atDate },
        });
    }

    if (currentOccupancy.occupantId) {
        await db.$queryRawUnsafe(
            "SELECT id FROM `user` WHERE id = ? FOR UPDATE",
            currentOccupancy.occupantId,
        );
        await db.occupantDetails.updateMany({
            where: { userId: currentOccupancy.occupantId },
            data: {
                status: ProfileStatus.DEACTIVE,
                moveOutDate: atDate,
            },
        });
    }

    const waitingReservation = await db.invoice.findFirst({
        where: {
            roomId,
            waitingForRoomVacant: true,
            isDpReservation: true,
            periodEnd: { gt: atDate },
        },
        orderBy: { periodStart: "asc" },
    });

    let activatedReservation = null as Awaited<typeof waitingReservation> | null;

    if (waitingReservation) {
        await db.invoice.update({
            where: { id: waitingReservation.id },
            data: {
                waitingForRoomVacant: false,
                isDpReservation: false,
                priorOccupantId: null,
            },
        });

        await normalizeActivatedReservationPeriod(
            db,
            waitingReservation.id,
            waitingReservation.periodStart,
            atDate,
        );

        if (waitingReservation.occupantId) {
            await db.$queryRawUnsafe(
                "SELECT id FROM `user` WHERE id = ? FOR UPDATE",
                waitingReservation.occupantId,
            );
            await db.occupantDetails.updateMany({
                where: { userId: waitingReservation.occupantId },
                data: {
                    status: ProfileStatus.ACTIVE,
                    moveInDate: atDate,
                    moveOutDate: null,
                },
            });
        }

        activatedReservation = await db.invoice.findUnique({
            where: { id: waitingReservation.id },
        });
    }

    const nextState = await recalculateRoomProjection(db, roomId, atDate);

    return {
        releasedOccupancy: currentOccupancy,
        activatedReservation,
        status: nextState.status,
    };
}

export async function releaseCurrentOccupancyForOccupant(
    db: DbClient,
    occupantId: string,
    atDate: Date = new Date(),
) {
    await db.$queryRawUnsafe(
        "SELECT id FROM `user` WHERE id = ? FOR UPDATE",
        occupantId,
    );

    const currentOccupancy = await getCurrentOccupancyByOccupantId(db, occupantId, atDate);

    if (!currentOccupancy) {
        return {
            roomId: null,
            releasedOccupancy: null,
            activatedReservation: null,
            status: null,
        };
    }

    const released = await releaseCurrentRoomOccupancy(db, currentOccupancy.roomId, atDate);

    return {
        roomId: currentOccupancy.roomId,
        ...released,
    };
}
