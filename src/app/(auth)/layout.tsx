import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 texture-grain opacity-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 glow-soft" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
            Beauty<span className="text-primary">Book</span>
          </Link>
        </div>
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        {children}
      </div>
    </div>
  );
}
