import mongoose from 'mongoose';
import { IT_TASK_CATEGORIES, IT_TASK_PRIORITIES, IT_TASK_STATUSES } from '@/lib/it-tasks-constants';

export { IT_TASK_CATEGORIES, IT_TASK_PRIORITIES, IT_TASK_STATUSES };

const ItTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: IT_TASK_CATEGORIES,
      default: 'Technical Support',
      required: true,
    },
    priority: {
      type: String,
      enum: IT_TASK_PRIORITIES,
      default: 'Medium',
      required: true,
    },
    status: {
      type: String,
      enum: IT_TASK_STATUSES,
      default: 'Assigned',
      required: true,
      index: true,
    },
    // Supports single or multiple assigned IT Team employees
    assigned_to: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        email: { type: String, default: '' },
        employee_id: { type: String, default: '' },
        assigned_at: { type: Date, default: Date.now },
      },
    ],
    start_date: {
      type: String,
      default: '',
    }, // YYYY-MM-DD
    due_date: {
      type: String,
      required: true,
      index: true,
    }, // YYYY-MM-DD
    additional_instructions: {
      type: String,
      default: '',
    },
    // Reference files or links attached by HR
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        uploaded_at: { type: Date, default: Date.now },
      },
    ],
    // Work submissions from IT Team members
    work_submissions: [
      {
        submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        submitted_by_name: { type: String, default: '' },
        comment: { type: String, default: '' },
        attachments: [
          {
            name: { type: String, required: true },
            url: { type: String, required: true },
          },
        ],
        submitted_at: { type: Date, default: Date.now },
      },
    ],
    // HR Admin review notes, approvals, change requests
    review_feedback: [
      {
        reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewer_name: { type: String, default: '' },
        reviewer_role: { type: String, default: 'admin' },
        action: {
          type: String,
          enum: ['approved', 'changes_requested', 'reopened'],
          required: true,
        },
        feedback: { type: String, default: '' },
        reviewed_at: { type: Date, default: Date.now },
      },
    ],
    // Audit timeline of status changes
    status_history: [
      {
        from_status: { type: String, default: '' },
        to_status: { type: String, required: true },
        changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changed_by_name: { type: String, default: '' },
        changed_by_role: { type: String, default: '' },
        comment: { type: String, default: '' },
        changed_at: { type: Date, default: Date.now },
      },
    ],
    cancellation_reason: {
      type: String,
      default: '',
    },
    created_by: {
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, default: 'HR Admin' },
      role: { type: String, default: 'admin' },
    },
    assigned_at: {
      type: Date,
      default: Date.now,
    },
    completed_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

ItTaskSchema.index({ 'assigned_to.user_id': 1, status: 1 });
ItTaskSchema.index({ due_date: 1, status: 1 });
ItTaskSchema.index({ category: 1, priority: 1 });
ItTaskSchema.index({ createdAt: -1 });

export default mongoose.models.ItTask || mongoose.model('ItTask', ItTaskSchema);

