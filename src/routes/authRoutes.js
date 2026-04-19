const express = require("express");
const router = express.Router();
const authController = require("../controllers/authControllers");
const verifyToken = require("../middleware/verifyToken");
const checkRole = require("../middleware/checkRoles");

router.post("/register", verifyToken, checkRole("SUPER_ADMIN"), authController.register);
router.post("/login", authController.login);
router.post("/logout", verifyToken, authController.logout);
router.get("/me", verifyToken, authController.me);

module.exports = router;