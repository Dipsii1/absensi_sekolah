const express = require("express");
const router = express.Router();

const moodleController = require("../controllers/moodleControllers");
const { verifyToken } = require("../middleware/auth"); 

// Generate link auto-login ke Moodle LMS, dipakai tombol "Buka LMS" di dashboard siswa
router.get("/lms-url", verifyToken, moodleController.getLmsAutologinUrl);

module.exports = router;