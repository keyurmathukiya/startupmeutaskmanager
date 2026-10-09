const mongoose = require('mongoose');

const STATUSES = ['todo', 'in-progress', 'completed'];
const PRIORITIES = ['low', 'medium', 'high'];

const subtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    completed: { type: Boolean, default: false },
  },
  { _id: true }
);

const resourceLinkSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 80, default: '' },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      validate: {
        validator: (value) => {
          try {
            const url = new URL(value);
            return ['http:', 'https:'].includes(url.protocol);
          } catch {
            return false;
          }
        },
        message: 'Resource links must use a valid http or https URL',
      },
    },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    goals: { type: String, trim: true, maxlength: 2000, default: '' },
    notes: { type: String, trim: true, maxlength: 3000, default: '' },
    links: {
      type: [resourceLinkSchema],
      default: [],
      validate: {
        validator: (links) => links.length <= 10,
        message: 'A task can have at most 10 resource links',
      },
    },
    estimateMinutes: {
      type: Number,
      default: null,
      min: [1, 'Estimate must be at least 1 minute'],
      max: [10080, 'Estimate cannot exceed 7 days'],
      validate: {
        validator: (value) => value == null || Number.isInteger(value),
        message: 'Estimate must be a whole number of minutes',
      },
    },
    project: { type: String, trim: true, maxlength: 80, default: '' },
    labels: {
      type: [{ type: String, trim: true, maxlength: 30 }],
      default: [],
      validate: {
        validator: (labels) => labels.length <= 10,
        message: 'A task can have at most 10 labels',
      },
    },
    subtasks: {
      type: [subtaskSchema],
      default: [],
      validate: {
        validator: (subtasks) => subtasks.length <= 30,
        message: 'A task can have at most 30 subtasks',
      },
    },
    status: { type: String, enum: STATUSES, default: 'todo' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
module.exports.STATUSES = STATUSES;
module.exports.PRIORITIES = PRIORITIES;
