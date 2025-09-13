import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must belong to a user'],
    },
    amount: {
      type: Number,
      required: [true, 'A transaction must have an amount'],
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'A transaction must have a type'],
    },
    category: {
      type: String,
      required: [true, 'A transaction must have a category'],
      enum: [
        'salary',
        'freelance',
        'investment',
        'gift',
        'food',
        'transport',
        'housing',
        'utilities',
        'health',
        'entertainment',
        'shopping',
        'other',
      ],
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    recurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', null],
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1 });
transactionSchema.index({ user: 1, type: 1 });

// Virtual for formatted date
transactionSchema.virtual('formattedDate').get(function () {
  return this.date.toISOString().split('T')[0];
});

// Query middleware to populate user data
transactionSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name email',
  });
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
