import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--button-primary)] text-[var(--button-primary-foreground)] shadow-sm hover:opacity-92",
        outline:
          "border border-[var(--border-soft)] bg-[var(--panel)] text-[var(--foreground)] hover:bg-[var(--panel-strong)]",
        ghost:
          "text-[var(--muted-foreground)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]",
        secondary:
          "bg-[var(--panel-strong)] text-[var(--foreground)] hover:opacity-92",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
