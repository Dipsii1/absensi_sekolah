import { Router } from 'express';

const router = Router();

router.get('/', function (req, res, next) {
  res.send('Welcome to backend absensi sekolah');
});

export default router;
