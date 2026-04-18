"use client";

import { StoreProvider } from "@/lib/store";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <div className="flex h-full">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="mx-auto max-w-6xl p-6">{children}</div>
        </main>
      </div>
    </StoreProvider>
  );
}
