"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assistant", label: "Assistant IA" },
  { href: "/document", label: "Document" },
];

export default function AppNavbar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  if (pathname === "/auth" || pathname === "/") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-[#e8e2d8] bg-[#f7f4ee]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1450px] items-center justify-between px-4 py-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-2xl border border-[#e8e2d8] bg-white px-4 py-2 shadow-sm"
          >
            <span className="text-xl">⚖️</span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Lexia</p>
              <p className="text-xs text-slate-500">Vos statuts en minutes</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#0f766e] text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/assistant"
            className="hidden rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-[#e8e2d8] transition hover:bg-[#fcfbf8] md:inline-flex"
          >
            Nouveau dossier
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-2xl border border-[#e8e2d8] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#fcfbf8]"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="border-t border-[#eee7db] px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-[1450px] gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#0f766e] text-white"
                    : "border border-[#e8e2d8] bg-white text-slate-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}