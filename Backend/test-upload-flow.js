import { parseBankStatement } from './utils/pdfParser.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from './models/Transaction.js';
import Asset from './models/Asset.js';
import User from './models/User.js';

dotenv.config();

async function testUploadFlow() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financeai', {
      dbName: process.env.MONGODB_DB || 'FinanceAi',
    });
    console.log('✅ Connected to database');

    const testUserId = '507f1f77bcf86cd799439011';
    
    // Test with a simple text-based approach instead of PDF parsing
    const mockBankStatementText = `BANK STATEMENT
ABC Bank Limited
Account Number: 1234567890
Statement Period: January 1, 2024 - January 31, 2024

Date        Description                     Debit       Credit      Balance
01/01/2024  Opening Balance                                        5000.00
01/02/2024  Salary Credit                              3000.00     8000.00
01/03/2024  ATM Withdrawal                  200.00                 7800.00
01/05/2024  Grocery Store                   150.00                 7650.00
01/07/2024  Utility Bill Payment            120.00                 7530.00
01/10/2024  Restaurant                       80.00                 7450.00
01/15/2024  Online Shopping                 250.00                 7200.00
01/20/2024  Fuel Station                     60.00                 7140.00
01/25/2024  Investment Transfer             500.00                 6640.00
01/31/2024  Closing Balance                                        6640.00

Account Summary:
Total Credits: 3000.00
Total Debits: 1360.00
Net Balance: 6640.00`;

    console.log('🔍 Testing bank statement parsing with mock data');
    
    // Directly test the parsing logic without PDF
    const result = await testBankStatementParsing(mockBankStatementText, testUserId);
    console.log('✅ Bank statement parsing completed');
    console.log('📊 Result:', JSON.stringify(result, null, 2));

    // Verify data was stored in database
    console.log('🔍 Checking stored transactions...');
    const transactions = await Transaction.find({ userId: testUserId }).limit(10);
    console.log(`📊 Found ${transactions.length} transactions in database`);

    console.log('🔍 Checking stored assets...');
    const assets = await Asset.find({ userId: testUserId }).limit(5);
    console.log(`📊 Found ${assets.length} assets in database`);

    if (transactions.length > 0) {
      console.log('✅ Sample transaction:', {
        date: transactions[0].date,
        description: transactions[0].description,
        amount: transactions[0].amount,
        type: transactions[0].type,
        category: transactions[0].category
      });
    }

    if (assets.length > 0) {
      console.log('✅ Sample asset:', {
        name: assets[0].name,
        type: assets[0].type,
        balance: assets[0].balance,
        accountNumber: assets[0].accountNumber
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Direct parsing function that bypasses PDF reading
async function testBankStatementParsing(text, userId) {
  const { detectDocumentType, parseBankStatementData } = await import('./utils/pdfParser.js');
  
  // Simulate the parsing logic
  const docType = detectDocumentType(text);
  console.log(`📄 Detected document type: ${docType}`);
  
  if (docType === 'bank_statement') {
    return await parseBankStatementData(text, userId);
  } else {
    return { type: docType, message: 'Document type not supported for this test' };
  }
}

testUploadFlow();
