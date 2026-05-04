const express = require("express");
const router = express.Router();
const rfidControllers = require("../controllers/rfidControllers");
const { verifyToken, checkRole } = require("../middleware/auth")
router.use(verifyToken);


router.get("/", rfidControllers.getAllRfid);
router.get("/load-Rfid", rfidControllers.loadAllRfid);
router.get("/:id", rfidControllers.getRfidById);
router.post("/", checkRole("ADMIN", "SUPER_ADMIN"), rfidControllers.createRFID);
router.put("/:id", checkRole("ADMIN", "SUPER_ADMIN"), rfidControllers.updateRFID);
router.patch("/:id", checkRole("ADMIN", "SUPER_ADMIN"), rfidControllers.updateRFID);
router.delete("/:id", checkRole("ADMIN", "SUPER_ADMIN"), rfidControllers.deleteRFID);

module.exports = router;