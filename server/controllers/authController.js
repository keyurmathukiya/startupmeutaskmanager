const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/error');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const bad = (status, message) => Object.assign(new Error(message), { status });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw bad(400, 'Name, email and password are required');
  if (password.length < 6) throw bad(400, 'Password must be at least 6 characters');
  const user = await User.create({ name, email, password });
  res.status(201).json({ token: sign(user.id), user: { id: user.id, name: user.name, email: user.email } });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matches(password || ''))) throw bad(401, 'Wrong email or password');
  res.json({ token: sign(user.id), user: { id: user.id, name: user.name, email: user.email } });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw bad(404, 'User not found');
  res.json({ id: user.id, name: user.name, email: user.email });
});
