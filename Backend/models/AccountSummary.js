import mongoose from 'mongoose';

const accountSummarySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  netWorth: {
    type: Number,
    default: 0
  },
  totalIncome: {
    type: Number,
    default: 0
  },
  totalExpenses: {
    type: Number,
    default: 0
  },
  monthlySpend: {
    type: Number,
    default: 0
  },
  savingsRate: {
    type: Number,
    default: 0
  },
  categoryBreakdown: [{
    category: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      required: true
    },
    transactionCount: {
      type: Number,
      default: 0
    }
  }],
  recurringVendors: [{
    name: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    averageAmount: {
      type: Number,
      required: true
    },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
      required: true
    },
    lastTransaction: {
      type: Date,
      required: true
    }
  }],
  monthlyTrends: [{
    month: {
      type: String,
      required: true // Format: YYYY-MM
    },
    income: {
      type: Number,
      default: 0
    },
    expenses: {
      type: Number,
      default: 0
    },
    savings: {
      type: Number,
      default: 0
    },
    topCategories: [{
      category: String,
      amount: Number
    }]
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
accountSummarySchema.index({ user: 1 });
accountSummarySchema.index({ lastUpdated: -1 });

const AccountSummary = mongoose.model('AccountSummary', accountSummarySchema);

export default AccountSummary;
