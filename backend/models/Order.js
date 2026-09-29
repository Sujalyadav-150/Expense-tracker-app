const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    default: 199
  },
  status: {
    type: String,
    enum: ["PENDING", "SUCCESSFUL", "FAILED"],
    default: "PENDING"
  },
  paymentSessionId: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);