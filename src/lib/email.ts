import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM ?? "BeautyBook <onboarding@resend.dev>";

type EmailPayload = { to: string; subject: string; html: string; text?: string };

async function send(payload: EmailPayload) {
  const resend = getResend();
  if (!resend) return { skipped: true };
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    if (error) return { error: error.message };
    return { ok: true };
  } catch (e) {
    return { error: String(e) };
  }
}

export function bookingConfirmedEmail(params: {
  to: string;
  clientName: string;
  serviceName: string;
  startsAt: string;
  professionalName: string;
  professionalPhone: string;
  amount: string | number;
}) {
  const when = new Date(params.startsAt).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const subject = `¡Turno confirmado! ${params.serviceName} — ${when}`;
  const html = `<p>Hola ${params.clientName},</p><p>Tu turno <strong>${params.serviceName}</strong> con <strong>${params.professionalName}</strong> está confirmado para <strong>${when}</strong>.</p><p>Seña pagada. Si necesitás cancelar, hacelo con antelación para recuperar la seña.</p><p>WhatsApp: ${params.professionalPhone}</p><p>— BeautyBook</p>`;
  return send({ to: params.to, subject, html });
}

export function bookingCancelledEmail(params: {
  to: string;
  clientName: string;
  serviceName: string;
  startsAt: string;
  professionalName: string;
  reason: string;
  refundDue: boolean;
}) {
  const when = new Date(params.startsAt).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const subject = `Turno cancelado — ${params.serviceName} ${when}`;
  const refundLine = params.refundDue ? "<p>La seña será reembolsada por Mercado Pago (puede demorar unos días).</p>" : "<p>Según la política de cancelación, la seña no se reembolsa.</p>";
  const html = `<p>Hola ${params.clientName},</p><p>Tu turno <strong>${params.serviceName}</strong> con ${params.professionalName} del ${when} fue cancelado (${params.reason}).</p>${refundLine}<p>— BeautyBook</p>`;
  return send({ to: params.to, subject, html });
}

export function bookingPendingEmail(params: { to: string; clientName: string; serviceName: string; startsAt: string; holdExpiresAt: string }) {
  const when = new Date(params.startsAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const until = new Date(params.holdExpiresAt).toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit" });
  const subject = `Completá tu reserva — ${params.serviceName} ${when}`;
  const html = `<p>Hola ${params.clientName},</p><p>Reservamos tu turno <strong>${params.serviceName}</strong> para ${when}. Tenés hasta las ${until} para completar el pago de la seña.</p><p>— BeautyBook</p>`;
  return send({ to: params.to, subject, html });
}

export const __testables = { send };
