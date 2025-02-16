const auth = require("../../middleware/auth");
const express = require("express");
const config = require("../../../config");
const TaskController = require("./task.controller");

const router = express.Router();

router
  .post("/post-task", auth(config.auth_level.user), TaskController.postTask)
  .get("/get-task", auth(config.auth_level.employee), TaskController.getTask)
  .get(
    "/get-my-task",
    auth(config.auth_level.employee),
    TaskController.getMyTask
  )
  .get(
    "/get-employee-specific-task",
    auth(config.auth_level.employee),
    TaskController.getEmployeeSpecificTask
  )
  .get(
    "/get-all-task",
    auth(config.auth_level.admin),
    TaskController.getAllTask
  )
  .patch(
    "/update-task",
    auth(config.auth_level.user),
    TaskController.updateTask
  )
  .delete(
    "/delete-task",
    auth(config.auth_level.user),
    TaskController.deleteTask
  );

module.exports = router;
