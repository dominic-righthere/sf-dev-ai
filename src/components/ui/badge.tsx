import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-accent-blue/20 text-accent-blue",
        secondary: "border-transparent bg-bg-tertiary text-text-secondary",
        destructive: "border-transparent bg-accent-red/20 text-accent-red",
        success: "border-transparent bg-accent-green/20 text-accent-green",
        warning: "border-transparent bg-accent-amber/20 text-accent-amber",
        outline: "border-border-default text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
