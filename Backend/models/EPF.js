import mongoose from 'mongoose';

const epfSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeContribution: {
    type: Number,
    required: true,
    min: [0, 'Employee contribution cannot be negative']
  },
  employerContribution: {
    type: Number,
    required: true,
    min: [0, 'Employer contribution cannot be negative']
  },
  pensionFundContribution: {
    type: Number,
    default: 0,
    min: [0, 'Pension fund contribution cannot be negative']
  },
  totalBalance: {
    type: Number,
    required: true,
    min: [0, 'Total balance cannot be negative']
  },
  monthlyContribution: {
    type: Number,
    required: true,
    min: [0, 'Monthly contribution cannot be negative']
  },
  basicSalary: {
    type: Number,
    required: true,
    min: [0, 'Basic salary cannot be negative']
  },
  pfAccountNumber: {
    type: String,
    required: true,
    trim: true
  },
  uanNumber: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  employerName: {
    type: String,
    required: true,
    trim: true
  },
  employerCode: {
    type: String,
    trim: true
  },
  dateOfJoining: {
    type: Date,
    required: true
  },
  lastContributionDate: {
    type: Date,
    default: Date.now
  },
  interestRate: {
    type: Number,
    default: 8.5, // Current EPF interest rate
    min: 0,
    max: 20
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
epfSchema.index({ userId: 1 });
epfSchema.index({ uanNumber: 1 });
epfSchema.index({ isActive: 1 });

// Virtual for total years of service
epfSchema.virtual('yearsOfService').get(function () {
  const now = new Date();
  const diffTime = now - this.dateOfJoining;
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(diffYears * 10) / 10; // Round to 1 decimal place
});

// Virtual for projected retirement corpus (assuming retirement at 58)
epfSchema.virtual('projectedRetirementCorpus').get(function () {
  const retirementAge = 58;
  const currentAge = this.yearsOfService + 25; // Assuming average joining age of 25
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  
  if (yearsToRetirement <= 0) return this.totalBalance;
  
  // Simple compound interest calculation
  const annualContribution = this.monthlyContribution * 12;
  const rate = this.interestRate / 100;
  
  // Future value of current balance
  const futureValueCurrent = this.totalBalance * Math.pow(1 + rate, yearsToRetirement);
  
  // Future value of annual contributions (annuity)
  const futureValueContributions = annualContribution * 
    ((Math.pow(1 + rate, yearsToRetirement) - 1) / rate);
  
  return Math.round(futureValueCurrent + futureValueContributions);
});

// Method to add monthly contribution
epfSchema.methods.addContribution = function(employeeAmount, employerAmount, pensionAmount = 0) {
  this.employeeContribution += employeeAmount;
  this.employerContribution += employerAmount;
  this.pensionFundContribution += pensionAmount;
  this.totalBalance += (employeeAmount + employerAmount + pensionAmount);
  this.lastContributionDate = new Date();
  return this.save();
};

export default mongoose.model('EPF', epfSchema);
