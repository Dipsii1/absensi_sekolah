const express = require("express");
const router = express.Router();
const guruControllers = require("../controllers/guruControllers");
const { verifyToken, checkRole} = require("../middleware/auth");

router.use(verifyToken);

router.get("/", guruControllers.getAllGuru);
router.get("/walas",guruControllers.getGuruWalas);
router.get("/:id", guruControllers.getGuruById);
router.post("/",checkRole("ADMIN", "SUPER_ADMIN"), guruControllers.createGuru);
router.put("/:id", checkRole("ADMIN", "SUPER_ADMIN"), guruControllers.updateGuru);
router.delete("/:id", checkRole("ADMIN", "SUPER_ADMIN"), guruControllers.deleteGuru);

module.exports = router;