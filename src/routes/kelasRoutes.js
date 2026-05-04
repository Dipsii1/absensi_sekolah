const express = require("express");
const router = express.Router();
const kelasControllers = require("../controllers/kelasControllers");
const { verifyToken, checkRole} = require("../middleware/auth")

router.use(verifyToken);

router.get("/", kelasControllers.getAllKelas);
router.patch("/:id/assign-walas",checkRole("SUPER_ADMIN", "ADMIN"), kelasControllers.assignWalas);
router.post("/", checkRole("ADMIN", "SUPER_ADMIN"), kelasControllers.createKelas);
router.get("/:id", kelasControllers.getKelasById);
router.put("/:id", checkRole("ADMIN", "SUPER_ADMIN"), kelasControllers.updateKelas);
router.delete("/:id", checkRole("ADMIN", "SUPER_ADMIN"), kelasControllers.deleteKelas);

module.exports = router;