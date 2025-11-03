import pino from 'pino'
import { getApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { env } from '../config/env'
import '../config/firebaseAdmin'

const logger = pino({ level: env.LOG_LEVEL })

async function removeImagesFieldFromRoles() {
  const db = env.FIRESTORE_DB_ID ? getFirestore(getApp(), env.FIRESTORE_DB_ID) : getFirestore()
  const collection = db.collection('roles')
  let processed = 0
  let updated = 0
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined

  logger.info('Iniciando limpeza: remoção do campo "images" dos documentos da coleção roles')

  while (true) {
    let query: FirebaseFirestore.Query = collection.orderBy('__name__').limit(500)
    if (lastDoc) {
      query = query.startAfter(lastDoc)
    }

    const snap = await query.get()
    if (snap.empty) break

    for (const doc of snap.docs) {
      const data = doc.data() as any
      processed++
      if (Object.prototype.hasOwnProperty.call(data, 'images')) {
        try {
          await doc.ref.update({ images: FieldValue.delete() })
          updated++
          if (updated % 50 === 0) {
            logger.info({ updated }, 'Progresso da limpeza: documentos atualizados até agora')
          }
        } catch (err) {
          logger.error({ id: doc.id, err }, 'Falha ao remover campo "images" deste documento')
        }
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1]
  }

  logger.info({ processed, updated }, 'Limpeza concluída: total processado e total com "images" removido')
}

removeImagesFieldFromRoles()
  .then(() => {
    logger.info('Script finalizado com sucesso')
    process.exit(0)
  })
  .catch((err) => {
    logger.error({ err }, 'Script finalizado com erro')
    process.exit(1)
  })