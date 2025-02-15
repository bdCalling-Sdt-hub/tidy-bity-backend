const catchAsync = require("../../../shared/catchAsync");
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

const TaskController = {
  postTask,
};

module.exports = TaskController;
