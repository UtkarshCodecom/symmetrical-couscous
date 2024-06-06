const sendToken = (user, statusCode, res) => {
  const token = user.getJWTToken();

  // options for cookie
  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 8 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: true, // Only set secure flag in production
    sameSite: 'Strict', // Adds SameSite attribute for CSRF protection
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    user,
    token,
  });
};

module.exports = sendToken;
