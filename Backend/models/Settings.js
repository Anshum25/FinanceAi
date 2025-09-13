import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Settings must belong to a user'],
      unique: true,
    },
    // Display preferences
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY',
      enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
    },
    numberFormat: {
      type: String,
      default: '1,234.56',
      enum: ['1,234.56', '1.234,56', '1 234.56'],
    },
    
    // Notification preferences
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      push: {
        type: Boolean,
        default: true,
      },
      billReminders: {
        type: Boolean,
        default: true,
      },
      largeTransactions: {
        type: Boolean,
        default: true,
      },
      weeklyReports: {
        type: Boolean,
        default: true,
      },
      monthlyReports: {
        type: Boolean,
        default: true,
      },
    },
    
    // Security preferences
    security: {
      twoFactorAuth: {
        type: Boolean,
        default: false,
      },
      loginAlerts: {
        type: Boolean,
        default: true,
      },
      sessionTimeout: {
        type: Number, // in minutes
        default: 30,
        min: 5,
        max: 1440, // 24 hours
      },
    },
    
    // Data preferences
    dataSharing: {
      analytics: {
        type: Boolean,
        default: true,
      },
      personalizedAds: {
        type: Boolean,
        default: false,
      },
      thirdPartySharing: {
        type: Boolean,
        default: false,
      },
    },
    
    // Dashboard preferences
    dashboard: {
      defaultView: {
        type: String,
        enum: ['overview', 'transactions', 'investments', 'budget', 'netWorth'],
        default: 'overview',
      },
      visibleWidgets: [{
        type: String,
        enum: [
          'netWorth',
          'spendingByCategory',
          'recentTransactions',
          'investmentPerformance',
          'budgetTracker',
          'cashFlow',
          'billsDue',
          'savingsGoals',
        ],
      }],
    },
    
    // AI preferences
    aiPreferences: {
      spendingInsights: {
        type: Boolean,
        default: true,
      },
      savingsSuggestions: {
        type: Boolean,
        default: true,
      },
      investmentRecommendations: {
        type: Boolean,
        default: true,
      },
      chatPersonality: {
        type: String,
        enum: ['professional', 'friendly', 'concise', 'detailed'],
        default: 'friendly',
      },
    },
    
    // Integration preferences
    integrations: {
      bankSync: {
        type: Boolean,
        default: false,
      },
      exportFormats: [{
        type: String,
        enum: ['csv', 'excel', 'pdf', 'json'],
      }],
    },
    
    // Privacy preferences (mirrors user.permissions but allows for future expansion)
    privacy: {
      assets: { type: Boolean, default: true },
      liabilities: { type: Boolean, default: true },
      transactions: { type: Boolean, default: true },
      investments: { type: Boolean, default: true },
      epf: { type: Boolean, default: true },
      creditScore: { type: Boolean, default: true },
    },
    
    // Last updated timestamp
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
settingsSchema.index({ user: 1 }, { unique: true });

// Query middleware to populate user data
settingsSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name email',
  });
  next();
});

// Update lastUpdated timestamp before saving
settingsSchema.pre('save', function (next) {
  this.lastUpdated = Date.now();
  next();
});

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
