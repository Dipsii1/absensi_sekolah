process.env.TZ = process.env.TZ || 'Asia/Jakarta'

import createError from 'http-errors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'
import 'dotenv/config'

import indexRouter from './src/routes/index'
import tahunRoutes from './src/routes/tahunRoutes'
import mapelRoutes from './src/routes/mapelRoutes'
import guruRoutes from './src/routes/guruRoutes'
import orangTuaRoutes from './src/routes/orangTuaRoutes'
import kelasRoutes from './src/routes/kelasRoutes'
import jadwalRoutes from './src/routes/jadwalRoutes'
import rfidRoutes from './src/routes/rfidRoutes'
import siswaRoutes from './src/routes/siswaRoutes'
import absensiSiswaRoutes from './src/routes/absensiSiswaRoutes'
import detailAbsensi from './src/routes/detailAbsensiRoutes'
import usersRoutes from './src/routes/usersRoutes'
import authRoutes from './src/routes/authRoutes'
import roleRoutes from './src/routes/roleRoutes'
import statusRequestRoutes from './src/routes/statusRequestRoutes'
import finalAbsensi from './src/routes/finalAbsensiRoutes'
import rekapRoutes from './src/routes/rekapRoutes'
import exportRoutes from './src/routes/exportRoutes'
import moodleRoutes from './src/routes/moodleRoutes'
import kenaikanKelasRoutes from './src/routes/kenaikanKelasRoutes'

require('./src/workers/tapInWorker')
require('./src/workers/tapOutWorker')
require('./src/cron/tahunAjaran')

const app = express()

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger((tokens, req, res) => {
  const now = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date()).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1')
  return `${now} WIB ${tokens.method(req, res)} ${tokens.url(req, res)} ${tokens.status(req, res)} ${tokens['response-time'](req, res)} ms`
}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use(
  cors({
    origin: process.env.URL_FRONTEND || 'http://localhost:4321',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-ysbo-token'],
  })
)

app.use('/', indexRouter)
app.use('/api/v1/siswa', siswaRoutes)
app.use('/api/v1/tahun-ajaran', tahunRoutes)
app.use('/api/v1/mata-pelajaran', mapelRoutes)
app.use('/api/v1/guru', guruRoutes)
app.use('/api/v1/orang-tua', orangTuaRoutes)
app.use('/api/v1/kelas', kelasRoutes)
app.use('/api/v1/jadwal', jadwalRoutes)
app.use('/api/v1/rfid', rfidRoutes)
app.use('/api/v1/absensi-siswa', absensiSiswaRoutes)
app.use('/api/v1/detail-absensi', detailAbsensi)
app.use('/api/v1/users', usersRoutes)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/role', roleRoutes)
app.use('/api/v1/status-request', statusRequestRoutes)
app.use('/api/v1/final-absensi', finalAbsensi)
app.use('/api/v1/rekap', rekapRoutes)
app.use('/api/v1/export', exportRoutes)
app.use('/api/v1/moodle', moodleRoutes)
app.use('/api/v1/kenaikan-kelas', kenaikanKelasRoutes)

app.use((req, res, next) => {
  next(createError(404))
})

app.use((err: Error & { status?: number }, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}
  res.status(err.status || 500)
  res.render('error')
})

export default app