import { initializeApp, applicationDefault, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { env } from './env'

// Initialize Firebase Admin using service account or application default credentials
// Explicitly set projectId on the App options to avoid "Unable to detect a Project Id" issues
initializeApp(
  env.FIREBASE_PRIVATE_KEY && env.FIREBASE_CLIENT_EMAIL
    ? {
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY,
        }),
        projectId: env.FIREBASE_PROJECT_ID,
      }
    : { credential: applicationDefault(), projectId: env.FIREBASE_PROJECT_ID }
)

export const adminAuth = getAuth()