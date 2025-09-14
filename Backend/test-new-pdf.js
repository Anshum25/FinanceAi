import { parseBankStatement } from './utils/pdfParser.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testNewPDF() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financeai', {
      dbName: process.env.MONGODB_DB || 'FinanceAi',
    });
    console.log('✅ Connected to database');

    const testFile = './test-bank-statement.pdf';
    const testUserId = '507f1f77bcf86cd799439011';
    
    console.log('🔍 Testing PDF parsing with new bank statement PDF');
    
    const result = await parseBankStatement(testFile, testUserId);
    console.log('✅ PDF parsing completed successfully');
    console.log('📊 Result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

testNewPDF();
