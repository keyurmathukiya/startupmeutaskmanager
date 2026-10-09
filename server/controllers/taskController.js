const mongoose = require('mongoose');
const Task = require('../models/Task');
const { asyncHandler } = require('../middleware/error');

const FIELDS = ['title', 'description', 'goals', 'notes', 'links', 'estimateMinutes', 'project', 'labels', 'subtasks', 'status', 'priority', 'dueDate'];
const pick = (body) => Object.fromEntries(FIELDS.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
const notFound = () => Object.assign(new Error('Task not found'), { status: 404 });

exports.list = asyncHandler(async (req, res) => {
  const filter = { user: req.userId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const escaped = req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const search = new RegExp(escaped, 'i');
    filter.$or = [
      { title: search },
      { description: search },
      { goals: search },
      { notes: search },
      { project: search },
      { labels: search },
      { 'links.title': search },
      { 'links.url': search },
    ];
  }
  res.json(await Task.find(filter).sort({ dueDate: 1, updatedAt: -1 }));
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await Task.create({ ...pick(req.body), user: req.userId }));
});

exports.update = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndUpdate({ _id: req.params.id, user: req.userId }, pick(req.body), {
    new: true,
    runValidators: true,
  });
  if (!task) throw notFound();
  res.json(task);
});

exports.remove = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!task) throw notFound();
  res.json({ message: 'Deleted' });
});

exports.stats = asyncHandler(async (req, res) => {
  const rows = await Task.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.userId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(rows.map((row) => [row._id, row.count]));
  res.json({ total: Object.values(counts).reduce((sum, count) => sum + count, 0), ...counts });
});
