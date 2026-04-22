const express = require("express");
const router = express.Router();
const guruControllers = require("../controllers/guruControllers");

router.get("/", guruControllers.getAllGuru);
router.get("/walas",guruControllers.getGuruWalas)
router.get("/:id", guruControllers.getGuruById);
router.post("/", guruControllers.createGuru);
router.put("/:id", guruControllers.updateGuru);
router.delete("/:id", guruControllers.deleteGuru);

module.exports = router;