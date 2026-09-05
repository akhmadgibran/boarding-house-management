"use client";

import type { ReactNode } from "react";

type CrudModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
};

export function CrudModal({
  title,
  description,
  onClose,
  children,
  maxWidthClass = "max-w-2xl",
}: CrudModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <section
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${maxWidthClass} overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
          >
            x
          </button>
        </header>

        <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
}
