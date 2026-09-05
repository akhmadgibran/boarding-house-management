import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gray-50 p-4 sm:p-8">

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-4rem)]">
        {children}
      </div>
    </main>
  );
}
