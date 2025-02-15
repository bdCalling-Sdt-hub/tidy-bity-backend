const auth = require("../../middleware/auth");
const express = require("express");
const config = require("../../../config");
const TaskController = require("./task.controller");

const router = express.Router();

router.post(
  "/post-task",
  auth(config.auth_level.admin),
  TaskController.postTask
);

module.exports = router;
