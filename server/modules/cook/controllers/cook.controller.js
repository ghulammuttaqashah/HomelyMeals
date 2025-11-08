// modules/cook/controllers/cook.controller.js
import { Cook } from "../models/cook.model.js";
import bcrypt from "bcryptjs";

/**
 * Cook Signup (Direct Account Creation)
 * @route POST /api/cooks/signup
 */
export const signUpCook = async (req, res) => {
  const { name, email, contact, password, location } = req.body;

  try {
    // Check if cook already exists
    const existingCook = await Cook.findOne({ email });
    if (existingCook) {
      return res.status(400).json({ message: "Cook already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save coordinates if provided
    let loc = {};
    if (location && location.latitude && location.longitude) {
      loc = {
        type: "Point",
        coordinates: [location.longitude, location.latitude]
      };
    }

    const cook = new Cook({
      name,
      email,
      contact,
      password: hashedPassword,
      location: loc
      // documentsVerified default false
      // serviceStatus default Active
      // status default active
    });

    await cook.save();

    return res.status(201).json({
      message: "Cook account created successfully",
      cookId: cook._id
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};