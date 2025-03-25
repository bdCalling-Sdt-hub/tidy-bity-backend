const express = require("express");
const auth = require("../../middleware/auth");
const { PaymentController } = require("./payment.controller");
const config = require("../../../config");

const router = express.Router();

router
  .get("/success", PaymentController.successPage)
  .get("/cancel", PaymentController.cancelPage)
  .post(
    "/checkout-subscription",
    auth(config.auth_level.user),
    PaymentController.postCheckoutForSubscription
  );

module.exports = router;
