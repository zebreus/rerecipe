"use client";

import { useState } from "react";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { Sidebar } from "@/components/sidebar";
import { FlaskConical, Menu } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
      <StoreProvider>
        <div className="flex h-full">
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile header */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 lg:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Menu className="h-5 w-5" />
              </button>
              <FlaskConical className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                Recipe RE
              </span>
            </div>
            <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
              <div className="mx-auto max-w-6xl p-6">{children}</div>
            </main>
          </div>
        </div>
      </StoreProvider>
    </ThemeProvider>
  );
}
