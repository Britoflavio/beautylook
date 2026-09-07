import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6">
      <main className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">BeautyBook</h1>
        <p className="text-muted-foreground max-w-md">
          Tu página de turnos con cobro de seña por adelantado. Sin msgs de
          último momento, sin huecos en la agenda.
        </p>
      </main>
      <div className="flex gap-3">
        <Link href="/signup" className={buttonVariants()}>
          Crear mi página
        </Link>
        <Link
          href="/login"
          className={buttonVariants({ variant: "outline" })}
        >
          Ingresar
        </Link>
      </div>
    </div>
  );
}
