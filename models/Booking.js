const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  checkInDate: {
    type: Date,
    required: [true, "Please add a check-in date"]
  },
  nights: {
    type: Number,
    required: [true, "Please specify number of nights"],
    min: [1, "Minimum 1 night required"],
    max: [3, "Maximum 3 nights allowed"]
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  hotel: {
    type: mongoose.Schema.ObjectId,
    ref: "Hotel",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual field for checkout date
BookingSchema.virtual("checkOutDate").get(function () {
  const checkOut = new Date(this.checkInDate);
  checkOut.setDate(checkOut.getDate() + this.nights);
  return checkOut;
});

module.exports = mongoose.model("Booking", BookingSchema);
