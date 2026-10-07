const express = require("express");
const router = express.Router();
const usersControllers = require("../controllers/usersControllers");
const {verifyToken, checkRole} = require ("../middleware/auth")

router.get("/", verifyToken, usersControllers.getAllUsers);
router.get("/:id", verifyToken, usersControllers.getUserById);

router.put("/:id", verifyToken, checkRole("SUPER_ADMIN"), usersControllers.updateUser);
router.delete("/:id", verifyToken, checkRole("SUPER_ADMIN"), usersControllers.deleteUser);

module.exports = router;