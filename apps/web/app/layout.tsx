import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ANO Designer",
  description: "Plataforma colaborativa para equipes de produto e design.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#040f0b] text-white antialiased">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
