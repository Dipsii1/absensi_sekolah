const express = require("express");
const router = express.Router();
const usersControllers = require("../controllers/usersControllers");
const checkRole = require('../middleware/checkRoles')


router.get("/", usersControllers.getAllUsers);
router.get("/:id", usersControllers.getUserById);


// hanya super admin
router.put("/:id",checkRole("SUPER_ADMIN"), usersControllers.updateUser);

// delete hanya super admin
router.delete("/:id",checkRole("SUPER_ADMIN"), usersControllers.deleteUser);

module.exports = router;    