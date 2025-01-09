const { default: status } = require("http-status");
const validateFields = require("../../../util/validateFields");
const Room = require("./Room");
const House = require("../house/House");
const ApiError = require("../../../error/ApiError");
const postNotification = require("../../../util/postNotification");
const deleteFalsyField = require("../../../util/deleteFalsyField");

const postHouse = async (userData, payload) => {
  validateFields(payload, ["name"]);

  const houseData = {
    user: userData.userId,
    name: payload.name,
  };

  return await House.create(houseData);
};

const getSingleHouse = async (query) => {
  validateFields(query, ["houseId"]);

  const house = await House.findById(query.houseId);
  if (!house) throw new ApiError(status.NOT_FOUND, "House not found");

  return house;
};

const postRoom = async (req) => {
  const { body: payload, user, files } = req;
  validateFields(files, ["roomImage"]);
  validateFields(payload, ["houseId", "name"]);

  const house = await House.findOne({
    _id: payload.houseId,
    user: user.userId,
  });

  if (!house) throw new ApiError(status.NOT_FOUND, "House not found");

  const roomData = {
    user: user.userId,
    house: payload.houseId,
    name: payload.name,
    roomImage: files.roomImage[0].path,
  };

  postNotification("New Room", "New room added to your house", user.userId);

  return await Room.create(roomData);
};

const getMyRoom = async (userData, query) => {
  validateFields(query, ["houseId"]);

  const rooms = await Room.find({
    user: userData.userId,
    house: query.houseId,
  });

  return {
    count: rooms.length,
    rooms,
  };
};

const getSingleRoom = async (query) => {
  validateFields(query, ["roomId"]);

  const room = await Room.findById(query.roomId);
  if (!room) throw new ApiError(status.NOT_FOUND, "Room not found");

  return room;
};

const editSingleRoom = async (req) => {
  const { body: payload, user, files } = req;
  validateFields(payload, ["roomId"]);

  const data = { ...payload };
  if (files && files.roomImage) data.roomImage = files.roomImage[0].path;
  const newData = deleteFalsyField(data);

  const updatedRoom = await Room.updateOne(
    { _id: payload.roomId },
    { ...newData }
  );

  if (!updatedRoom.matchedCount)
    throw new ApiError(status.NOT_FOUND, "Room not found");

  postNotification("Room Updated", "New data updated to room", user.userId);
  return updatedRoom;
};

const deleteSingleRoom = async (payload) => {
  validateFields(payload, ["roomId"]);

  const result = await Room.deleteOne({ _id: payload.roomId });

  if (!result.deletedCount)
    throw new ApiError(status.NOT_FOUND, "Room not found");

  return result;
};

const RoomService = {
  postHouse,
  getSingleHouse,
  postRoom,
  getMyRoom,
  getSingleRoom,
  editSingleRoom,
  deleteSingleRoom,
};

module.exports = RoomService;
