const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../modals/userModal");
const makeToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET);
const safe = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
});
exports.registerController = async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password)
    return res
      .status(400)
      .json({ message: "Name, email and password are required" });

  if (role == "admin")
    return res
      .status(403)
      .json({ message: "Admin accounts cannot self-register" });
  const normalized = email.toLowerCase();
  if (await User.findOne({ email: normalized }))
    return res.status(409).json({ message: "Email is already registered" });
  const user = await User.create({
    name,
    email: normalized,
    password: await bcrypt.hash(password, 12),
    phone,
    role: role == "owner" ? "owner" : "customer",
  });
  res.status(201).json({ token: makeToken(user._id), user: safe(user) });
};
exports.loginController = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() }).select(
    "+password",
  );
  if (!user || !(await bcrypt.compare(password || "", user.password)))
    return res.status(401).json({ message: "Email or password is incorrect" });
  if (!user.isActive)
    return res.status(403).json({ message: "This account has been disabled" });
  res.json({ token: makeToken(user._id), user: safe(user) });
};
exports.meController = async (req, res) => res.json({ user: safe(req.user) });
