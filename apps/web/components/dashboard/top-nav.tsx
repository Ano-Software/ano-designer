"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { cn } from "@/lib/cn";

const navLinks = [
  { href: "/dashboard", label: "Início" },
  { href: "/criar", label: "Criar" },
  { href: "/projetos", label: "Projetos" },
  { href: "/relatorio", label: "Relatório" },
] as const;

type NavLink = (typeof navLinks)[number];

type DashboardTopNavProps = {
  user: {
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null;
};

type DropdownItem = {
  label: string;
  href?: string;
  onSelect?: () => void | Promise<void>;
};

const dropdownItems: DropdownItem[] = [
  { label: "Perfil", href: "/perfil" },
  { label: "Aulas", href: "/aulas" },
  { label: "Planos", href: "/planos" },
];

function getInitials(user: DashboardTopNavProps["user"]) {
  if (!user) {
    return "";
  }

  const rawUsername = (user.user_metadata as Record<string, unknown> | undefined)?.username;
  const base =
    typeof rawUsername === "string" && rawUsername.trim().length > 0
      ? rawUsername
      : (user.email ?? "");

  if (!base) {
    return "";
  }

  const parts = base.split(/[\s@._-]+/).filter(Boolean);
  const firstChar = parts[0]?.charAt(0) ?? base.charAt(0);
  const secondChar =
    parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : (parts[0]?.charAt(1) ?? base.charAt(1));

  return `${(firstChar ?? "").trim()}${(secondChar ?? "").trim()}`.toUpperCase().slice(0, 2);
}

export function DashboardTopNav({ user }: DashboardTopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initials = getInitials(user);
  const displayName =
    (typeof (user?.user_metadata as Record<string, unknown> | undefined)?.username === "string"
      ? ((user?.user_metadata as Record<string, unknown>)?.username as string)
      : user?.email) ?? "";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      router.replace("/login");
    }
  };

  const menuItems: DropdownItem[] = [...dropdownItems, { label: "Sair", onSelect: handleSignOut }];

  const handleItemSelect = async (item: DropdownItem) => {
    setIsMenuOpen(false);

    if (item.onSelect) {
      await item.onSelect();
      return;
    }

    if (item.href) {
      router.push(item.href);
    }
  };

  const renderNavLink = (link: NavLink) => {
    const isActive = pathname === link.href;

    return (
      <Link
        key={link.href}
        href={link.href}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200",
          isActive
            ? "bg-[#e2b23b] text-[#0c2016]"
            : "text-white/70 hover:bg-white/10 hover:text-white"
        )}
      >
        {link.label}
      </Link>
    );
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#10261b]/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center" aria-label="Ir para o dashboard">
          <Image
            src="/logo-ano.png"
            width={40}
            height={40}
            alt="Ano Designer"
            className="h-9 w-auto"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Menu principal">
          {navLinks.map(renderNavLink)}
        </nav>

        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-2 md:hidden" aria-label="Menu principal">
            {navLinks.slice(0, 2).map(renderNavLink)}
          </nav>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2b23b]"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
            >
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e2b23b]/20 text-sm font-bold uppercase text-[#e2b23b]"
              >
                {initials || ""}
              </span>
              <span className="hidden text-left text-xs font-semibold leading-tight text-white/70 sm:block">
                {displayName}
              </span>
            </button>

            {isMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-[#112a1f] p-2 shadow-2xl ring-1 ring-black/5"
              >
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => void handleItemSelect(item)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                    role="menuitem"
                  >
                    {item.label}
                    {item.label === "Sair" ? <span aria-hidden>{">"}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
