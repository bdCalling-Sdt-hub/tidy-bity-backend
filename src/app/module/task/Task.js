const { Schema, model } = require("mongoose");
const { TaskRecurrence, DaysOfWeek } = require("../../../util/enum");
const ObjectId = Schema.Types.ObjectId;

const TaskSchema = new Schema(
  {
    user: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    taskName: {
      type: String,
      required: true,
    },
    recurrence: {
      type: String,
      enum: [TaskRecurrence.ONE_TIME, TaskRecurrence.WEEKLY],
      default: TaskRecurrence.ONE_TIME,
    },
    startDateStr: {
      type: String, // MM/DD/YYYY
      required: true,
    },
    startTimeStr: {
      type: String, // HH:MM AM/PM
      required: true,
    },
    startDateTime: {
      type: Date,
      required: true,
    },
    endDateStr: {
      type: String, // MM/DD/YYYY
      required: true,
    },
    endTimeStr: {
      type: String, // HH:MM AM/PM
      required: true,
    },
    endDateTime: {
      type: Date,
      required: true,
    },
    dayOfWeek: {
      type: String,
      enum: [
        DaysOfWeek.SUNDAY,
        DaysOfWeek.MONDAY,
        DaysOfWeek.TUESDAY,
        DaysOfWeek.WEDNESDAY,
        DaysOfWeek.THURSDAY,
        DaysOfWeek.FRIDAY,
        DaysOfWeek.SATURDAY,
      ],
      required: true,
    },
    taskDetails: {
      type: String,
    },
    additionalMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Task = model("Task", TaskSchema);

module.exports = Task;
