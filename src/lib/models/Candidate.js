import mongoose from 'mongoose';

const CandidateSchema = new mongoose.Schema({
  slNo:          { type: Number, default: 0 },
  date:          { type: String, default: '' },
  name:          { type: String, default: '' },
  number:        { type: String, default: '' },
  languages:     { type: String, default: '' },
  qualification: { type: String, default: '' },
  response:      { type: String, default: '' },
  callStatus:    { type: String, default: '' },
  location:      { type: String, default: '' },
  experience:    { type: Number, default: 0 },
  followUp1:     { type: String, default: '' },
  followUp2:     { type: String, default: '' },
  followUp3:     { type: String, default: '' },
  category:      { type: String, default: '' },
  employee:      { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Candidate || mongoose.model('Candidate', CandidateSchema);
