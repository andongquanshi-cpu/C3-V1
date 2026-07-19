import * as React from "react";
import { cn } from "@/lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn("flex h-11 w-full rounded-xl border border-input bg-background/70 px-3.5 py-2 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition-all focus-visible:border-primary/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/10 disabled:cursor-not-allowed disabled:opacity-50", className)}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export { Select };
