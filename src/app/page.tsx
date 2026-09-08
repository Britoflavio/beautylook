import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Clock,
  CreditCard,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const STEPS = [
  {
    icon: <CalendarCheck className="size-5" />,
    title: "Elegí tu servicio",
    text: "Cada profesional publica sus servicios, duración y precio. Tus clientas eligen en un clic.",
  },
  {
    icon: <Clock className="size-5" />,
    title: "Reservá el horario",
    text: "La agenda se muestra en tiempo real. Solo se ofrecen turnos realmente disponibles.",
  },
  {
    icon: <Wallet className="size-5" />,
    title: "Paga la seña",
    text: "La reserva se confirma con la seña por Mercado Pago, directo a la cuenta del profesional.",
  },
];

const FEATURES = [
  {
    icon: <ShieldCheck className="size-5" />,
    title: "Adiós a los no-shows",
    text: "La seña se cobra por adelantado. Si no asisten, no perdés el turno ni el dinero.",
  },
  {
    icon: <CalendarCheck className="size-5" />,
    title: "Tu propia página",
    text: "Una dirección elegante tipo tu-negocio.beautybook para compartir en tu Instagram o WhatsApp.",
  },
  {
    icon: <MessageCircle className="size-5" />,
    title: "Menos mensajes",
    text: "Sin coordinar por chat de madrugada. Tus clientas reservan solas, cuando quieren.",
  },
  {
    icon: <CreditCard className="size-5" />,
    title: "El dinero es tuyo",
    text: "Nosotros nunca tocamos los fondos. La seña va directo a tu cuenta de Mercado Pago.",
  },
];

const TESTIMONIALS = [
  {
    name: "Ana · Peluquería",
    quote:
      "Antes vivía contestando mensajes. Ahora mi agenda se llena sola y la seña me respalda.",
  },
  {
    name: "Caro · Manicuría",
    quote:
      "Mis clientas reservan desde el link de mi bio. Súper simple y se ve muy profesional.",
  },
  {
    name: "Damián · Barbería",
    quote:
      "Las señas me salvaron las semanas. Los que no vienen ya no me hacen perder plata.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 texture-grain opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] glow-soft" />

      <header className="relative z-10 border-b border-border/60 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight">
            Beauty<span className="text-primary">Book</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <Link href="#como-funciona" className="transition-colors hover:text-foreground">
              Cómo funciona
            </Link>
            <Link href="#beneficios" className="transition-colors hover:text-foreground">
              Beneficios
            </Link>
            <Link href="#cobros" className="transition-colors hover:text-foreground">
              Cómo se cobra
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Ingresar
            </Link>
            <Link
              href="/signup"
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              Crear mi página
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-xl">
              <Badge variant="secondary" className="mb-5 gap-1.5">
                <Sparkles className="size-3" /> Para profesionales de belleza
              </Badge>
              <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                Tu agenda llena,
                <br />
                <span className="text-primary">sin mensajes</span> de último
                momento.
              </h1>
              <p className="mt-6 max-w-md text-lg text-muted-foreground">
                BeautyBook te da una página de turnos propia con cobro de seña
                por adelantado. Sin no-shows, sin huecos, sin coordinar por
                chat.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className={buttonVariants({ size: "lg" })}
                >
                  Crear mi página gratis
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="#como-funciona"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Ver cómo funciona
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["Sin tarjeta de crédito", "Configurás en 5 minutos", "En español"].map(
                  (t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <Check className="size-4 text-primary" /> {t}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/15 to-accent/40 blur-2xl" />
              <div className="rotate-2 rounded-[1.75rem] border border-border/70 bg-card p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold">Ana Estética</p>
                    <p className="text-sm text-muted-foreground">Peluquería · Palermo</p>
                  </div>
                  <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="size-5" />
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {[
                    ["Corte + color", "120 min", "$ 25.000"],
                    ["Lavado + peinado", "60 min", "$ 10.000"],
                  ].map(([name, dur, price]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">{dur}</p>
                      </div>
                      <span className="font-medium text-primary">{price}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
                  <span className="text-sm">Turno reservado</span>
                  <span className="font-semibold">Vie 14 · 15:30</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="border-y border-border/60 bg-card/40 py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="secondary">Cómo funciona</Badge>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Reservar es tan simple como elegir
              </h2>
              <p className="mt-3 text-muted-foreground">
                Sin registro para tus clientas. Entran, eligen, pagan y listo.
              </p>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div
                  key={s.title}
                  className="relative rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
                >
                  <span className="font-display text-5xl font-semibold text-primary/15">
                    {i + 1}
                  </span>
                  <div className="mt-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {s.icon}
                  </div>
                  <h3 className="mt-4 font-medium">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="beneficios" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <Badge variant="secondary">Beneficios</Badge>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Diseñado para que ganes tiempo y dinero
                </h2>
                <p className="mt-3 max-w-md text-muted-foreground">
                  Todo lo que necesitás para dejar de perseguir clientes y
                  dedicarte a lo que te gusta.
                </p>
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  {FEATURES.map((f) => (
                    <div key={f.title} className="flex gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        {f.icon}
                      </div>
                      <div>
                        <h3 className="font-medium">{f.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {f.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div id="cobros" className="rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-5 text-primary" />
                  <h3 className="font-display text-xl font-semibold">
                    Cobrás la seña con Mercado Pago
                  </h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Conectás tu cuenta una vez y los pagos van directo a vos.
                  Nosotros solo facilitamos la reserva.
                </p>
                <ul className="mt-6 grid gap-3 text-sm">
                  {[
                    "Seña = precio del servicio, cobrada por adelantado.",
                    "Cancelación con aviso previo devuelve la seña automáticamente.",
                    "Tus clientas pagan con Mercado Pago, fácil y seguro.",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <div className="flex justify-center gap-1 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-5 fill-current" />
                ))}
              </div>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">
                Profesionales que ya viven mejor
              </h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure
                  key={t.name}
                  className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
                >
                  <blockquote className="text-muted-foreground">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-4 text-sm font-medium">
                    {t.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Tu página de turnos,
              <br />
              <span className="text-primary">lista en minutos.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Empezá gratis. Sin tarjeta de crédito, sin permanencia. Configurás
              tu perfil, tus servicios y listo.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                Crear mi página gratis
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span className="font-display text-base font-semibold text-foreground">
            BeautyBook
          </span>
          <span>Reservas y señas para profesionales de belleza.</span>
          <div className="flex items-center gap-4">
            <Link href="/signup" className="hover:text-foreground">
              Crear mi página
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Ingresar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
