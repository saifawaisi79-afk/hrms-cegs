import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICandidate extends Document {
  slNo: number;
  date: string;
  name: string;
  number: string;
  languages: string;
  qualification: string;
  response: string;
  callStatus: string;
  location: string;
  experience: number;
  followUp1: string;
  followUp2: string;
  followUp3: string;
  category: string;
  employee: string;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema: Schema<ICandidate> = new mongoose.Schema({
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

const Candidate: Model<ICandidate> = mongoose.models.Candidate || mongoose.model<ICandidate>('Candidate', CandidateSchema);

export default Candidate;
