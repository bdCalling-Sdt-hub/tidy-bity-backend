const { Schema, model } = require("mongoose");
const ObjectId = Schema.Types.ObjectId;

const RoomSchema = new Schema(
  {
    user: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    house: {
      type: ObjectId,
      ref: "House",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Room = model("Room", RoomSchema);

module.exports = Room;
