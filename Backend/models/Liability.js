import mongoose from 'mongoose';

const liabilitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Liability must belong to a user'],
    },
    type: {
      type: String,
      required: [true, 'Please specify the liability type'],
      enum: [
        'credit_card',
        'mortgage',
        'student_loan',
        'personal_loan',
        'car_loan',
        'medical_debt',
        'other',
      ],
    },
    name: {
      type: String,
      required: [true, 'Please provide a name for this liability'],
      trim: true,
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
      min: [0, 'Interest rate cannot be negative'],
      max: [100, 'Interest rate cannot exceed 100%'],
    },
    minimumPayment: {
      type: Number,
      min: [0, 'Payment cannot be negative'],
    },
    paymentDueDate: {
      type: Date,
    },
    startDate: {
      type: Date,
    },
    endDate: {
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
liabilitySchema.index({ user: 1, type: 1 });
liabilitySchema.index({ user: 1, isActive: 1 });
liabilitySchema.index({ user: 1, paymentDueDate: 1 });

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
