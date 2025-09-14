import mongoose from 'mongoose';
import Transaction from './models/Transaction.js';
import dotenv from 'dotenv';

dotenv.config();

const determineTransactionType = (description) => {
  const lowerDesc = description.toLowerCase();
  
  // Strong income indicators
  const incomeKeywords = [
    'salary', 'sal cr', 'credit', 'deposit', 'interest', 'dividend', 'refund',
    'bonus', 'freelance', 'consulting', 'rental income', 'transfer in',
    'cash deposit', 'cheque deposit', 'neft cr', 'rtgs cr', 'imps cr'
  ];
  
  // Strong expense indicators  
  const expenseKeywords = [
    'debit', 'withdrawal', 'payment', 'purchase', 'fee', 'charge',
    'swiggy', 'zomato', 'amazon', 'flipkart', 'uber', 'ola', 'netflix',
    'spotify', 'electricity', 'water', 'gas', 'rent', 'emi', 'loan',
    'fuel', 'petrol', 'diesel', 'shopping', 'grocery', 'medical',
    'hospital', 'pharmacy', 'restaurant', 'movie', 'atm', 'pos',
    'online shopping', 'card payment', 'upi', 'gpay', 'paytm', 'phonepe',
    'transfer out', 'neft dr', 'rtgs dr', 'imps dr'
  ];
  
  // Check for income keywords first
  for (const keyword of incomeKeywords) {
    if (lowerDesc.includes(keyword)) {
      return 'income';
    }
  }
  
  // Check for expense keywords
  for (const keyword of expenseKeywords) {
    if (lowerDesc.includes(keyword)) {
      return 'expense';
    }
  }
  
  // Additional heuristics based on common patterns
  if (lowerDesc.includes('opening balance') || lowerDesc.includes('closing balance')) {
    return 'income'; // Balance entries are typically neutral, but we'll mark as income to avoid counting as expense
  }
  
  // If description contains merchant/vendor names, likely expense
  if (lowerDesc.match(/\b(pvt|ltd|llp|inc|corp)\b/) || 
      lowerDesc.match(/\b(store|shop|mart|mall|cafe|restaurant)\b/)) {
    return 'expense';
  }
  
  // Default to expense for unrecognized transactions
  return 'expense';
};

const fixTransactionTypes = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all transactions
    const transactions = await Transaction.find({});
    console.log(`Found ${transactions.length} transactions to process`);

    let updatedCount = 0;
    
    for (const transaction of transactions) {
      const correctType = determineTransactionType(transaction.description);
      
      if (transaction.type !== correctType) {
        await Transaction.findByIdAndUpdate(transaction._id, { type: correctType });
        updatedCount++;
        console.log(`Updated transaction: ${transaction.description} -> ${correctType}`);
      }
    }

    console.log(`\nFixed ${updatedCount} transactions`);
    
    // Show summary
    const incomeCount = await Transaction.countDocuments({ type: 'income' });
    const expenseCount = await Transaction.countDocuments({ type: 'expense' });
    
    console.log(`\nFinal counts:`);
    console.log(`Income transactions: ${incomeCount}`);
    console.log(`Expense transactions: ${expenseCount}`);
    
  } catch (error) {
    console.error('Error fixing transaction types:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

fixTransactionTypes();
