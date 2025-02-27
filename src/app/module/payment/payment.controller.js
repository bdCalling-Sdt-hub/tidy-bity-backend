const sendResponse = require("../../../shared/sendResponse");
const catchAsync = require("../../../shared/catchAsync");
const PaypalService = require("./paypal.service");

const successPage = catchAsync(async (req, res) => {
  res.render("success.ejs");
});

const cancelPage = catchAsync(async (req, res) => {
  res.render("cancel.ejs");
});

const postCheckoutForSubscription = catchAsync(async (req, res) => {
  const result = await PaypalService.postCheckoutForSubscription(
    req.user,
    req.body
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment for subscription initialized",
    data: result,
  });
});

const PaymentController = {
  successPage,
  cancelPage,
  postCheckoutForSubscription,
};

module.exports = { PaymentController };
