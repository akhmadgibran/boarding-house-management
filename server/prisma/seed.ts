import {
    PrismaClient,
    Role,
    ProfileStatus,
    RoomStatus,
    AssetStatus,
    PaymentStatus,
    TransactionType,
    ExpenseCategory,
    OccupantOccupation,
    PaymentMethod
} from "@prisma/client";
import bcrypt from "bcrypt";
import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
const adapter = new PrismaMariaDb(`${process.env.DATABASE_URL}`);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Memulai proses seeding data untuk Boarding House Management System...");

    console.log("🧹 Membersihkan data lama...");
    await prisma.invoicePayment.deleteMany();
    await prisma.financialRecord.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.complaint.deleteMany();
    await prisma.assetMaintenanceLog.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.assetMaster.deleteMany();
    await prisma.occupantDetails.deleteMany();
    await prisma.operatorDetails.deleteMany();
    await prisma.roomOccupancySnapshot.deleteMany();
    await prisma.room.deleteMany();
    await prisma.user.deleteMany();

    const defaultPassword = await bcrypt.hash("password123", 10);

    console.log("🏠 Membuat data kamar (Rooms)...");
    const roomNames = [
        "Kamar A1", "Kamar A2", "Kamar A3", "Kamar A4", "Kamar A5", "Kamar A6", "Kamar A7", "Kamar A8", "Kamar A9",
        "Kamar B1", "Kamar B2", "Kamar B3", "Kamar B4", "Kamar B5", "Kamar B6", "Kamar B7"
    ];
    
    const rooms = [];
    for (const name of roomNames) {
        const price = name.includes("A") ? (parseInt(name.replace("Kamar A", "")) % 2 === 0 ? 400000 : 475000) : 400000;
        const room = await prisma.room.create({
            data: {
                name,
                price,
                status: RoomStatus.VACANT,
            }
        });
        rooms.push(room);
    }

    console.log("🛏️ Membuat Master Aset...");
    const masterNames = [
        "Kasur Spon", "Dipan Kasur Kayu", "Lemari Kayu", "Meja Kayu", 
        "Kipas Angin", "Dinding", "Pintu dan Jendela Kayu", "Lampu", "Stop Kontak"
    ];

    const assetMasters = [];
    for (const name of masterNames) {
        const am = await prisma.assetMaster.create({ data: { name } });
        assetMasters.push(am);
    }

    console.log("📦 Mengalokasikan aset ke setiap kamar...");
    for (const room of rooms) {
        await prisma.asset.createMany({
            data: assetMasters.map((master) => ({
                assetMasterId: master.id,
                roomId: room.id,
                name: master.name,
                details: "-",
                status: AssetStatus.GOOD
            }))
        });
    }

    console.log("👥 Membuat akun Admin & Operator...");
    await prisma.user.create({
        data: {
            email: "admin@kost.com",
            password: defaultPassword,
            role: Role.ADMIN,
        },
    });

    await prisma.user.create({
        data: {
            email: "operator@kost.com",
            password: defaultPassword,
            role: Role.OPERATOR,
            operatorDetails: {
                create: {
                    name: "Budi Operator",
                    phoneNumber: "081234567890",
                    address: "Jl. Pengelola No. 1",
                    status: ProfileStatus.ACTIVE,
                },
            },
        },
    });

    console.log("🧑‍🤝‍🧑 Membuat akun Penghuni dan melakukan Check-In...");
    const occupantData = [
        { name: "Alfi", roomName: "Kamar A2" },
        { name: "Dinda", roomName: "Kamar A4" },
        { name: "Siti", roomName: "Kamar B4" },
        { name: "Budi", roomName: "Kamar B5" },
    ];

    const createdOccupants = [];
    for (let i = 0; i < occupantData.length; i++) {
        const data = occupantData[i];
        
        const occupant = await prisma.user.create({
            data: {
                email: `${data.name.toLowerCase()}@gmail.com`,
                password: defaultPassword,
                role: Role.OCCUPANT,
                occupantDetails: {
                    create: {
                        name: `${data.name} (${data.roomName.replace("Kamar ", "")})`,
                        phoneNumber: `08990000000${i}`,
                        address: "-",
                        occupation: OccupantOccupation.BEKERJA,
                        status: ProfileStatus.ACTIVE,
                        moveInDate: new Date("2025-01-01"),
                    },
                },
            },
        });
        
        createdOccupants.push({ user: occupant, roomName: data.roomName });

        await prisma.room.update({
            where: { name: data.roomName },
            data: { status: RoomStatus.OCCUPIED }
        });
    }

    console.log("💰 Memproses tagihan dan transaksi pembayaran...");
    for (const occ of createdOccupants) {
        const room = rooms.find(r => r.name === occ.roomName);
        if (!room) continue;

        const periodStart = new Date();
        periodStart.setDate(1);
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const invoice = await prisma.invoice.create({
            data: {
                roomId: room.id,
                occupantId: occ.user.id,
                priceApplied: room.price,
                paidNominal: room.price,
                periodStart,
                periodEnd,
                status: PaymentStatus.PAID,
                note: `Tagihan sewa ${room.name} periode bulan ini`,
            }
        });

        const payment = await prisma.payment.create({
            data: {
                occupantId: occ.user.id,
                amount: room.price,
                paymentMethod: PaymentMethod.TRANSFER,
                note: "Lunas transfer bank"
            }
        });

        await prisma.invoicePayment.create({
            data: {
                invoiceId: invoice.id,
                paymentId: payment.id,
                amountApplied: room.price
            }
        });

        await prisma.financialRecord.create({
            data: {
                type: TransactionType.INCOME,
                amount: room.price,
                description: `Pembayaran sewa ${room.name} oleh ${occ.user.email}`,
                paymentId: payment.id,
            }
        });
    }

    console.log("📉 Mencatat data pengeluaran operasional (Expense)...");
    const expenses = [
        { amount: 550000, desc: "Listrik Token", category: ExpenseCategory.LISTRIK },
        { amount: 150000, desc: "Iuran Sampah & Keamanan", category: ExpenseCategory.LAIN_LAIN },
        { amount: 800000, desc: "Kost Odi (Pinjaman/Cicilan)", category: ExpenseCategory.BTN }
    ];

    for (const exp of expenses) {
        await prisma.financialRecord.create({
            data: {
                type: TransactionType.EXPENSE,
                amount: exp.amount,
                description: exp.desc,
                expenseCategory: exp.category,
            }
        });
    }

    console.log("✅ Proses Seeding Selesai dengan Sukses!");
}

main()
    .catch((e) => {
        console.error("❌ Terjadi kesalahan saat seeding:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
