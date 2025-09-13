import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Asset must belong to a user'],
    },
    type: {
      type: String,
      required: [true, 'Please specify the asset type'],
      enum: [
        'cash',
        'savings',
        'checking',
        'investment',
        'retirement',
        'property',
        'vehicle',
        'other',
      ],
    },
    name: {
      type: String,
      required: [true, 'Please provide a name for this asset'],
      trim: true,
    },
    currentValue: {
      type: Number,
      required: [true, 'Please provide the current value of the asset'],
      min: [0, 'Asset value cannot be negative'],
    },
    purchaseValue: {
      type: Number,
      min: [0, 'Purchase value cannot be negative'],
    },
    purchaseDate: {
      type: Date,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    institution: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isLiquid: {
      type: Boolean,
      default: false,
    },
    isTaxable: {
      type: Boolean,
      default: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
assetSchema.index({ user: 1, type: 1 });
assetSchema.index({ user: 1, isLiquid: 1 });

// Virtual for calculating appreciation/depreciation
assetSchema.virtual('valueChange').get(function () {
  if (!this.purchaseValue) return null;
  return this.currentValue - this.purchaseValue;
});

// Virtual for calculating percentage change
assetSchema.virtual('valueChangePercentage').get(function () {
  if (!this.purchaseValue) return null;
  return ((this.currentValue - this.purchaseValue) / this.purchaseValue) * 100;
});

// Query middleware to populate user data
assetSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name email',
  });
  next();
});

const Asset = mongoose.model('Asset', assetSchema);

export default Asset;
