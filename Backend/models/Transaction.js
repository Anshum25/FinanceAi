import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense']
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      // Income categories
      'salary', 'bonus', 'freelance', 'business_income', 'rental_income', 'investment_income', 'other_income',
      // Expense categories
      'food_dining', 'groceries', 'transportation', 'fuel', 'utilities', 'rent_mortgage', 'insurance',
      'healthcare', 'education', 'entertainment', 'shopping', 'travel', 'personal_care', 'gifts_donations',
      'home_maintenance', 'subscriptions', 'taxes', 'loan_payment', 'credit_card_payment', 'savings',
      'investment', 'emergency_fund', 'other_expense'
    ]
  },
  subcategory: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  merchant: {
    type: String
  },
  location: {
    type: String
  },
  balance: {
    type: Number
  },
  accountNumber: {
    type: String
  },
  referenceNumber: {
    type: String
  },
  tags: [String],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly']
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1
  },
  source: {
    type: String,
    enum: ['manual', 'pdf_upload', 'bank_api', 'csv_import'],
    default: 'manual'
  },
  originalText: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ user: 1, merchant: 1 });
transactionSchema.index({ date: -1 });
transactionSchema.index({ amount: -1 });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(Math.abs(this.amount));
});

// Method to categorize transaction automatically
transactionSchema.methods.autoCategorizeBasedOnDescription = function() {
  const desc = this.description.toLowerCase();
  
  // Income patterns
  if (desc.includes('salary') || desc.includes('sal cr')) return 'salary';
  if (desc.includes('freelance') || desc.includes('consulting')) return 'freelance';
  if (desc.includes('dividend') || desc.includes('interest')) return 'investment';
  
  // Expense patterns
  if (desc.includes('swiggy') || desc.includes('zomato') || desc.includes('restaurant')) return 'food';
  if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('shopping')) return 'shopping';
  if (desc.includes('rent') || desc.includes('maintenance')) return 'rent';
  if (desc.includes('electricity') || desc.includes('water') || desc.includes('gas')) return 'utilities';
  if (desc.includes('uber') || desc.includes('ola') || desc.includes('metro') || desc.includes('petrol')) return 'transport';
  if (desc.includes('movie') || desc.includes('netflix') || desc.includes('spotify')) return 'entertainment';
  if (desc.includes('hospital') || desc.includes('medical') || desc.includes('pharmacy')) return 'healthcare';
  if (desc.includes('school') || desc.includes('course') || desc.includes('book')) return 'education';
  if (desc.includes('emi') || desc.includes('loan')) return 'emi';
  if (desc.includes('sip') || desc.includes('mutual fund') || desc.includes('fd')) return 'savings';
  
  return 'other_expense';
};

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
