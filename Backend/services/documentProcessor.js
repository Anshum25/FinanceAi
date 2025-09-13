import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const pdfParse = require('pdf-parse');
const csv = require('csv-parser');
const xlsx = require('xlsx');

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Readable } from 'stream';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Main document processing entry point
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} Structured financial data
 */
export const processDocument = async (file) => {
  // Backward-compat: default to bank-style assetStatement processing
  return processDocumentByType(file, 'assetStatement');
};

export const extractDataWithAIForType = async (content, docType = 'assetStatement') => {
  if (docType === 'assetStatement') {
    return extractDataWithAI(content);
  }

  try {
    let schema;
    if (docType === 'epfPassbook') {
      schema = `{
  "uanNumber": "string | null",
  "pfAccountNumber": "string | null",
  "employerName": "string | null",
  "employeeContribution": "number | null",
  "employerContribution": "number | null",
  "pensionFundContribution": "number | null",
  "monthlyContribution": "number | null",
  "totalBalance": "number | null",
  "lastUpdated": "string | null"
}`;
    } else if (docType === 'mutualFundCAS') {
      schema = `{
  "holdings": [
    { "name": "string", "type": "mutual_fund", "quantity": "number | null", "currentPrice": "number | null", "totalValue": "number | null", "purchasePrice": "number | null" }
  ]
}`;
    } else if (docType === 'creditReport') {
      schema = `{
  "score": "number",
  "rating": "string | null",
  "category": "string | null",
  "factors": ["string"],
  "reportedAt": "string | null"
}`;
    } else {
      // Fallback to generic extraction
      return extractDataWithAI(content);
    }

    const prompt = `You are a highly accurate financial data extraction engine. Convert the document to JSON according to the schema exactly. No extra text.\n\nSchema:\n${schema}\n\nDocument Content:\n${content}\n\nReturn only valid JSON.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('AI extraction (typed) error:', error);
    throw new Error(`AI typed extraction failed: ${error.message}`);
  }
};
/**
 * Process document with a specific target type to control AI schema
 * @param {Object} file - Multer-like file object { mimetype, buffer, originalname }
 * @param {('assetStatement'|'epfPassbook'|'mutualFundCAS'|'creditReport')} docType
 */
export const processDocumentByType = async (file, docType = 'assetStatement') => {
  try {
    let parsedContent;
    
    // Determine file type and parse accordingly
    switch (file.mimetype) {
      case 'application/pdf':
        parsedContent = await parsePDF(file.buffer);
        break;
      case 'text/csv':
      case 'application/csv':
        parsedContent = await parseCSV(file.buffer);
        break;
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        parsedContent = await parseExcel(file.buffer);
        break;
      default:
        throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    // Extract structured data using AI
    const structuredData = await extractDataWithAIForType(parsedContent, docType);
    
    return structuredData;
  } catch (error) {
    console.error('Document processing error:', error);
    throw new Error(`Failed to process document: ${error.message}`);
  }
};

/**
 * Parse PDF file and extract text content
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} Extracted text content
 */
export const parsePDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
};

/**
 * Parse CSV file and convert to JSON
 * @param {Buffer} buffer - CSV file buffer
 * @returns {Promise<Array>} Parsed CSV data as array of objects
 */
export const parseCSV = async (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString());
    
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        // Convert array to formatted string for AI processing
        const csvText = results.map(row => 
          Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ')
        ).join('\n');
        resolve(csvText);
      })
      .on('error', (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      });
  });
};

/**
 * Parse Excel file and convert to JSON
 * @param {Buffer} buffer - Excel file buffer
 * @returns {Promise<string>} Parsed Excel data as formatted text
 */
export const parseExcel = async (buffer) => {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Format for AI processing
    const excelText = jsonData.map(row => row.join(', ')).join('\n');
    return excelText;
  } catch (error) {
    throw new Error(`Excel parsing failed: ${error.message}`);
  }
};

/**
 * Extract structured financial data using Gemini AI
 * @param {string} content - Raw document content
 * @returns {Promise<Object>} Structured financial data
 */
export const extractDataWithAI = async (content) => {
  try {
    const prompt = `You are a highly accurate financial data extraction engine. Your only task is to analyze document content and convert it into JSON following the schema exactly. No commentary or extra text.

Analyze the following document. Extract details into the JSON schema below. If data is missing, use null. Use YYYY-MM-DD for dates. Use numbers, not strings, for numeric fields. Include every transaction line.

JSON Schema:
{
  "accountHolderName": "string | null",
  "accountNumber": "string | null",
  "statementPeriod": {
    "startDate": "string | null",
    "endDate": "string | null"
  },
  "summary": {
    "beginningBalance": "number | null",
    "depositsAndCredits": "number | null",
    "withdrawalsAndDebits": "number | null",
    "fees": "number | null",
    "interestPaid": "number | null",
    "endingBalance": "number | null"
  },
  "transactions": [
    {
      "date": "string",
      "description": "string",
      "debit": "number | null",
      "credit": "number | null",
      "balance": "number | null"
    }
  ]
}

Document Content:
${content}

Return only valid JSON without any additional text or formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean and parse the JSON response
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    
    try {
      const parsedData = JSON.parse(cleanedText);
      
      // Validate the structure
      if (!isValidFinancialData(parsedData)) {
        throw new Error('Invalid data structure returned from AI');
      }
      
      return parsedData;
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw AI response:', text);
      throw new Error('Failed to parse AI response as valid JSON');
    }
  } catch (error) {
    console.error('AI extraction error:', error);
    throw new Error(`AI data extraction failed: ${error.message}`);
  }
};

/**
 * Validate the structure of extracted financial data
 * @param {Object} data - Data to validate
 * @returns {boolean} True if valid structure
 */
const isValidFinancialData = (data) => {
  if (!data || typeof data !== 'object') return false;
  
  // Check required top-level properties
  const requiredProps = ['accountHolderName', 'accountNumber', 'statementPeriod', 'summary', 'transactions'];
  for (const prop of requiredProps) {
    if (!(prop in data)) return false;
  }
  
  // Validate statementPeriod structure
  if (data.statementPeriod && typeof data.statementPeriod === 'object') {
    if (!('startDate' in data.statementPeriod) || !('endDate' in data.statementPeriod)) {
      return false;
    }
  }
  
  // Validate summary structure
  if (data.summary && typeof data.summary === 'object') {
    const summaryProps = ['beginningBalance', 'depositsAndCredits', 'withdrawalsAndDebits', 'fees', 'interestPaid', 'endingBalance'];
    for (const prop of summaryProps) {
      if (!(prop in data.summary)) return false;
    }
  }
  
  // Validate transactions array
  if (!Array.isArray(data.transactions)) return false;
  
  // Validate each transaction structure
  for (const transaction of data.transactions) {
    if (!transaction || typeof transaction !== 'object') return false;
    const transactionProps = ['date', 'description', 'debit', 'credit', 'balance'];
    for (const prop of transactionProps) {
      if (!(prop in transaction)) return false;
    }
  }
  
  return true;
};

/**
 * Sanitize and format extracted data
 * @param {Object} data - Raw extracted data
 * @returns {Object} Sanitized data
 */
export const sanitizeFinancialData = (data) => {
  // Ensure numeric fields are properly typed
  if (data.summary) {
    const numericFields = ['beginningBalance', 'depositsAndCredits', 'withdrawalsAndDebits', 'fees', 'interestPaid', 'endingBalance'];
    numericFields.forEach(field => {
      if (data.summary[field] !== null && data.summary[field] !== undefined) {
        const num = parseFloat(data.summary[field]);
        data.summary[field] = isNaN(num) ? null : num;
      }
    });
  }
  
  // Sanitize transaction amounts
  if (data.transactions && Array.isArray(data.transactions)) {
    data.transactions = data.transactions.map(transaction => ({
      ...transaction,
      debit: transaction.debit !== null ? parseFloat(transaction.debit) || null : null,
      credit: transaction.credit !== null ? parseFloat(transaction.credit) || null : null,
      balance: transaction.balance !== null ? parseFloat(transaction.balance) || null : null,
    }));
  }
  
  return data;
};
