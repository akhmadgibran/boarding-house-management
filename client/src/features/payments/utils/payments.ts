import type {
    InvoiceRecord,
    PaymentStatus,
} from "@/features/payments/types/payments";

export function toISODate(date: Date) {
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatDate(value: string | null) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

export function buildCycleText(startDate: string) {
    if (!startDate) {
        return "Pilih tanggal mulai untuk melihat siklus.";
    }

    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
        return "Tanggal tidak valid.";
    }

    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const formatOptions: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Jakarta",
    };

    return `${start.toLocaleDateString("id-ID", formatOptions)} - ${end.toLocaleDateString("id-ID", formatOptions)} (1 Bulan)`;
}

export function getPaymentStatusFromAmount(
    paidAmount: number,
    billAmount: number,
): PaymentStatus {
    if (paidAmount <= 0) {
        return "BELUM_BAYAR";
    }

    if (paidAmount >= billAmount) {
        return "LUNAS";
    }

    return "NUNGGAK";
}

export function getPaymentBadge(payment: InvoiceRecord) {
    if (payment.waitingForRoomVacant) {
        return {
            label: "DP Nyicil",
            className: "bg-blue-100 text-blue-800",
        };
    }

    if (payment.status === "LUNAS") {
        return {
            label: "Lunas",
            className: "bg-emerald-100 text-emerald-800",
        };
    }

    if (payment.status === "NUNGGAK") {
        return {
            label: "Belum Lunas",
            className: "bg-amber-100 text-amber-800",
        };
    }

    return {
        label: "Belum Bayar",
        className: "bg-amber-100 text-amber-800",
    };
}

export function getRemainingAmount(payment: InvoiceRecord) {
    return Math.max(0, payment.billAmount - payment.paidAmount);
}

export function getPaymentProgress(payment: InvoiceRecord) {
    if (payment.billAmount <= 0) {
        return 0;
    }

    return Math.min(
        100,
        Math.round((payment.paidAmount / payment.billAmount) * 100),
    );
}

export function getPaymentYear(payment: InvoiceRecord) {
    // paymentDate no longer exists on InvoiceRecord; use startDateISO instead
    const date = new Date(payment.startDateISO);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return String(date.getFullYear());
}

export function getHistoryNote(payment: InvoiceRecord) {
    if (payment.installmentCount > 0) {
        return `${payment.installmentCount} cicilan tercatat sebelum lunas`;
    }

    if (payment.isDpReservation) {
        return "DP berhasil diubah menjadi pembayaran penuh";
    }

    return "Lunas sekali bayar";
}
