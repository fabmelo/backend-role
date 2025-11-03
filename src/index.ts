import pino from 'pino'
import { env } from './config/env'
const logger = pino({ level: env.LOG_LEVEL })
import app from './app'

const port = env.PORT_NUMBER
app.listen(port, () => {
  logger.info({ port }, 'Backend server started')
})