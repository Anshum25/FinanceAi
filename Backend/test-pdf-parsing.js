import { parseBankStatement } from './utils/pdfParser.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function testPDFParsing() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financeai', {
      dbName: process.env.MONGODB_DB || 'FinanceAi',
    });
    console.log('✅ Connected to database');

    // Check if any uploaded documents exist
    const uploadsDir = './uploads/documents/';
    const files = fs.readdirSync(uploadsDir);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      console.log('❌ No PDF files found in uploads directory');
      return;
    }

    console.log(`📄 Found ${pdfFiles.length} PDF files`);
    
    // Test with the first PDF file
    const testFile = `${uploadsDir}${pdfFiles[0]}`;
    const testUserId = '507f1f77bcf86cd799439011'; // Mock user ID
    
    console.log(`🔍 Testing PDF parsing with: ${pdfFiles[0]}`);
    
    try {
      const result = await parseBankStatement(testFile, testUserId);
      console.log('✅ PDF parsing completed successfully');
      console.log('📊 Result:', result);
    } catch (parseError) {
      console.error('❌ PDF parsing failed:', parseError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

testPDFParsing();
