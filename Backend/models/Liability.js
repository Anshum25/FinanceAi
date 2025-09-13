import mongoose from 'mongoose';

const liabilitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['home_loan', 'personal_loan', 'car_loan', 'education_loan', 'credit_card', 'business_loan', 'other']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  lender: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    trim: true
  },
  originalAmount: {
    type: Number,
    required: [true, 'Please provide the original amount'],
    min: [0, 'Amount cannot be negative'],
  },
  currentBalance: {
    type: Number,
    required: [true, 'Please provide the current balance'],
    min: [0, 'Balance cannot be negative'],
  },
  interestRate: {
    type: Number,
    required: true,
    min: [0, 'Interest rate cannot be negative'],
    max: [100, 'Interest rate cannot exceed 100%'],
  },
  monthlyPayment: {
    type: Number,
    required: true,
    min: [0, 'Payment cannot be negative'],
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  nextDueDate: {
    type: Date,
    required: true
  },
  creditLimit: {
    type: Number, // Only for credit cards
    min: 0
  },
  availableCredit: {
    type: Number, // Only for credit cards
    min: 0
  },
  minimumPayment: {
    type: Number, // For credit cards
    min: 0
  },
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better query performance
liabilitySchema.index({ userId: 1, type: 1 });
liabilitySchema.index({ userId: 1, isActive: 1 });
liabilitySchema.index({ nextDueDate: 1 });

// Virtual for calculating total paid
liabilitySchema.virtual('amountPaid').get(function () {
  return this.originalAmount - this.currentBalance;
});

// Virtual for calculating percentage paid
liabilitySchema.virtual('percentagePaid').get(function () {
  if (this.originalAmount <= 0) return 100;
  return ((this.originalAmount - this.currentBalance) / this.originalAmount) * 100;
});

// Virtual for calculating estimated payoff date
liabilitySchema.virtual('estimatedPayoffDate').get(function () {
  if (!this.minimumPayment || !this.interestRate) return null;
  
  // Simple estimation without compounding for demonstration
  const monthlyInterestRate = this.interestRate / 12 / 100;
  const monthlyPayment = this.minimumPayment;
  let balance = this.currentBalance;
  let months = 0;
  
  while (balance > 0 && months < 600) { // Cap at 50 years to prevent infinite loops
    balance = balance * (1 + monthlyInterestRate) - monthlyPayment;
    months++;
  }
  
  if (balance <= 0) {
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + months);
    return payoffDate;
  }
  
  return null; // Loan won't be paid off with current payment
});

// Query middleware to populate user data
liabilitySchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name email',
  });
  next();
});

const Liability = mongoose.model('Liability', liabilitySchema);

export default Liability;
