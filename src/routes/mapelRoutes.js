const express = require("express");
const router = express.Router();
const mapelControllers = require("../controllers/mapelControllers");
const { verifyToken, checkRole } = require("../middleware/auth");

// Semua route wajib login
router.use(verifyToken);

router.get("/", mapelControllers.getAllMapel);
router.get("/:id", mapelControllers.getMapelById);

// Hanya SUPER_ADMIN yang bisa tulis
router.post("/", checkRole("SUPER_ADMIN"), mapelControllers.createMapel);
router.put("/:id", checkRole("SUPER_ADMIN"), mapelControllers.updateMapel);
router.delete("/:id", checkRole("SUPER_ADMIN"), mapelControllers.deleteMapel);

module.exports = router;