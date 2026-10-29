import { z } from 'zod';

const EnvironmentSchema = z
  .object({
    LIVEKIT_URL: z
      .string()
      .url()
      .refine((value) => new URL(value).protocol === 'wss:', 'LIVEKIT_URL must use wss://'),
    LIVEKIT_API_KEY: z.string().trim().min(1),
    LIVEKIT_API_SECRET: z.string().trim().min(1),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  })
  .transform((environment) => ({
    livekitUrl: environment.LIVEKIT_URL,
    livekitApiKey: environment.LIVEKIT_API_KEY,
    livekitApiSecret: environment.LIVEKIT_API_SECRET,
    port: environment.PORT,
  }));

export type ServerConfig = z.infer<typeof EnvironmentSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  return EnvironmentSchema.parse(environment);
}
