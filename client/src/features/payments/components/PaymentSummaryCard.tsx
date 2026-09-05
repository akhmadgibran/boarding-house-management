type PaymentSummaryCardTone =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger";

type PaymentSummaryCardProps = {
  label: string;
  value: string | number;
  helper: string;
  tone?: PaymentSummaryCardTone;
};

const toneMap: Record<
  PaymentSummaryCardTone,
  {
    badge: string;
    value: string;
  }
> = {
  default: {
    badge: "bg-gray-100 text-gray-600",
    value: "text-gray-900",
  },
  info: {
    badge: "bg-blue-100 text-blue-700",
    value: "text-blue-700",
  },
  success: {
    badge: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-700",
  },
  warning: {
    badge: "bg-amber-100 text-amber-700",
    value: "text-amber-700",
  },
  danger: {
    badge: "bg-rose-100 text-rose-700",
    value: "text-rose-700",
  },
};

export function PaymentSummaryCard({
  label,
  value,
  helper,
  tone = "default",
}: PaymentSummaryCardProps) {
  const styles = toneMap[tone];

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${styles.badge}`}
      >
        {label}
      </span>
      <p className={`mt-4 text-2xl font-semibold tabular-nums ${styles.value}`}>
        {value}
      </p>
      <p className="mt-2 text-sm text-gray-500">{helper}</p>
    </article>
  );
}
