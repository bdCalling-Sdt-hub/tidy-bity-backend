const { default: status } = require("http-status");
const validateFields = require("../../../util/validateFields");
const Room = require("./Room");
const House = require("../house/House");

const postHouse = async (userData, payload) => {
  validateFields(payload, ["name"]);

  const houseData = {
    user: userData.userId,
    name: payload.name,
  };

  return await House.create(houseData);
};

const getSingHouse = async (query) => {};

const postRoom = async (userData, payload) => {
  validateFields(payload, ["houseId", "name"]);

  const roomData = {
    user: userData.userId,
    house: payload.houseId,
    name: payload.name,
  };

  return await Room.create(roomData);
};

const getMyRoom = async (userData, query) => {};

const getSingleRoom = async (query) => {};

const editSingleRoom = async (payload) => {};

const deleteSingleRoom = async (payload) => {};

const RoomService = {
  postHouse,
  getSingHouse,
  postRoom,
  getMyRoom,
  getSingleRoom,
  editSingleRoom,
  deleteSingleRoom,
};

module.exports = RoomService;
