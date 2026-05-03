const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  getAllJadwal,
  createJadwal,
  updateJadwal,
  deleteJadwal,
  importJadwal,
} = require("../controllers/jadwalControllers");

router.get("/", jadwalControllers.getAllJadwal);
router.post("/", jadwalControllers.createJadwal);
router.post("/import", jadwalControllers.uploadXlsx.single("file"), jadwalControllers.importJadwal);
router.put("/:id", jadwalControllers.updateJadwal);
router.delete("/:id", jadwalControllers.deleteJadwal);

module.exports = router;