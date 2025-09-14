import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from './models/Transaction.js';
import Asset from './models/Asset.js';
import User from './models/User.js';
import { parseBankStatementData, detectDocumentType } from './utils/pdfParser.js';

dotenv.config();

async function testCompleteFlow() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financeai', {
      dbName: process.env.MONGODB_DB || 'FinanceAi',
    });
    console.log('✅ Connected to database');

    // Create or find a test user
    let testUser = await User.findOne({ email: 'test@financeai.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@financeai.com',
        password: 'testpassword123',
        passwordConfirm: 'testpassword123'
      });
      console.log('✅ Created test user');
    } else {
      console.log('✅ Found existing test user');
    }

    const userId = testUser._id;
    console.log(`📋 Using user ID: ${userId}`);

    // Clear existing test data
    await Transaction.deleteMany({ userId });
    await Asset.deleteMany({ userId });
    console.log('🧹 Cleared existing test data');

    // Test bank statement parsing
    const mockBankStatementText = `BANK STATEMENT
ABC Bank Limited
Account Number: 1234567890
Statement Period: January 1, 2024 - January 31, 2024

Date        Description                     Debit       Credit      Balance
01/02/2024  Salary Credit                              50000.00    50000.00
01/03/2024  ATM Withdrawal                  2000.00                48000.00
01/05/2024  Grocery Store                   1500.00                46500.00
01/07/2024  Utility Bill Payment            1200.00                45300.00
01/10/2024  Restaurant                       800.00                44500.00
01/15/2024  Online Shopping                 2500.00                42000.00
01/20/2024  Fuel Station                     600.00                41400.00
01/25/2024  Investment SIP                  5000.00                36400.00
01/31/2024  Closing Balance                                        36400.00

Account Summary:
Total Credits: 50000.00
Total Debits: 13600.00
Net Balance: 36400.00`;

    console.log('🔍 Testing document parsing with real user ID');
    const docType = detectDocumentType(mockBankStatementText);
    console.log(`📄 Detected document type: ${docType}`);

    if (docType === 'bank_statement') {
      const result = await parseBankStatementData(mockBankStatementText, userId);
      console.log('✅ Bank statement parsing completed');
      console.log(`📊 Parsed ${result.transactions.length} transactions`);
    }

    // Verify data was stored
    const storedTransactions = await Transaction.find({ userId }).sort({ date: -1 });
    const storedAssets = await Asset.find({ userId });

    console.log(`📊 Stored ${storedTransactions.length} transactions in database`);
    console.log(`📊 Stored ${storedAssets.length} assets in database`);

    if (storedTransactions.length > 0) {
      console.log('✅ Sample transactions:');
      storedTransactions.slice(0, 3).forEach((txn, index) => {
        console.log(`  ${index + 1}. ${txn.description}: ₹${txn.amount} (${txn.type})`);
      });
    }

    if (storedAssets.length > 0) {
      console.log('✅ Sample assets:');
      storedAssets.forEach((asset, index) => {
        console.log(`  ${index + 1}. ${asset.name}: ₹${asset.balance} (${asset.type})`);
      });
    }

    // Test data retrieval via API endpoints (simulate what AI would access)
    console.log('🔍 Testing data retrieval for AI...');
    
    // Simulate the data fetching logic from aiController
    const transactions = await Transaction.find({ userId }).sort({ date: -1 }).limit(10);
    const assets = await Asset.find({ userId });
    
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalAssetValue = assets.reduce((sum, a) => sum + (a.balance || 0), 0);

    console.log('📊 Financial Summary for AI:');
    console.log(`  - Total Income: ₹${totalIncome}`);
    console.log(`  - Total Expenses: ₹${totalExpenses}`);
    console.log(`  - Net Cash Flow: ₹${totalIncome - totalExpenses}`);
    console.log(`  - Total Assets: ₹${totalAssetValue}`);
    console.log(`  - Transaction Count: ${transactions.length}`);

    if (transactions.length > 0 && totalAssetValue > 0) {
      console.log('✅ SUCCESS: Document parsing and data storage working correctly!');
      console.log('✅ AI should now be able to access this financial data');
    } else {
      console.log('❌ ISSUE: Data not properly stored or accessible');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

testCompleteFlow();
