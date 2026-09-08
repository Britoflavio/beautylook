import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const alertVariants = cva(
  "relative flex w-full items-start gap-2.5 rounded-xl border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:shrink-0 [&>svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border",
        info: "border-primary/30 bg-primary/5 text-foreground",
        success: "border-[oklch(0.55_0.12_150)]/30 bg-[oklch(0.55_0.12_150)]/10 text-foreground",
        warning: "border-amber-500/40 bg-amber-500/10 text-foreground",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-medium leading-snug", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
