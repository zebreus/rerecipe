import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "destructive" | "outline";
}) {
  const variants: Record<string, string> = {
    default: "border-transparent bg-gray-900 dark:bg-gray-100 text-gray-50 dark:text-gray-900 shadow",
    secondary: "border-transparent bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
    destructive: "border-transparent bg-red-500 text-gray-50 shadow",
    outline: "text-gray-950 dark:text-gray-100 border-gray-200 dark:border-gray-700",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
