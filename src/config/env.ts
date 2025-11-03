import dotenv from 'dotenv'
import { z } from 'zod'

// Load environment variables from .env
dotenv.config()

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
  PORT: z.string().default('8080'),
  ALLOWED_ORIGINS: z
    .string()
    .default(
      [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5175',
      ].join(',')
    ),
  // Firestore multi-database support: leave empty to use the project's default database
  FIRESTORE_DB_ID: z.string().default(''),

  // Firebase Admin
  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID é obrigatório'),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('[env] Erro ao validar variáveis de ambiente:', parsed.error.flatten())
  throw new Error('Falha na validação das variáveis de ambiente')
}

export const env = {
  ...parsed.data,
  // Normalize private key line breaks if present
  FIREBASE_PRIVATE_KEY: parsed.data.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  PORT_NUMBER: Number(parsed.data.PORT),
  ALLOWED_ORIGINS_LIST: parsed.data.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
}