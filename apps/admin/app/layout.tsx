import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "ANO Admin",
  description: "Painel administrativo do ANO Designer",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-[#0d1f18] text-white antialiased">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
