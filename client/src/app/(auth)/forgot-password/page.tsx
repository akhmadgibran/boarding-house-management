import Link from "next/link";

const recoverySteps = [
  {
    title: "Verifikasi",
    detail: "Masukkan email akun yang aktif.",
  },
  {
    title: "Confirm",
    detail: "Periksa tautan reset di email.",
  },
  {
    title: "Update",
    detail: "Atur kata sandi baru yang kuat.",
  },
];

const safetyTips = [
  "Gunakan kata sandi unik untuk setiap akun pengguna kost.",
  "Hindari membagikan tautan reset kepada pihak lain.",
  "Hubungi admin jika email reset tidak masuk dalam 5 menit.",
];

export default function ForgotPasswordPage() {
  return (
    <div className="auth-fade-in w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-7 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold tracking-wide text-gray-600">
          Pemulihan Akses
        </p>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
          3 Langkah Cepat
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-semibold leading-tight text-gray-900">
        Reset kata sandi akun Anda
      </h1>
      <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
        Masukkan email terdaftar untuk memulihkan akses akun admin, operator,
        atau penghuni di Sistem Informasi Kost.
      </p>

      <form className="mt-8 space-y-4">
        <div>
          <label
            htmlFor="recovery-email"
            className="text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M3.333 6.667 10 11.667l6.667-5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect
                  x="2.5"
                  y="4.167"
                  width="15"
                  height="11.667"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
            </span>
            <input
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pr-4 pl-10 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-4 focus:ring-gray-200"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-linear-to-r from-gray-900 to-gray-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-gray-800 hover:to-gray-700"
        >
          Kirim tautan reset
        </button>
      </form>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {recoverySteps.map((step, index) => (
          <div
            key={step.title}
            className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Langkah {index + 1}
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{step.title}</p>
            <p className="mt-1 text-xs text-gray-600">{step.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Tips keamanan</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-600">
          {safetyTips.map((tip) => (
            <li key={tip} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-500" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/login"
        className="mt-6 inline-flex text-sm font-medium text-gray-700 transition hover:text-gray-900"
      >
        Kembali ke login
      </Link>
    </div>
  );
}
