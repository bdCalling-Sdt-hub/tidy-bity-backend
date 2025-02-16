const catchAsync = require("../../../shared/catchAsync");
const sendResponse = require("../../../shared/sendResponse");
const TaskService = require("./task.service");

const postTask = catchAsync(async (req, res) => {
  const result = await TaskService.postTask(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Task posted successfully",
    data: result,
  });
});

const getTask = catchAsync(async (req, res) => {
  const result = await TaskService.getTask(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Task retrieved successfully",
    data: result,
  });
});

const getMyTask = catchAsync(async (req, res) => {
  const result = await TaskService.getMyTask(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Task retrieved successfully",
    data: result,
  });
});

const getEmployeeSpecificTask = catchAsync(async (req, res) => {
  const result = await TaskService.getEmployeeSpecificTask(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Task retrieved successfully",
    data: result,
  });
});

const getAllTask = catchAsync(async (req, res) => {
  const result = await TaskService.getAllTask(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Task retrieved successfully",
    data: result,
  });
});

const updateTask = catchAsync(async (req, res) => {
  const result = await TaskService.updateTask(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Task updated successfully",
    data: result,
  });
});

const deleteTask = catchAsync(async (req, res) => {
  const result = await TaskService.deleteTask(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Task deleted successfully",
    data: result,
  });
});

const TaskController = {
  postTask,
  getTask,
  getMyTask,
  getEmployeeSpecificTask,
  getAllTask,
  updateTask,
  deleteTask,
};

module.exports = TaskController;
