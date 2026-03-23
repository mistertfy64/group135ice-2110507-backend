const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");
exports.getBookings = async (req, res, next) => {
  let query;

  //General User can see only their booking
  if (req.user.role !== "admin") {
    query = Booking.find({ user: req.user.id }).populate({
      path: "hotel",
      select: "name province tel imgSrc"
    });
  } else {
    //if user == admin can see all
    if (req.params.hotelId) {
      console.log(req.params.hotelId);
      query = Booking.find({ hotel: req.params.hotelId }).populate({
        path: "hotel",
        select: "name province tel imgSrc"
      });
    } else {
      query = Booking.find().populate({
        path: "hotel",
        select: "name province tel imgSrc"
      });
    }
  }

  try {
    const bookings = await query;

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    console.error(err, err.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find Booking" });
  }
};

exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({
      path: "hotel",
      select: "name description tel imgSrc"
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking with id ${req.params.id}`
      });
    }

    // restrict non-admin to own booking
    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: `User ${req.user.id} is not authorized to view this booking`
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (err) {
    console.error(err, err.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find booking" });
  }
};

exports.addBooking = async (req, res, next) => {
  try {
    req.body.hotel = req.body.hotelId;

    // Validate required fields
    if (!req.body.checkInDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide a check-in date"
      });
    }

    if (!req.body.nights) {
      return res.status(400).json({
        success: false,
        message: "Please specify number of nights"
      });
    }

    // Validate nights is between 1 and 3
    if (req.body.nights < 1 || req.body.nights > 3) {
      return res.status(400).json({
        success: false,
        message: "Number of nights must be between 1 and 3"
      });
    }

    const hotel = await Hotel.findById(req.body.hotelId);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: `No hotel with the id of ${req.body.hotelId}`
      });
    }

    // Add user to req.body
    req.body.user = req.user.id;

    // Check for overlapping bookings for the same user
    const checkInDate = new Date(req.body.checkInDate);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + req.body.nights);

    const overlappingBookings = await Booking.find({
      user: req.user.id,
      $or: [
        {
          checkInDate: { $lt: checkOutDate },
          checkInDate: { $gte: checkInDate }
        },
        {
          checkInDate: { $lt: checkInDate },
          $expr: {
            $gte: [
              {
                $add: [
                  "$checkInDate",
                  { $multiply: ["$nights", 24 * 60 * 60 * 1000] }
                ]
              },
              checkInDate
            ]
          }
        }
      ]
    });

    if (overlappingBookings.length > 0 && req.user.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: `The user with ID ${req.user.id} has an overlapping booking.`
      });
    }

    const booking = await Booking.create(req.body);

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    console.error(err, err.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot create Booking" });
  }
};

exports.updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking with id of ${req.params.id}`
      });
    }
    //Make sure user role and owner
    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: `User ${req.user.id} 
                    is not authorized to update this booking`
      });
    }

    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    console.error(err, err.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot update Booking" });
  }
};

exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking with id of ${req.params.id}`
      });
    }
    //Make sure user role and owner
    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this booking`
      });
    }
    await booking.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error(err, err.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot delete Booking" });
  }
};
