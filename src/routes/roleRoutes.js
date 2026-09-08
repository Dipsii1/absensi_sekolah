const express = require("express");
const router = express.Router();
const roleControllers = require("../controllers/roleControllers");
const { verifyToken, checkRole } = require("../middleware/auth");

router.use(verifyToken, checkRole("SUPER_ADMIN"));

router.get("/", roleControllers.getAllRole);
router.get("/:id", roleControllers.getRoleById);
router.post("/", roleControllers.createRole);
router.put("/:id", roleControllers.updateRole);
router.delete("/:id", roleControllers.deleteRole);

module.exports = router;