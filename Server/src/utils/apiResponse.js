// Standard API response helper
const apiResponse = (res, { status = 200, message = 'OK', data = null, error = null }) => {
  return res.status(status).json({ message, data, error });
};

module.exports = apiResponse;
