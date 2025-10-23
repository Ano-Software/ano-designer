import type { ReactNode } from "react";
import { AdminHeader } from "@/components/AdminHeader";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 16px" }}>
      <AdminHeader />
      <main style={{ padding: "24px 0 40px" }}>{children}</main>
    </div>
  );
}
