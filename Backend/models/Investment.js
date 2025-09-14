import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    },
    quantity: {
      type: Number,
      required: [true, 'Please provide the quantity'],
      min: [0, 'Quantity cannot be negative'],
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Please provide the purchase price per unit'],
      min: [0, 'Price cannot be negative'],
    },
    currentPrice: {
      type: Number,
      min: [0, 'Price cannot be negative'],
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Please provide the purchase date'],
    },
    currentValue: {
      type: Number,
      min: [0, 'Value cannot be negative'],
    },
    targetAllocation: {
      type: Number,
      min: [0, 'Allocation cannot be negative'],
      max: [100, 'Allocation cannot exceed 100%'],
    },
    institution: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    isTaxable: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
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
investmentSchema.index({ user: 1, type: 1 });
investmentSchema.index({ user: 1, symbol: 1 });
investmentSchema.index({ user: 1, isActive: 1 });

// Virtual for calculating total cost basis
investmentSchema.virtual('costBasis').get(function () {
  return this.quantity * this.purchasePrice;
});

// Virtual for calculating current value if not provided
investmentSchema.virtual('calculatedCurrentValue').get(function () {
  if (this.currentValue !== undefined) return this.currentValue;
  if (this.currentPrice !== undefined) return this.quantity * this.currentPrice;
  return this.quantity * this.purchasePrice; // Fallback to cost basis
});

// Virtual for calculating profit/loss
investmentSchema.virtual('profitLoss').get(function () {
  return this.calculatedCurrentValue - this.costBasis;
});

// Virtual for calculating profit/loss percentage
investmentSchema.virtual('profitLossPercentage').get(function () {
  if (this.costBasis === 0) return 0;
  return (this.profitLoss / this.costBasis) * 100;
});

// Virtual for calculating annualized return
investmentSchema.virtual('annualizedReturn').get(function () {
  if (this.costBasis <= 0) return 0;
  
  const yearsHeld = (new Date() - this.purchaseDate) / (1000 * 60 * 60 * 24 * 365.25);
  if (yearsHeld <= 0) return 0;
  
  const totalReturn = (this.calculatedCurrentValue / this.costBasis) - 1;
  const annualizedReturn = (Math.pow(1 + totalReturn, 1 / yearsHeld) - 1) * 100;
  
  return parseFloat(annualizedReturn.toFixed(2));
});

// Query middleware to populate user data - disabled to avoid populate errors
// investmentSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'userId',
//     select: 'name email',
//   });
//   next();
// });

// Update currentValue when currentPrice changes
investmentSchema.pre('save', function (next) {
  if (this.isModified('currentPrice') || this.isModified('quantity')) {
    this.currentValue = this.calculatedCurrentValue;
  }
  next();
});

const Investment = mongoose.model('Investment', investmentSchema);

export default Investment;
