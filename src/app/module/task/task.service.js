const { default: status } = require("http-status");
const cron = require("node-cron");

const ApiError = require("../../../error/ApiError");
const QueryBuilder = require("../../../builder/queryBuilder");
const validateFields = require("../../../util/validateFields");
const dateTimeValidator = require("../../../util/dateTimeValidator");
const Task = require("./Task");
const User = require("../user/User");
const Grocery = require("../grocery/Grocery");
const Room = require("../Room/Room");
const postNotification = require("../../../util/postNotification");
const { TaskRecurrence, ENUM_USER_ROLE } = require("../../../util/enum");
const { logger } = require("../../../shared/logger");
const Notification = require("../notification/Notification");
const GroceryCategory = require("../grocery/GroceryCategory");

const postTask = async (userData, payload) => {
  validateFields(payload, [
    "assignedTo",
    "roomId",
    "taskName",
    "startDateStr",
    "startTimeStr",
    "endDateStr",
    "endTimeStr",
  ]);

  dateTimeValidator(payload.startDateStr, payload.startTimeStr);
  dateTimeValidator(payload.endDateStr, payload.endTimeStr);

  const [employee, room] = await Promise.all([
    User.findOne({
      _id: payload.assignedTo,
      employeeId: { $exists: true },
    }).lean(),
    Room.findOne({
      _id: payload.roomId,
    }).lean(),
  ]);

  if (!employee)
    throw new ApiError(
      status.BAD_REQUEST,
      `No employee found with ID: ${payload.assignedTo}`
    );
  if (!room)
    throw new ApiError(
      status.BAD_REQUEST,
      `No room found with ID: ${payload.roomId}`
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
    room: payload.roomId,
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

  postNotification(
    "New Task",
    "You have been assigned a new task",
    payload.assignedTo
  );

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

  postNotification(
    "Task Updated",
    "Task has been updated",
    updatedTask.assignedTo
  );
  postNotification("Task Updated", "Task has been updated", updatedTask.user);

  return updatedTask;
};

const updateTaskOrGroceryStatus = async (userData, payload) => {
  validateFields(payload, ["status"]);

  if (!payload.taskId && !payload.groceryId)
    throw new ApiError(status.BAD_REQUEST, "Must provide: taskId or groceryId");

  if (payload.taskId && payload.groceryId)
    throw new ApiError(status.BAD_REQUEST, "One needed: taskId or groceryId");

  const Model = payload.taskId ? Task : Grocery;
  const workId = payload.taskId ? payload.taskId : payload.groceryId;

  const result = await Model.findOneAndUpdate(
    { _id: workId },
    { status: payload.status },
    { new: true, runValidators: true }
  )
    .select("status assignedTo user")
    .lean();

  if (!result) throw new ApiError(status.NOT_FOUND, "Not found");

  postNotification("Task Updated", `Task ${result.status}`, result.assignedTo);
  postNotification("Task Updated", `Task ${result.status}`, result.user);

  return result;
};

const updateTaskOrGroceryWithNote = async (userData, payload) => {
  validateFields(payload, ["note"]);

  if (!payload.taskId && !payload.groceryId)
    throw new ApiError(status.BAD_REQUEST, "Must provide: taskId or groceryId");

  if (payload.taskId && payload.groceryId)
    throw new ApiError(status.BAD_REQUEST, "One needed: taskId or groceryId");

  const Model = payload.taskId ? Task : Grocery;
  const workId = payload.taskId ? payload.taskId : payload.groceryId;

  const result = await Model.findOneAndUpdate(
    { _id: workId },
    { note: payload.note },
    { new: true, runValidators: true }
  );

  if (!result) throw new ApiError(status.NOT_FOUND, "Not found");

  return result;
};

const deleteTask = async (userData, payload) => {
  validateFields(payload, ["taskId"]);

  const result = await Task.deleteOne({ _id: payload.taskId });

  if (!result.deletedCount)
    throw new ApiError(status.NOT_FOUND, "Task not found");

  return result;
};

const postGrocery = async (userData, payload) => {
  validateFields(payload, [
    "assignedTo",
    "groceryName",
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

  const groceryData = {
    user: userData.userId,
    assignedTo: payload.assignedTo,
    groceryName: payload.groceryName,
    startDateStr: payload.startDateStr,
    startTimeStr: payload.startTimeStr,
    endDateStr: payload.endDateStr,
    endTimeStr: payload.endTimeStr,
    dayOfWeek: payload.dayOfWeek,
    startDateTime,
    endDateTime,
    dayOfWeek,
    ...(payload.recurrence && { recurrence: payload.recurrence }),
    ...(payload.groceryDetails && { groceryDetails: payload.groceryDetails }),
    ...(payload.additionalMessage && {
      additionalMessage: payload.additionalMessage,
    }),
  };

  postNotification(
    "New grocery",
    "You have been assigned a new grocery",
    payload.assignedTo
  );

  const grocery = await Grocery.create(groceryData);

  return grocery;
};

const getGrocery = async (userData, query) => {
  validateFields(query, ["groceryId"]);

  const grocery = await Grocery.findById(query.groceryId).populate([
    {
      path: "assignedTo",
      select: "firstName lastName email profile_image",
    },
  ]);

  if (!grocery) throw new ApiError(status.NOT_FOUND, "Grocery not found");

  return grocery;
};

const getMyGrocery = async (userData, query) => {
  const groceryQuery = new QueryBuilder(
    Grocery.find({
      ...(userData.role === ENUM_USER_ROLE.USER && { user: userData.userId }),
      ...(userData.role === ENUM_USER_ROLE.EMPLOYEE && {
        assignedTo: userData.userId,
      }),
    })
      .populate([
        {
          path: "assignedTo",
          select: "firstName lastName email profile_image workingDay",
        },
      ])
      .lean(),
    query
  )
    .search(["groceryName"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([
    groceryQuery.modelQuery,
    groceryQuery.countTotal(),
  ]);

  return {
    meta,
    result,
  };
};

const updateGrocery = async (userData, payload) => {
  validateFields(payload, ["groceryId"]);

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

  const updatedGrocery = await Grocery.findOneAndUpdate(
    {
      _id: payload.groceryId,
      user: userData.userId,
    },
    { ...updateData },
    { new: true, runValidators: true }
  ).lean();

  if (!updatedGrocery)
    throw new ApiError(status.NOT_FOUND, "Grocery not found");

  postNotification(
    "Task Updated",
    "Task has been updated",
    updatedGrocery.assignedTo
  );
  postNotification(
    "Task Updated",
    "Task has been updated",
    updatedGrocery.user
  );

  return updatedGrocery;
};

const deleteGrocery = async (userData, payload) => {
  validateFields(payload, ["groceryId"]);

  const result = await Grocery.deleteOne({ _id: payload.groceryId });

  if (!result.deletedCount)
    throw new ApiError(status.NOT_FOUND, "Grocery not found");

  return result;
};

const getNotifications = async (userData) => {
  const result = await Notification.find({ toId: userData.userId });

  return result;
};

const postGroceryCategory = async (payload) => {
  const groceryCategory = await GroceryCategory.create(...payload);
  return groceryCategory;
};

const getGroceryCategory = async (query) => {
  const groceryCategoryQuery = new QueryBuilder(GroceryCategory.find({}), query)
    .search(["name"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([
    groceryCategoryQuery.modelQuery,
    groceryCategoryQuery.countTotal(),
  ]);

  return {
    meta,
    result,
  };
};

//  utility functions ===================================================

const deleteTasksWithCron = async (check) => {
  const now = new Date();

  const result = await Task.deleteMany({
    recurrence: TaskRecurrence.ONE_TIME,
    endDateTime: { $lte: now },
  });

  if (result.deletedCount > 0)
    logger.info(`Deleted ${result.deletedCount} expired one_time task`);

  logger.info(`${now}`);
};

// delete one_time tasks that are expired every midnight
cron.schedule("0 0 * * *", async () => {
  try {
    deleteTasksWithCron();
  } catch (error) {
    errorLogger.error("Error removing expired code:", error);
  }
});

const TaskService = {
  postTask,
  getTask,
  getMyTask,
  getEmployeeSpecificTask,
  getAllTask,
  updateTask,
  updateTaskOrGroceryStatus,
  updateTaskOrGroceryWithNote,
  deleteTask,
  getNotifications,

  getGroceryCategory,
  postGroceryCategory,

  postGrocery,
  getGrocery,
  getMyGrocery,
  updateGrocery,
  deleteGrocery,
};

module.exports = TaskService;
