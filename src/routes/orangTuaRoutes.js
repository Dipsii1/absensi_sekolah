const express = require("express");
const router = express.Router();
const ortuControllers = require("../controllers/orangtuaControllers");
const { verifyToken, checkRole} = require("../middleware/auth")
router.use(verifyToken);

router.get("/", ortuControllers.getAllOrangTua);
router.get("/:id", ortuControllers.getOrangTuaById)
router.post("/", checkRole("ADMIN", "SUPER_ADMIN"), ortuControllers.createOrangTua)
router.put("/:id", checkRole("ADMIN", "SUPER_ADMIN"), ortuControllers.updateOrangTua)
router.delete("/:id", checkRole("ADMIN", "SUPER_ADMIN"), ortuControllers.deleteOrangTua)

module.exports = router;
