const jwt = require("jsonwebtoken");

// IMPORTANT: This secret key MUST be the exact same one used in your server.js
const JWT_SECRET = "your-super-secret-key-that-no-one-can-guess";

const authMiddleware = (req, res, next) => {
  // The token is expected to be in the Authorization header, formatted as "Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // If the header is missing or badly formatted, deny access.
    return res
      .status(401)
      .json({
        message: "Authorization denied. No token provided or token is invalid.",
      });
  }

  try {
    // Extract the token from the "Bearer <token>" string
    const token = authHeader.split(" ")[1];

    // Verify that the token is valid, not expired, and matches the secret key
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach the user's decoded information (e.g., userId, name) to the request object.
    // This makes it available to any protected route that comes after this middleware.
    req.user = decoded;

    // If the token is valid, call next() to proceed to the actual API route logic.
    next();
  } catch (err) {
    // If jwt.verify fails, it's because the token is malformed, expired, or the signature is invalid.
    return res
      .status(401)
      .json({ message: "Authorization denied. Token is not valid." });
  }
};

module.exports = authMiddleware;
