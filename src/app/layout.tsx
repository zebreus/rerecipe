import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "./app-shell";
import { SpaRedirectHandler } from "./spa-redirect";

export const metadata: Metadata = {
  title: "Recipe RE – Reverse Engineering Suite",
  description:
    "Reverse-engineer recipes from finished products. Formulation solver, protocol lab, and experiment tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">
        <SpaRedirectHandler />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
