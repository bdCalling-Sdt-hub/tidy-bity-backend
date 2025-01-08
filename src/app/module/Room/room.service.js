const { default: status } = require("http-status");
const validateFields = require("../../../util/validateFields");
const Room = require("./Room");
const House = require("../house/House");
const ApiError = require("../../../error/ApiError");
const postNotification = require("../../../util/postNotification");

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

  return await House.findById(query.houseId);
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

const getMyRoom = async (userData, query) => {};

const getSingleRoom = async (query) => {};

const editSingleRoom = async (payload) => {};

const deleteSingleRoom = async (payload) => {};

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
