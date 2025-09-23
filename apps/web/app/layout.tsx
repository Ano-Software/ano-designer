import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ano Designer",
  description: "Area autenticada placeholder.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#0f4234] text-[#F5F7F8]">
        <main className="flex min-h-screen items-center justify-center p-6">{children}</main>
      </body>
    </html>
  );
}
