const express = require("express");
const router = express.Router();
const jadwalControllers = require("../controllers/jadwalControllers");
const { verifyToken, checkRole } = require("../middleware/auth");

router.get("/", jadwalControllers.getAllJadwal);
router.post("/", verifyToken, checkRole(["admin"]), jadwalControllers.createJadwal);
router.put("/:id", verifyToken, checkRole(["admin"]), jadwalControllers.updateJadwal);
router.delete("/:id", verifyToken, checkRole(["admin"]), jadwalControllers.deleteJadwal);

module.exports = router;