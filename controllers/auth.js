const User = require("../models/User");

const DEFAULT_COOKIE_EXPIRE_MS = 24 * 60 * 60 * 1000;

const parseCookieExpiryMs = (value) => {
  if (!value) return DEFAULT_COOKIE_EXPIRE_MS;

  const normalized = String(value).trim().toLowerCase();
  const numericValue = Number(normalized);

  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  const durationMatch = normalized.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!durationMatch) return DEFAULT_COOKIE_EXPIRE_MS;

  const amount = Number(durationMatch[1]);
  const unit = durationMatch[2];

  const unitToMs = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * unitToMs[unit];
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, tel } = req.body;
    //Created User
    const user = await User.create({
      name,
      email,
      password,
      role,
      tel
    });
    //Created token
    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error(err, err.stack);
    res.status(400).json({ success: false });
    console.log(err.stack);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, msg: "Please provide an email and password" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid credentials" });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, msg: "Invalid credentials" });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err, err.stack);
    return res.status(401).json({
      success: false,
      msg: "Cannot convert email or password to string"
    });
  }
};

const sendTokenResponse = (user, statusCode, res) => {
  //Create token
  const token = user.getSignedJwtToken();
  const cookieExpireMs = parseCookieExpiryMs(process.env.JWT_COOKIE_EXPIRE);

  const options = {
    expires: new Date(Date.now() + cookieExpireMs),
    httpOnly: true
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }
  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token
  });
};

exports.getMe = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    data: user
  });
};

//@desc Log user out / clear cookie
//@route GET /api/v1/auth/logout
//@access Private
exports.logout = async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({
    success: true,
    data: {}
  });
};
