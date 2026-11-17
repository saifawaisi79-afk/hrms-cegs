import mongoose from 'mongoose';

const ParticipantSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['host', 'co-host', 'participant'], default: 'participant' },
  avatar_url: { type: String, default: '' },
  department: { type: String, default: '' },
  invitation_status: { type: String, enum: ['pending', 'accepted', 'declined', 'tentative'], default: 'pending' },
  has_joined: { type: Boolean, default: false },
  first_joined_at: { type: Date, default: null },
  last_left_at: { type: Date, default: null },
  total_duration_seconds: { type: Number, default: 0 },
  attendance_logs: [
    {
      action: { type: String, enum: ['join', 'leave'], required: true },
      timestamp: { type: Date, default: Date.now },
    }
  ]
}, { _id: false });

const MeetingSchema = new mongoose.Schema({
  meeting_id: { type: String, required: true, unique: true, index: true },
  room_name: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['instant', 'scheduled'], default: 'scheduled' },
  status: { type: String, enum: ['scheduled', 'in_progress', 'completed', 'cancelled'], default: 'scheduled', index: true },
  privacy: { type: String, enum: ['internal', 'department', 'private'], default: 'internal' },
  allowed_departments: [{ type: String }],
  
  host_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  host_name: { type: String, required: true },
  host_email: { type: String, required: true },
  
  scheduled_date: { type: String, required: true, index: true }, // YYYY-MM-DD
  scheduled_start_time: { type: String, required: true }, // HH:mm
  duration_minutes: { type: Number, default: 30 },
  
  actual_start_time: { type: Date, default: null },
  actual_end_time: { type: Date, default: null },
  
  waiting_room_enabled: { type: Boolean, default: false },
  allow_screen_share: { type: Boolean, default: true },
  allow_chat: { type: Boolean, default: true },
  mute_on_entry: { type: Boolean, default: false },
  
  participants: [ParticipantSchema],
  participant_user_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],

  cancellation_reason: { type: String, default: '' },
  cancelled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

MeetingSchema.index({ scheduled_date: 1, status: 1 });
MeetingSchema.index({ host_id: 1, status: 1 });
MeetingSchema.index({ participant_user_ids: 1, status: 1 });

export default mongoose.models.Meeting || mongoose.model('Meeting', MeetingSchema);

