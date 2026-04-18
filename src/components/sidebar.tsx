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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-indigo-600" />
          <span className="font-bold text-sm text-gray-900">
            Recipe RE
          </span>
        </Link>
        <p className="text-[10px] text-gray-400 mt-0.5">Reverse Engineering Suite</p>
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
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
