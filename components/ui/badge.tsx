import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[0.68rem] tracking-[0.16em] uppercase text-gold",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
