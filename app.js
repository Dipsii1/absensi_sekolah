// Pastikan Node pakai zona waktu tetap (jalankan sebelum module pertama yang memakai Date).
// Jika env TZ sudah diset (mis. di luar/docker), jangan timpa.
process.env.TZ = process.env.TZ || 'Asia/Jakarta';

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
require('dotenv').config();

var indexRouter = require('./src/routes/index');
var tahunRoutes = require('./src/routes/tahunRoutes');
var mapelRoutes = require('./src/routes/mapelRoutes');
var guruRoutes = require('./src/routes/guruRoutes');
var orangTuaRoutes = require('./src/routes/orangTuaRoutes')
var kelasRoutes = require('./src/routes/kelasRoutes')
var jadwalRoutes = require('./src/routes/jadwalRoutes')
var rfidRoutes = require('./src/routes/rfidRoutes')
var siswaRoutes = require('./src/routes/siswaRoutes');
var absensiSiswaRoutes = require('./src/routes/absensiSiswaRoutes');
var detailAbsensi = require('./src/routes/detailAbsensiRoutes')
var usersRoutes = require('./src/routes/usersRoutes');
var authRoutes = require('./src/routes/authRoutes');
var roleRoutes = require('./src/routes/roleRoutes');
var statusRequestRoutes = require('./src/routes/statusRequestRoutes');
var finalAbsensi = require ('./src/routes/finalAbsensiRoutes');
var rekapRoutes = require('./src/routes/rekapRoutes');
var exportRoutes = require('./src/routes/exportRoutes');

var app = express();

require('./src/workers/tapInWorker')
require('./src/workers/tapOutWorker')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors({
  origin: process.env.URL_FRONTEND || "http://localhost:4321",
  credentials: true,
  methods: ['GET', 'POST', 'PUT','PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// routes
app.use('/', indexRouter);
app.use('/api/v1/siswa', siswaRoutes);
app.use('/api/v1/tahun-ajaran', tahunRoutes);
app.use('/api/v1/mata-pelajaran', mapelRoutes);
app.use('/api/v1/guru', guruRoutes);
app.use('/api/v1/orang-tua', orangTuaRoutes)
app.use('/api/v1/kelas', kelasRoutes)
app.use('/api/v1/jadwal', jadwalRoutes)
app.use('/api/v1/rfid', rfidRoutes);
app.use('/api/v1/absensi-siswa', absensiSiswaRoutes);
app.use('/api/v1/detail-absensi', detailAbsensi)
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/role', roleRoutes);
app.use('/api/v1/status-request', statusRequestRoutes);
app.use('/api/v1/final-absensi', finalAbsensi);
app.use('/api/v1/rekap', rekapRoutes);
app.use('/api/v1/export', exportRoutes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;