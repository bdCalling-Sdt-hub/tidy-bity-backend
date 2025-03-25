const { Schema, model } = require("mongoose");
const ObjectId = Schema.Types.ObjectId;

const RecipeSchema = new Schema(
  {
    user: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    recipeName: {
      type: String,
      required: true,
    },
    recipeImage: {
      type: String,
      required: true,
    },
    cookingTime: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    ingredients: [
      {
        type: String,
        required: true,
      },
    ],
    steps: [
      {
        type: String,
        required: true,
      },
    ],
    tags: [
      {
        type: String,
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Recipe = model("Recipe", RecipeSchema);

module.exports = Recipe;
