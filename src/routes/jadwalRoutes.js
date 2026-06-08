const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const jadwalControllers = require("../controllers/jadwalControllers");
const { verifyToken, checkRole } = require("../middleware/auth");
router.use(verifyToken);

router.get("/", jadwalControllers.getAllJadwal);
router.post("/", checkRole("ADMIN", "SUPER_ADMIN"), jadwalControllers.createJadwal);
router.post("/import", checkRole("ADMIN", "SUPER_ADMIN"), upload.single("file"), jadwalControllers.importJadwal);
router.put("/:id", checkRole("ADMIN", "SUPER_ADMIN"), jadwalControllers.updateJadwal);
router.delete("/:id", checkRole("ADMIN", "SUPER_ADMIN"), jadwalControllers.deleteJadwal);

module.exports = router;