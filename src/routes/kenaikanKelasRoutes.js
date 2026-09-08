const express = require("express");
const router = express.Router();
const kenaikanKelasControllers = require("../controllers/kenaikanKelasControllers");
const { verifyToken, checkRole } = require("../middleware/auth");

router.use(verifyToken);

router.get("/preview", checkRole("ADMIN", "SUPER_ADMIN"), kenaikanKelasControllers.getPreviewKenaikan);
router.post("/submit", checkRole("ADMIN", "SUPER_ADMIN"), kenaikanKelasControllers.submitKeputusanKenaikan);

module.exports = router;