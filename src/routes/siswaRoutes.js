const express = require("express");
const router = express.Router();
const siswaControllers = require("../controllers/siswaControllers");
const upload = require("../middleware/upload");
const { verifyToken, checkRole } = require("../middleware/auth");

router.post("/import", verifyToken, checkRole("ADMIN", "SUPER_ADMIN"), upload.single("file"), siswaControllers.importSiswa);
router.get("/", siswaControllers.getAllSiswa);
router.get("/:id", siswaControllers.getSiswaById);
router.post("/", verifyToken, checkRole("ADMIN", "SUPER_ADMIN"), siswaControllers.createSiswa);
router.put("/:id", verifyToken, checkRole("ADMIN", "SUPER_ADMIN"), siswaControllers.updateSiswa);
router.delete("/:id", verifyToken, checkRole("ADMIN", "SUPER_ADMIN"), siswaControllers.deleteSiswa);

module.exports = router;
