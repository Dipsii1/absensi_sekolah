import http from 'http'
import debugFactory from 'debug'
import app from '../app'
import { initTelegramBot } from '../src/services/telegramServices'

const debug = debugFactory('absensi-sekolah:server')
const port = normalizePort(process.env.PORT || '3000')

app.set('port', port)

const server = http.createServer(app)
server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

server.on('listening', () => {
  try {
    initTelegramBot()
  } catch (error) {
    console.warn('[STARTUP] Telegram bot init skipped:', error instanceof Error ? error.message : String(error))
  }

  try {
    require('../src/cron/tahunAjaran')
    require('../src/cron/autoApproveStatus')
    require('../src/cron/auto-tapOut')
    require('../src/cron/autoFinalAbsensi')
  } catch (error) {
    console.warn('[STARTUP] Cron init skipped:', error instanceof Error ? error.message : String(error))
  }
})

function normalizePort(value: string): number | string | false {
  const parsed = parseInt(value, 10)
  if (Number.isNaN(parsed)) return value
  if (parsed >= 0) return parsed
  return false
}

function onError(error: NodeJS.ErrnoException) {
  if (error.syscall !== 'listen') throw error

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`)
      process.exit(1)
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`)
      process.exit(1)
    default:
      throw error
  }
}

function onListening() {
  const address = server.address()
  if (!address) return
  const bind = typeof address === 'string' ? `pipe ${address}` : `port ${address.port}`
  debug(`Listening on ${bind}`)
}