"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Leaf,
  FlaskConical,
  ListChecks,
  TestTube,
  BarChart3,
  Paperclip,
  Settings,
  HelpCircle,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/target", label: "Target Product", icon: Target },
  { href: "/ingredients", label: "Ingredients", icon: Leaf },
  { href: "/formulas", label: "Formulas", icon: FlaskConical },
  { href: "/protocols", label: "Protocols", icon: ListChecks },
  { href: "/trials", label: "Trials", icon: TestTube },
  { href: "/analysis", label: "Analysis", icon: BarChart3 },
  { href: "/attachments", label: "Notes & Files", icon: Paperclip },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Guide", icon: HelpCircle },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-56 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <FlaskConical className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
              Recipe RE
            </span>
          </Link>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            Reverse Engineering Suite
          </p>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </aside>
    </>
  );
}
