import mongoose from "mongoose";
import dotenv from "dotenv";
import { Cook } from "../modules/cook/models/cook.model.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

/**
 * Quick fix: Update ALL cooks' delivery range to 8 km
 * Or update a specific cook by email
 */

const fixDeliveryRange = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Option 1: Update ALL cooks to 8 km
    const updateAll = process.argv[2] === "all";
    
    if (updateAll) {
      const result = await Cook.updateMany(
        {},
        { $set: { maxDeliveryDistance: 8 } }
      );
      console.log(`✅ Updated ${result.modifiedCount} cook(s) to 8 km delivery range\n`);
    } else {
      // Option 2: Update specific cook by email
      const email = process.argv[2];
      const distance = parseFloat(process.argv[3]) || 8;

      if (!email) {
        console.log("Usage:");
        console.log("  Update all cooks:          node scripts/fixDeliveryRange.js all");
        console.log("  Update specific cook:      node scripts/fixDeliveryRange.js cook@example.com 8");
        process.exit(1);
      }

      const cook = await Cook.findOneAndUpdate(
        { email },
        { $set: { maxDeliveryDistance: distance } },
        { new: true }
      );

      if (!cook) {
        console.log(`❌ Cook not found: ${email}`);
        process.exit(1);
      }

      console.log(`✅ Updated ${cook.name} (${email})`);
      console.log(`   New delivery range: ${cook.maxDeliveryDistance} km\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

fixDeliveryRange();
