"use client";

import { cn } from "@/lib/utils";

export function BreadCrumb({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-start gap-2 text-gray-900 text-2xl font-bold",
        className
      )}
    >
      Sample Test Agent
    </div>
  );
}
