const { protect, allow } = require("./authMiddleware");
module.exports = [protect, allow("admin")];
