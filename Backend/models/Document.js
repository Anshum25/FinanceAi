import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentType: {
    type: String,
    required: true,
    enum: ['assetStatement', 'epfPassbook', 'mutualFundCAS', 'creditReport']
  },
  originalName: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true,
    default: 'application/pdf'
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  processed: {
    type: Boolean,
    default: false
  },
  extractedData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
documentSchema.index({ user: 1, documentType: 1 });
documentSchema.index({ user: 1, uploadDate: -1 });
documentSchema.index({ processingStatus: 1 });

const Document = mongoose.model('Document', documentSchema);

export default Document;
