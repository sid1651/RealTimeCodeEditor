const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI is not configured.");
    }

    const connection = await mongoose.connect(mongoUri);

    console.log("✅ MongoDB Connected Successfully");
    console.log(`🌍 Host: ${connection.connection.host}`);
    console.log(`📦 Database: ${connection.connection.name}`);
    console.log(`🚀 Ready State: ${mongoose.connection.readyState}`);

  } catch (error) {
    console.error("❌ MongoDB Connection Failed");
    console.error(error.message);

    process.exit(1);
  }
};

module.exports = connectDB;