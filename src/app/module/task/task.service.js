const { default: status } = require("http-status");

const ApiError = require("../../../error/ApiError");
const QueryBuilder = require("../../../builder/queryBuilder");
const validateFields = require("../../../util/validateFields");
const dateTimeValidator = require("../../../util/dateTimeValidator");
const Task = require("./Task");
const User = require("../user/User");

const postTask = async (userData, payload) => {
  validateFields(payload, [
    "assignedTo",
    "taskName",
    "startDateStr",
    "startTimeStr",
    "endDateStr",
    "endTimeStr",
  ]);

  dateTimeValidator(payload.startDateStr, payload.startTimeStr);
  dateTimeValidator(payload.endDateStr, payload.endTimeStr);

  const employee = await User.findOne({
    _id: payload.assignedTo,
    employeeId: { $exists: true },
  }).lean();

  if (!employee)
    throw new ApiError(
      status.BAD_REQUEST,
      `No employee found with ID: ${payload.assignedTo}`
    );

  const startDateTime = new Date(
    `${payload.startDateStr} ${payload.startTimeStr}`
  );
  const endDateTime = new Date(`${payload.endDateStr} ${payload.endTimeStr}`);
  const dayOfWeek = startDateTime.toLocaleDateString("en-us", {
    weekday: "long",
  });

  const taskData = {
    user: userData.userId,
    assignedTo: payload.assignedTo,
    taskName: payload.taskName,
    startDateStr: payload.startDateStr,
    startTimeStr: payload.startTimeStr,
    endDateStr: payload.endDateStr,
    endTimeStr: payload.endTimeStr,
    dayOfWeek: payload.dayOfWeek,
    startDateTime,
    endDateTime,
    dayOfWeek,
    ...(payload.recurrence && { recurrence: payload.recurrence }),
    ...(payload.taskDetails && { taskDetails: payload.taskDetails }),
    ...(payload.additionalMessage && {
      additionalMessage: payload.additionalMessage,
    }),
  };

  const task = await Task.create(taskData);

  return task;
};

const getTask = async (userData, query) => {
  validateFields(query, ["taskId"]);

  const task = await Task.findById(query.taskId).populate([
    {
      path: "assignedTo",
      select: "firstName lastName email profile_image",
    },
  ]);

  if (!task) throw new ApiError(status.NOT_FOUND, "Task not found");

  return task;
};

const getMyTask = async (userData, query) => {
  const taskQuery = new QueryBuilder(
    Task.find({ user: userData.userId })
      .populate([
        {
          path: "assignedTo",
          select: "firstName lastName email profile_image workingDay",
        },
      ])
      .lean(),
    query
  )
    .search(["taskName"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([
    taskQuery.modelQuery,
    taskQuery.countTotal(),
  ]);

  return {
    meta,
    result,
  };
};

const getEmployeeSpecificTask = async (userData, query) => {
  const taskQuery = new QueryBuilder(
    Task.find({ assignedTo: userData.userId })
      .populate([
        {
          path: "assignedTo",
          select: "firstName lastName email profile_image workingDay",
        },
      ])
      .lean(),
    query
  )
    .search(["taskName"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([
    taskQuery.modelQuery,
    taskQuery.countTotal(),
  ]);

  return {
    meta,
    result,
  };
};

const getAllTask = async (userData, query) => {
  const taskQuery = new QueryBuilder(
    Task.find({})
      .populate([
        {
          path: "assignedTo",
          select: "firstName lastName email profile_image workingDay",
        },
      ])
      .lean(),
    query
  )
    .search(["taskName"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([
    taskQuery.modelQuery,
    taskQuery.countTotal(),
  ]);

  return {
    meta,
    result,
  };
};

const updateTask = async (userData, payload) => {
  validateFields(payload, ["taskId"]);

  if (
    payload.startDateStr ||
    payload.startTimeStr ||
    payload.startDateTime ||
    payload.endDateStr ||
    payload.endTimeStr ||
    payload.endDateTime ||
    payload.dayOfWeek
  )
    throw new ApiError(status.BAD_REQUEST, "Schedule can not be changed");

  const updateData = {
    ...payload,
  };

  const updatedTask = await Task.findOneAndUpdate(
    {
      _id: payload.taskId,
      user: userData.userId,
    },
    { ...updateData },
    { new: true, runValidators: true }
  ).lean();

  if (!updatedTask) throw new ApiError(status.NOT_FOUND, "Task not found");

  return updatedTask;
};

const deleteTask = async (userData, payload) => {
  validateFields(payload, ["taskId"]);

  const result = await Task.deleteOne({ _id: payload.taskId });

  if (!result.deletedCount)
    throw new ApiError(status.NOT_FOUND, "Task not found");

  return result;
};

const TaskService = {
  postTask,
  getTask,
  getMyTask,
  getEmployeeSpecificTask,
  getAllTask,
  updateTask,
  deleteTask,
};

module.exports = TaskService;
