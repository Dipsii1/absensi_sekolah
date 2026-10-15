const express = require("express");
const router = express.Router();
const kenaikanKelasControllers = require("../controllers/kenaikanKelasControllers");
const { verifyToken, checkRole } = require("../middleware/auth");

router.use(verifyToken);

router.get("/preview", kenaikanKelasControllers.getPreviewKenaikan);
router.post("/submit", kenaikanKelasControllers.submitKeputusanKenaikan);

module.exports = router;
