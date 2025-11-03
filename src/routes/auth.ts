import { Router } from 'express'
import { adminAuth } from '../config/firebaseAdmin'
import { authMiddleware } from '../middlewares/auth'

// Router para endpoints de autenticação baseados em Firebase Admin
// OBS: Depende de um token Firebase válido (Authorization: Bearer <idToken>)
const router = Router()

// Retorna informações básicas do usuário autenticado
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const uid = (req as any).uid as string
    const user = await adminAuth.getUser(uid)
    res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      customClaims: user.customClaims || {},
      providerData: user.providerData?.map((p) => ({ providerId: p.providerId, uid: p.uid })) || [],
    })
  } catch (err) {
    next(err)
  }
})

export const authRoutes = router