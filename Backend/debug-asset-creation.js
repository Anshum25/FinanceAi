import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { detectDocumentType } from './utils/pdfParser.js';

dotenv.config();

async function debugAssetCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financeai', {
      dbName: process.env.MONGODB_DB || 'FinanceAi',
    });
    console.log('✅ Connected to database');

    const mockBankStatementText = `BANK STATEMENT
ABC Bank Limited
Account Number: 1234567890
Statement Period: January 1, 2024 - January 31, 2024

Date        Description                     Debit       Credit      Balance
01/02/2024  Salary Credit                              50000.00    50000.00
01/31/2024  Closing Balance                                        36400.00

Account Summary:
Total Credits: 50000.00
Total Debits: 13600.00
Net Balance: 36400.00`;

    // Test account info extraction
    const { extractAccountInfo } = await import('./utils/pdfParser.js');
    
    console.log('🔍 Testing account info extraction...');
    const accountInfo = extractAccountInfo(mockBankStatementText);
    console.log('📊 Extracted account info:', accountInfo);
    
    // Check if conditions are met for asset creation
    console.log('🔍 Asset creation conditions:');
    console.log(`  - Has account number: ${!!accountInfo.accountNumber}`);
    console.log(`  - Has balance: ${!!accountInfo.balance}`);
    console.log(`  - Both conditions met: ${!!(accountInfo.accountNumber && accountInfo.balance)}`);

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

debugAssetCreation();
