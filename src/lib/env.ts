import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  MP_APP_ID: z.string().optional(),
  MP_CLIENT_SECRET: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),
  MP_ENCRYPTION_KEY: z.string().min(20),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  CRON_SECRET: z.string().min(8),
  DEV_SIMULATE_WEBHOOK: z.string().optional(),
});

export function validateEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`Env validation failed: ${msg}`);
  }
  return parsed.data;
}
