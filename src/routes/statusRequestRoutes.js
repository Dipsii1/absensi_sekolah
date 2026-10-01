const express = require("express");
const router = express.Router();
const { createRequest, getPendingRequests, respondRequest } = require("../controllers/statusRequestControllers");

router.post("/", createRequest);
router.get("/pending", getPendingRequests);
router.patch("/:id/respond", respondRequest);

module.exports = router;
