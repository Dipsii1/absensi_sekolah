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

router.get("/",        getAllJadwal);
router.post("/",       createJadwal);
router.post("/import", upload.single("file"), importJadwal);
router.put("/:id",     updateJadwal);
router.delete("/:id",  deleteJadwal);

module.exports = router;