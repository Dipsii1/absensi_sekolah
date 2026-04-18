const express = require("express");
const router = express.Router();
const {
  getAllRole,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} = require("../controllers/role.controller");
const verifyToken = require("../middleware/verifyToken");
const checkRole = require("../middleware/checkRoles");

router.use(verifyToken, checkRole("SUPER_ADMIN"));

router.get("/", getAllRole);
router.get("/:id", getRoleById);
router.post("/", createRole);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

module.exports = router;