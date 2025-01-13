const { UserService } = require("./user.service");
const sendResponse = require("../../../shared/sendResponse");
const catchAsync = require("../../../shared/catchasync");

const updateProfile = catchAsync(async (req, res) => {
  const result = await UserService.updateProfile(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const getProfile = catchAsync(async (req, res) => {
  const result = await UserService.getProfile(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User retrieved successfully",
    data: result,
  });
});

const deleteMyAccount = catchAsync(async (req, res) => {
  await UserService.deleteMyAccount(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Account deleted!",
  });
});

const addEmployee = catchAsync(async (req, res) => {
  const result = await UserService.addEmployee(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Employee added",
    data: result,
  });
});

const editEmployee = catchAsync(async (req, res) => {
  const result = await UserService.editEmployee(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Employee updated",
    data: result,
  });
});

const deleteEmployee = catchAsync(async (req, res) => {
  const result = await UserService.deleteEmployee(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Employee deleted",
    data: result,
  });
});

const getMyEmployee = catchAsync(async (req, res) => {
  const result = await UserService.getMyEmployee(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Employees retrieved",
    data: result,
  });
});

const getSingleEmployee = catchAsync(async (req, res) => {
  const result = await UserService.getSingleEmployee(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Employees retrieved",
    data: result,
  });
});

const UserController = {
  deleteMyAccount,
  getProfile,
  updateProfile,
  addEmployee,
  editEmployee,
  deleteEmployee,
  getMyEmployee,
  getSingleEmployee,
};

module.exports = { UserController };
