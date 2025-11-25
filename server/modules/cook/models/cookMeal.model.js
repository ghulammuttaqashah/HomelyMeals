import mongoose from "mongoose";

const cookMealSchema = new mongoose.Schema(
  {
    cookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cook",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: ["main course", "beverages", "starter", "other"],
      required: true,
    },
    availability: {
      type: String,
      enum: ["Available", "OutOfStock"],
      default: "Available",
    },
    itemImage: {
      type: String, // image url
      default: "",
    },
  },
  { timestamps: true }
);

const CookMeal = mongoose.model("CookMeal", cookMealSchema);
export default CookMeal;
