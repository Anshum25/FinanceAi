import mongoose from 'mongoose';

const creditScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: [300, 'Credit score cannot be below 300'],
    max: [850, 'Credit score cannot be above 850']
  },
  bureau: {
    type: String,
    required: true,
    enum: ['CIBIL', 'Experian', 'Equifax', 'CRIF'],
    default: 'CIBIL'
  },
  reportDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  factors: {
    paymentHistory: {
      score: { type: Number, min: 0, max: 100 },
      impact: { type: String, enum: ['positive', 'negative', 'neutral'] }
    },
    creditUtilization: {
      percentage: { type: Number, min: 0, max: 100 },
      impact: { type: String, enum: ['positive', 'negative', 'neutral'] }
    },
    creditAge: {
      months: { type: Number, min: 0 },
      impact: { type: String, enum: ['positive', 'negative', 'neutral'] }
    },
    creditMix: {
      score: { type: Number, min: 0, max: 100 },
      impact: { type: String, enum: ['positive', 'negative', 'neutral'] }
    },
    newCredit: {
      recentInquiries: { type: Number, min: 0 },
      impact: { type: String, enum: ['positive', 'negative', 'neutral'] }
    }
  },
  totalAccounts: {
    type: Number,
    default: 0,
    min: 0
  },
  activeAccounts: {
    type: Number,
    default: 0,
    min: 0
  },
  closedAccounts: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCreditLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCurrentBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  oldestAccountAge: {
    type: Number, // in months
    min: 0
  },
  recentInquiries: {
    type: Number,
    default: 0,
    min: 0
  },
  defaultAccounts: {
    type: Number,
    default: 0,
    min: 0
  },
  recommendations: [{
    category: {
      type: String,
      enum: ['payment_history', 'credit_utilization', 'credit_age', 'credit_mix', 'new_credit']
    },
    suggestion: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  }],
  nextUpdateDate: {
    type: Date,
    default: function() {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
creditScoreSchema.index({ userId: 1, reportDate: -1 });
creditScoreSchema.index({ userId: 1, isActive: 1 });
creditScoreSchema.index({ score: 1 });

// Virtual for credit score category
creditScoreSchema.virtual('scoreCategory').get(function () {
  if (this.score >= 750) return 'Excellent';
  if (this.score >= 700) return 'Good';
  if (this.score >= 650) return 'Fair';
  if (this.score >= 600) return 'Poor';
  return 'Very Poor';
});

// Virtual for credit utilization ratio
creditScoreSchema.virtual('creditUtilizationRatio').get(function () {
  if (this.totalCreditLimit === 0) return 0;
  return Math.round((this.totalCurrentBalance / this.totalCreditLimit) * 100);
});

// Virtual for score improvement potential
creditScoreSchema.virtual('improvementPotential').get(function () {
  const maxScore = 850;
  const currentScore = this.score;
  return maxScore - currentScore;
});

// Static method to get latest score for user
creditScoreSchema.statics.getLatestScore = function(userId) {
  return this.findOne({ 
    userId: userId, 
    isActive: true 
  }).sort({ reportDate: -1 });
};

// Static method to get score history
creditScoreSchema.statics.getScoreHistory = function(userId, months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.find({
    userId: userId,
    reportDate: { $gte: startDate },
    isActive: true
  }).sort({ reportDate: -1 });
};

// Method to generate recommendations based on score factors
creditScoreSchema.methods.generateRecommendations = function() {
  const recommendations = [];
  
  // Payment history recommendations
  if (this.factors.paymentHistory?.impact === 'negative') {
    recommendations.push({
      category: 'payment_history',
      suggestion: 'Set up automatic payments to ensure all bills are paid on time. Payment history is the most important factor affecting your credit score.',
      priority: 'high'
    });
  }
  
  // Credit utilization recommendations
  if (this.creditUtilizationRatio > 30) {
    recommendations.push({
      category: 'credit_utilization',
      suggestion: 'Keep your credit utilization below 30%. Consider paying down balances or requesting credit limit increases.',
      priority: 'high'
    });
  }
  
  // Credit age recommendations
  if (this.oldestAccountAge < 24) {
    recommendations.push({
      category: 'credit_age',
      suggestion: 'Keep your oldest credit accounts open to maintain a longer credit history.',
      priority: 'medium'
    });
  }
  
  // Credit mix recommendations
  if (this.totalAccounts < 3) {
    recommendations.push({
      category: 'credit_mix',
      suggestion: 'Consider diversifying your credit mix with different types of accounts (credit cards, loans, etc.).',
      priority: 'low'
    });
  }
  
  // New credit recommendations
  if (this.recentInquiries > 2) {
    recommendations.push({
      category: 'new_credit',
      suggestion: 'Avoid applying for new credit frequently. Space out credit applications by at least 6 months.',
      priority: 'medium'
    });
  }
  
  this.recommendations = recommendations;
  return this.save();
};

export default mongoose.model('CreditScore', creditScoreSchema);
