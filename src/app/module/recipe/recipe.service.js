const { default: status } = require("http-status");
const ApiError = require("../../../error/ApiError");
const validateFields = require("../../../util/validateFields");

const postRecipe = async (req) => {
  const { user, body, files } = req || {};
    validateFields
};

const getRecipe = async (userData, query) => {};

const getMyRecipe = async (userData, query) => {};

const getAllRecipe = async (userData, query) => {};

const updateRecipe = async (req) => {};

const deleteRecipe = async (userData, payload) => {};

const RecipeService = {
  postRecipe,
  getRecipe,
  getMyRecipe,
  getAllRecipe,
  updateRecipe,
  deleteRecipe,
};

module.exports = RecipeService;
