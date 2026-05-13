const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const jadwalControllers = require("../controllers/jadwalControllers");
const { verifyToken, checkRole } = require("../middleware/auth");
router.use(verifyToken);

router.get("/", jadwalControllers.getAllJadwal);
router.post("/", checkRole("ADMIN", "SUPER ADMIN"), jadwalControllers.createJadwal);
router.post("/import", checkRole("ADMIN", "SUPER ADMIN"), upload.single("file"), jadwalControllers.importJadwal);
router.put("/:id", checkRole("ADMIN", "SUPER ADMIN"), jadwalControllers.updateJadwal);
router.delete("/:id", checkRole("ADMIN", "SUPER ADMIN"), jadwalControllers.deleteJadwal);

module.exports = router;