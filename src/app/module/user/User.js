const mongoose = require("mongoose");

const { Schema, model, Types } = mongoose;

const UserSchema = new Schema(
  {
    authId: {
      type: Types.ObjectId,
      required: true,
      ref: "Auth",
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    profile_image: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    dateOfBirth: {
      type: String,
    },
    address: {
      type: String,
    },

    /* employee only fields -----------*/

    employer: {
      type: String,
    },
    employeeId: {
      type: String,
    },
    designation: {
      type: String,
    },
    jobType: {
      type: String,
    },
    CPR: {
      type: String,
    },
    passport: {
      type: String,
    },
    drivingLicense: {
      type: String,
    },
    dutyTime: {
      type: String,
    },
    workingDay: {
      type: [String],
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },
    offDay: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const User = model("User", UserSchema);

module.exports = User;
