const express = require("express");
const router = express.Router();
const kelasControllers = require("../controllers/kelasControllers");

router.get("/", kelasControllers.getAllKelas);
router.patch("/:id/assign-walas", kelasControllers.assignWalas);
router.post("/", kelasControllers.createKelas);
router.get("/:id", kelasControllers.getKelasById);
router.put("/:id", kelasControllers.updateKelas);
router.delete("/:id", kelasControllers.deleteKelas);

module.exports = router;