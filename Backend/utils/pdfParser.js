import fs from 'fs';

// Enhanced PDF parsing for bank statements
export const parseBankStatement = async (filePath) => {
  try {
    // Dynamic import to avoid startup issues
    const pdf = (await import('pdf-parse')).default;
    
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    const text = pdfData.text;

    // Extract transactions using various patterns
    const transactions = [];
    const lines = text.split('\n').filter(line => line.trim());

    // Common bank statement patterns
    const patterns = [
      // HDFC, ICICI, SBI patterns
      /(\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,]+\.?\d*)\s+(Dr|Cr)\s+([\d,]+\.?\d*)/gi,
      // Axis Bank pattern
      /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/gi,
      // Generic pattern
      /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.{10,}?)\s+([\d,]+\.?\d*)/gi
    ];

    for (const line of lines) {
      for (const pattern of patterns) {
        const matches = [...line.matchAll(pattern)];
        
        for (const match of matches) {
          const transaction = parseTransactionLine(match, line);
          if (transaction && isValidTransaction(transaction)) {
            transactions.push(transaction);
          }
        }
      }
    }

    // Remove duplicates and sort by date
    const uniqueTransactions = removeDuplicateTransactions(transactions);
    return uniqueTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
};

// Parse individual transaction line
const parseTransactionLine = (match, originalLine) => {
  try {
    let date, description, amount, type, balance;

    if (match.length >= 4) {
      date = parseDate(match[1]);
      description = cleanDescription(match[2]);
      
      // Determine if it's debit or credit
      if (match[4] && (match[4].toLowerCase() === 'dr' || match[4].toLowerCase() === 'cr')) {
        amount = parseAmount(match[3]);
        type = match[4].toLowerCase() === 'dr' ? 'expense' : 'income';
        balance = match[5] ? parseAmount(match[5]) : null;
      } else {
        // Try to determine from amount patterns
        amount = parseAmount(match[3]);
        type = determineTransactionType(description, originalLine);
        balance = match[4] ? parseAmount(match[4]) : null;
      }

      return {
        date,
        description,
        amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        type,
        balance,
        originalText: originalLine.trim(),
        source: 'pdf_upload'
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing transaction line:', error);
    return null;
  }
};

// Clean and normalize description
const cleanDescription = (desc) => {
  return desc
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-\.]/g, '')
    .trim()
    .substring(0, 100);
};

// Parse date in various formats
const parseDate = (dateStr) => {
  const formats = [
    /(\d{2})\/(\d{2})\/(\d{4})/,
    /(\d{2})-(\d{2})-(\d{4})/,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const [, day, month, year] = match;
      return new Date(year, month - 1, day);
    }
  }

  throw new Error(`Invalid date format: ${dateStr}`);
};

// Parse amount and handle Indian number format
const parseAmount = (amountStr) => {
  if (!amountStr) return 0;
  
  return parseFloat(
    amountStr
      .replace(/,/g, '')
      .replace(/[^\d.]/g, '')
  ) || 0;
};

// Determine transaction type from description
const determineTransactionType = (description, fullLine) => {
  const desc = description.toLowerCase();
  const line = fullLine.toLowerCase();

  // Income indicators
  const incomeKeywords = [
    'salary', 'sal cr', 'credit', 'deposit', 'transfer cr',
    'interest', 'dividend', 'refund', 'cashback'
  ];

  // Expense indicators
  const expenseKeywords = [
    'debit', 'withdrawal', 'purchase', 'payment', 'emi',
    'bill', 'charge', 'fee', 'atm', 'pos'
  ];

  for (const keyword of incomeKeywords) {
    if (desc.includes(keyword) || line.includes(keyword)) {
      return 'income';
    }
  }

  for (const keyword of expenseKeywords) {
    if (desc.includes(keyword) || line.includes(keyword)) {
      return 'expense';
    }
  }

  // Default to expense if unclear
  return 'expense';
};

// Validate transaction data
const isValidTransaction = (transaction) => {
  return (
    transaction &&
    transaction.date &&
    transaction.description &&
    transaction.description.length > 3 &&
    transaction.amount !== 0 &&
    !isNaN(transaction.amount)
  );
};

// Remove duplicate transactions
const removeDuplicateTransactions = (transactions) => {
  const seen = new Set();
  return transactions.filter(transaction => {
    const key = `${transaction.date.toISOString().split('T')[0]}_${transaction.description}_${transaction.amount}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

// Categorize transaction based on description
export const categorizeTransaction = (description) => {
  const desc = description.toLowerCase();

  // Income categories
  if (desc.includes('salary') || desc.includes('sal cr')) return 'salary';
  if (desc.includes('freelance') || desc.includes('consulting')) return 'freelance';
  if (desc.includes('dividend') || desc.includes('interest')) return 'investment';

  // Expense categories
  if (desc.includes('swiggy') || desc.includes('zomato') || desc.includes('restaurant') || desc.includes('food')) return 'food';
  if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('shopping') || desc.includes('mall')) return 'shopping';
  if (desc.includes('rent') || desc.includes('maintenance')) return 'rent';
  if (desc.includes('electricity') || desc.includes('water') || desc.includes('gas') || desc.includes('utility')) return 'utilities';
  if (desc.includes('uber') || desc.includes('ola') || desc.includes('metro') || desc.includes('petrol') || desc.includes('fuel')) return 'transport';
  if (desc.includes('movie') || desc.includes('netflix') || desc.includes('spotify') || desc.includes('entertainment')) return 'entertainment';
  if (desc.includes('hospital') || desc.includes('medical') || desc.includes('pharmacy') || desc.includes('doctor')) return 'healthcare';
  if (desc.includes('school') || desc.includes('course') || desc.includes('book') || desc.includes('education')) return 'education';
  if (desc.includes('emi') || desc.includes('loan')) return 'emi';
  if (desc.includes('sip') || desc.includes('mutual fund') || desc.includes('fd') || desc.includes('investment')) return 'savings';
  if (desc.includes('insurance') || desc.includes('premium')) return 'insurance';
  if (desc.includes('grocery') || desc.includes('supermarket')) return 'groceries';
  if (desc.includes('mobile') || desc.includes('internet') || desc.includes('broadband')) return 'bills';

  return 'other_expense';
};

// Extract account information from PDF
export const extractAccountInfo = (pdfText) => {
  const accountPatterns = [
    /Account\s+No[:\s]+(\d+)/i,
    /A\/C\s+No[:\s]+(\d+)/i,
    /Account\s+Number[:\s]+(\d+)/i
  ];

  for (const pattern of accountPatterns) {
    const match = pdfText.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};
