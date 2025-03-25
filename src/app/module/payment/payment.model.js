const { Schema, model } = require("mongoose");
const ObjectId = Schema.Types.ObjectId;

const paymentSchema = new Schema(
  {
    user: {
      type: ObjectId,
      ref: "User",
    },
    packageType: {
      type: String,
      enum: {
        values: ["monthly", "yearly"],
        message: `Invalid recurrence value. Allowed values: monthly, yearly`,
      },
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    checkout_session_id: {
      type: String,
      unique: true,
      required: true,
    },
    payment_intent_id: {
      type: String,
    },
    status: {
      type: String,
      enum: ["unpaid", "succeeded", "refunded", "transferred"],
      default: "unpaid",
    },
  },
  {
    timestamps: true,
  }
);

const Payment = model("Payment", paymentSchema);
module.exports = Payment;
