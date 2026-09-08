const express = require("express");
const router = express.Router();
const tahunControllers = require("../controllers/tahunControllers");
const { verifyToken, checkRole } = require("../middleware/auth");

router.get("/", verifyToken, tahunControllers.getAllTahunAjaran);
router.get("/:id", verifyToken, tahunControllers.getTahunAjaranById);

// hanya SUPER_ADMIN
router.post("/", verifyToken, checkRole("SUPER_ADMIN"), tahunControllers.createTahunAjaran);
router.put("/:id", verifyToken, checkRole("SUPER_ADMIN"), tahunControllers.updateTahunAjaran);
router.delete("/:id", verifyToken, checkRole("SUPER_ADMIN"), tahunControllers.deleteTahunAjaran);

module.exports = router;