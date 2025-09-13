import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['bank_account', 'cash', 'savings_account', 'current_account', 'fd', 'rd', 'property', 'vehicle', 'jewelry', 'other']
  },
  name: {
    type: String,
    required: [true, 'Please provide a name for this asset'],
    trim: true,
  },
  accountNumber: {
    type: String,
    trim: true,
  },
  bankName: {
    type: String,
    trim: true,
  },
  ifscCode: {
    type: String,
    trim: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Balance cannot be negative'],
  },
  interestRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  maturityDate: {
    type: Date
  },
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better query performance
assetSchema.index({ userId: 1, type: 1 });
assetSchema.index({ userId: 1, isActive: 1 });

// Virtual for total liquid assets
assetSchema.virtual('isLiquidAsset').get(function () {
  return ['bank_account', 'cash', 'savings_account', 'current_account'].includes(this.type);
});

// Method to update balance
assetSchema.methods.updateBalance = function(newBalance) {
  this.balance = newBalance;
  this.lastUpdated = new Date();
  return this.save();
};

const Asset = mongoose.model('Asset', assetSchema);

export default Asset;
