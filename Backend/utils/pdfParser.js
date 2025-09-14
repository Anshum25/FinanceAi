import fs from 'fs';
import Asset from '../models/Asset.js';
import Liability from '../models/Liability.js';
import Investment from '../models/Investment.js';
import EPF from '../models/EPF.js';
import CreditScore from '../models/CreditScore.js';
import Transaction from '../models/Transaction.js';

// Enhanced PDF parsing for comprehensive financial documents
export const parseBankStatement = async (filePath, userId) => {
  try {
    // Import pdf-parse using require for better compatibility
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const pdf = require('pdf-parse');
    
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    const text = pdfData.text;

    // Detect document type
    const docType = detectDocumentType(text);
    
    switch (docType) {
      case 'bank_statement':
        return await parseBankStatementData(text, userId);
      case 'credit_card_statement':
        return await parseCreditCardStatement(text, userId);
      case 'investment_statement':
        return await parseInvestmentStatement(text, userId);
      case 'epf_statement':
        return await parseEPFStatement(text, userId);
      case 'loan_statement':
        return await parseLoanStatement(text, userId);
      default:
        return await parseGenericFinancialDocument(text, userId);
    }
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }
};

// Detect document type based on content
export const detectDocumentType = (text) => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('bank statement') || lowerText.includes('account statement')) {
    return 'bank_statement';
  }
  if (lowerText.includes('credit card') || lowerText.includes('card statement')) {
    return 'credit_card_statement';
  }
  if (lowerText.includes('mutual fund') || lowerText.includes('portfolio') || lowerText.includes('demat')) {
    return 'investment_statement';
  }
  if (lowerText.includes('epf') || lowerText.includes('provident fund') || lowerText.includes('pf balance')) {
    return 'epf_statement';
  }
  if (lowerText.includes('loan statement') || lowerText.includes('emi') || lowerText.includes('outstanding')) {
    return 'loan_statement';
  }
  
  return 'generic';
};

// Parse bank statement transactions
export const parseBankStatementData = async (text, userId) => {
  const transactions = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // Extract account information
  const accountInfo = extractAccountInfo(text);
  
  // Save or update bank account asset
  if (accountInfo.accountNumber && accountInfo.balance) {
    await Asset.findOneAndUpdate(
      { userId, accountNumber: accountInfo.accountNumber },
      {
        userId,
        type: 'bank_account',
        name: accountInfo.bankName || 'Bank Account',
        accountNumber: accountInfo.accountNumber,
        bankName: accountInfo.bankName,
        balance: parseFloat(accountInfo.balance.replace(/[,₹]/g, '')),
        isActive: true,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
  }

  // Common bank statement patterns
  const patterns = [
    /(\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,]+\.?\d*)\s+(Dr|Cr)\s+([\d,]+\.?\d*)/gi,
    /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/gi,
    /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.?\d*)/gi
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
  
  // Save transactions to database
  for (const txn of uniqueTransactions) {
    await Transaction.findOneAndUpdate(
      { 
        userId, 
        date: txn.date, 
        amount: txn.amount, 
        description: txn.description 
      },
      { ...txn, userId, source: 'bank_statement' },
      { upsert: true, new: true }
    );
  }

  return {
    type: 'bank_statement',
    accountInfo,
    transactions: uniqueTransactions,
    summary: {
      totalTransactions: uniqueTransactions.length,
      totalIncome: uniqueTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: uniqueTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    }
  };
};

// Parse credit card statement
const parseCreditCardStatement = async (text, userId) => {
  const transactions = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // Extract credit card information
  const cardInfo = extractCreditCardInfo(text);
  
  // Save or update credit card liability
  if (cardInfo.cardNumber && cardInfo.outstandingBalance) {
    await Liability.findOneAndUpdate(
      { userId, accountNumber: cardInfo.cardNumber },
      {
        userId,
        type: 'credit_card',
        name: cardInfo.cardName || 'Credit Card',
        lender: cardInfo.bankName || 'Bank',
        accountNumber: cardInfo.cardNumber,
        originalAmount: cardInfo.creditLimit || 0,
        currentBalance: parseFloat(cardInfo.outstandingBalance.replace(/[,₹]/g, '')),
        creditLimit: cardInfo.creditLimit ? parseFloat(cardInfo.creditLimit.replace(/[,₹]/g, '')) : 0,
        availableCredit: cardInfo.availableCredit ? parseFloat(cardInfo.availableCredit.replace(/[,₹]/g, '')) : 0,
        interestRate: cardInfo.interestRate || 18.5,
        monthlyPayment: cardInfo.minimumPayment ? parseFloat(cardInfo.minimumPayment.replace(/[,₹]/g, '')) : 0,
        minimumPayment: cardInfo.minimumPayment ? parseFloat(cardInfo.minimumPayment.replace(/[,₹]/g, '')) : 0,
        startDate: new Date(),
        nextDueDate: cardInfo.dueDate ? new Date(cardInfo.dueDate) : new Date(),
        isActive: true,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
  }

  // Parse credit card transactions
  const ccPatterns = [
    /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.?\d*)/gi,
    /(\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,]+\.?\d*)/gi
  ];

  for (const line of lines) {
    for (const pattern of ccPatterns) {
      const matches = [...line.matchAll(pattern)];
      
      for (const match of matches) {
        const transaction = {
          date: parseDate(match[1]),
          description: cleanDescription(match[2]),
          amount: parseAmount(match[3]),
          type: 'expense',
          category: categorizeTransaction(match[2]),
          paymentMethod: 'credit_card'
        };
        
        if (isValidTransaction(transaction)) {
          transactions.push(transaction);
        }
      }
    }
  }

  return {
    type: 'credit_card_statement',
    cardInfo,
    transactions,
    summary: {
      totalTransactions: transactions.length,
      totalSpent: transactions.reduce((sum, t) => sum + t.amount, 0)
    }
  };
};

// Parse investment statement
const parseInvestmentStatement = async (text, userId) => {
  const investments = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // Patterns for different investment types
  const stockPattern = /(.+?)\s+(\d+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/gi;
  const mfPattern = /(.+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/gi;

  for (const line of lines) {
    // Try stock pattern first
    const stockMatches = [...line.matchAll(stockPattern)];
    for (const match of stockMatches) {
      const investment = {
        name: cleanDescription(match[1]),
        type: 'stocks',
        quantity: parseInt(match[2]),
        purchasePrice: parseAmount(match[3]),
        currentPrice: parseAmount(match[4]),
        currentValue: parseAmount(match[5]),
        totalInvested: parseInt(match[2]) * parseAmount(match[3]),
        purchaseDate: new Date(),
        isActive: true
      };
      
      if (investment.name && investment.quantity > 0) {
        investments.push(investment);
      }
    }

    // Try mutual fund pattern
    const mfMatches = [...line.matchAll(mfPattern)];
    for (const match of mfMatches) {
      const investment = {
        name: cleanDescription(match[1]),
        type: 'mutual_funds',
        quantity: parseAmount(match[2]),
        purchasePrice: parseAmount(match[3]),
        currentValue: parseAmount(match[4]),
        totalInvested: parseAmount(match[2]) * parseAmount(match[3]),
        purchaseDate: new Date(),
        isActive: true
      };
      
      if (investment.name && investment.quantity > 0) {
        investments.push(investment);
      }
    }
  }

  // Save investments to database
  for (const inv of investments) {
    await Investment.findOneAndUpdate(
      { userId, name: inv.name, type: inv.type },
      { ...inv, userId },
      { upsert: true, new: true }
    );
  }

  return {
    type: 'investment_statement',
    investments,
    summary: {
      totalInvestments: investments.length,
      totalValue: investments.reduce((sum, i) => sum + i.currentValue, 0),
      totalInvested: investments.reduce((sum, i) => sum + i.totalInvested, 0)
    }
  };
};

// Parse EPF statement
const parseEPFStatement = async (text, userId) => {
  const epfInfo = extractEPFInfo(text);
  
  if (epfInfo.uanNumber && epfInfo.totalBalance) {
    await EPF.findOneAndUpdate(
      { userId },
      {
        userId,
        employeeContribution: epfInfo.employeeContribution || 0,
        employerContribution: epfInfo.employerContribution || 0,
        pensionFundContribution: epfInfo.pensionContribution || 0,
        totalBalance: parseFloat(epfInfo.totalBalance.replace(/[,₹]/g, '')),
        monthlyContribution: epfInfo.monthlyContribution || 0,
        basicSalary: epfInfo.basicSalary || 0,
        pfAccountNumber: epfInfo.pfAccountNumber || '',
        uanNumber: epfInfo.uanNumber,
        employerName: epfInfo.employerName || '',
        employerCode: epfInfo.employerCode || '',
        dateOfJoining: epfInfo.dateOfJoining ? new Date(epfInfo.dateOfJoining) : new Date(),
        lastContributionDate: new Date(),
        interestRate: epfInfo.interestRate || 8.5,
        isActive: true
      },
      { upsert: true, new: true }
    );
  }

  return {
    type: 'epf_statement',
    epfInfo,
    summary: {
      totalBalance: epfInfo.totalBalance,
      monthlyContribution: epfInfo.monthlyContribution
    }
  };
};

// Parse loan statement
const parseLoanStatement = async (text, userId) => {
  const loanInfo = extractLoanInfo(text);
  
  if (loanInfo.accountNumber && loanInfo.outstandingBalance) {
    await Liability.findOneAndUpdate(
      { userId, accountNumber: loanInfo.accountNumber },
      {
        userId,
        type: loanInfo.loanType || 'personal_loan',
        name: loanInfo.loanName || 'Loan',
        lender: loanInfo.bankName || 'Bank',
        accountNumber: loanInfo.accountNumber,
        originalAmount: parseFloat(loanInfo.originalAmount?.replace(/[,₹]/g, '') || '0'),
        currentBalance: parseFloat(loanInfo.outstandingBalance.replace(/[,₹]/g, '')),
        interestRate: loanInfo.interestRate || 10,
        monthlyPayment: parseFloat(loanInfo.emiAmount?.replace(/[,₹]/g, '') || '0'),
        startDate: loanInfo.loanStartDate ? new Date(loanInfo.loanStartDate) : new Date(),
        endDate: loanInfo.maturityDate ? new Date(loanInfo.maturityDate) : null,
        nextDueDate: loanInfo.nextDueDate ? new Date(loanInfo.nextDueDate) : new Date(),
        isActive: true,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
  }

  return {
    type: 'loan_statement',
    loanInfo,
    summary: {
      outstandingBalance: loanInfo.outstandingBalance,
      monthlyEMI: loanInfo.emiAmount
    }
  };
};

// Generic financial document parser
const parseGenericFinancialDocument = async (text, userId) => {
  const transactions = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // Try to extract any financial data
  const dateAmountPattern = /(\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,]+\.?\d*)/gi;
  
  for (const line of lines) {
    const matches = [...line.matchAll(dateAmountPattern)];
    
    for (const match of matches) {
      const transaction = {
        date: parseDate(match[1]),
        description: cleanDescription(match[2]),
        amount: parseAmount(match[3]),
        type: determineTransactionType(match[2], line),
        category: categorizeTransaction(match[2])
      };
      
      if (isValidTransaction(transaction)) {
        transactions.push(transaction);
      }
    }
  }

  return {
    type: 'generic',
    transactions,
    summary: {
      totalTransactions: transactions.length
    }
  };
};

// Helper functions
export const extractAccountInfo = (text) => {
  const accountNumberMatch = text.match(/account\s+(?:no|number)[.:]?\s*(\d+)/i);
  const balanceMatch = text.match(/(?:net\s+balance|closing\s+balance|balance)[:\s]*([\d,]+\.?\d*)/i);
  const bankNameMatch = text.match(/(hdfc|icici|sbi|axis|kotak|yes|pnb|bob|canara|abc)/i);
  
  return {
    accountNumber: accountNumberMatch ? accountNumberMatch[1] : null,
    balance: balanceMatch ? balanceMatch[1] : null,
    bankName: bankNameMatch ? bankNameMatch[1].toUpperCase() : null
  };
};

const extractCreditCardInfo = (text) => {
  const cardNumberMatch = text.match(/card\s+no[.:]?\s*(\d+)/i);
  const outstandingMatch = text.match(/outstanding[:\s]*([\d,]+\.?\d*)/i);
  const creditLimitMatch = text.match(/credit\s+limit[:\s]*([\d,]+\.?\d*)/i);
  const dueDateMatch = text.match(/due\s+date[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
  
  return {
    cardNumber: cardNumberMatch ? cardNumberMatch[1] : null,
    outstandingBalance: outstandingMatch ? outstandingMatch[1] : null,
    creditLimit: creditLimitMatch ? creditLimitMatch[1] : null,
    dueDate: dueDateMatch ? dueDateMatch[1] : null
  };
};

const extractEPFInfo = (text) => {
  const uanMatch = text.match(/uan[:\s]*(\d+)/i);
  const balanceMatch = text.match(/total\s+balance[:\s]*([\d,]+\.?\d*)/i);
  const employeeMatch = text.match(/employee\s+contribution[:\s]*([\d,]+\.?\d*)/i);
  const employerMatch = text.match(/employer\s+contribution[:\s]*([\d,]+\.?\d*)/i);
  
  return {
    uanNumber: uanMatch ? uanMatch[1] : null,
    totalBalance: balanceMatch ? balanceMatch[1] : null,
    employeeContribution: employeeMatch ? employeeMatch[1] : null,
    employerContribution: employerMatch ? employerMatch[1] : null
  };
};

const extractLoanInfo = (text) => {
  const accountMatch = text.match(/loan\s+account[:\s]*(\d+)/i);
  const outstandingMatch = text.match(/outstanding[:\s]*([\d,]+\.?\d*)/i);
  const emiMatch = text.match(/emi[:\s]*([\d,]+\.?\d*)/i);
  const interestMatch = text.match(/interest\s+rate[:\s]*([\d.]+)%?/i);
  
  return {
    accountNumber: accountMatch ? accountMatch[1] : null,
    outstandingBalance: outstandingMatch ? outstandingMatch[1] : null,
    emiAmount: emiMatch ? emiMatch[1] : null,
    interestRate: interestMatch ? parseFloat(interestMatch[1]) : null
  };
};

const parseTransactionLine = (match, originalLine) => {
  try {
    let date, description, amount, type, balance;

    if (match.length >= 4) {
      date = parseDate(match[1]);
      description = cleanDescription(match[2]);
      
      if (match[4] && (match[4].toLowerCase() === 'dr' || match[4].toLowerCase() === 'cr')) {
        amount = parseAmount(match[3]);
        type = match[4].toLowerCase() === 'dr' ? 'expense' : 'income';
        balance = match[5] ? parseAmount(match[5]) : null;
      } else {
        amount = parseAmount(match[3]);
        type = determineTransactionType(description, originalLine);
        balance = match[4] ? parseAmount(match[4]) : null;
      }

      return {
        date,
        description,
        amount,
        type,
        category: categorizeTransaction(description),
        balance
      };
    }
    return null;
  } catch (error) {
    return null;
  }
};

const parseDate = (dateStr) => {
  const formats = [
    /(\d{2})\/(\d{2})\/(\d{4})/,
    /(\d{2})-(\d{2})-(\d{4})/
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const date = new Date(`${match[3]}-${match[2]}-${match[1]}`);
      // Validate the date
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  // Return current date if parsing fails
  return new Date();
};

const parseAmount = (amountStr) => {
  return parseFloat(amountStr.replace(/[,₹]/g, '')) || 0;
};

const cleanDescription = (desc) => {
  return desc.trim().replace(/\s+/g, ' ').substring(0, 100);
};

const determineTransactionType = (description, line) => {
  const lowerDesc = description.toLowerCase();
  const lowerLine = line.toLowerCase();
  
  const incomeKeywords = ['salary', 'credit', 'deposit', 'interest', 'dividend', 'refund'];
  const expenseKeywords = ['debit', 'withdrawal', 'payment', 'purchase', 'fee', 'charge'];
  
  for (const keyword of incomeKeywords) {
    if (lowerDesc.includes(keyword) || lowerLine.includes(keyword)) {
      return 'income';
    }
  }
  
  for (const keyword of expenseKeywords) {
    if (lowerDesc.includes(keyword) || lowerLine.includes(keyword)) {
      return 'expense';
    }
  }
  
  return 'expense'; // Default to expense
};

export const categorizeTransaction = (description) => {
  const lowerDesc = description.toLowerCase();
  
  // Income categories
  if (lowerDesc.includes('salary') || lowerDesc.includes('pay')) return 'salary';
  if (lowerDesc.includes('bonus') || lowerDesc.includes('incentive')) return 'bonus';
  if (lowerDesc.includes('interest') || lowerDesc.includes('dividend')) return 'investment_income';
  
  // Expense categories
  if (lowerDesc.includes('grocery') || lowerDesc.includes('supermarket')) return 'groceries';
  if (lowerDesc.includes('restaurant') || lowerDesc.includes('food')) return 'food_dining';
  if (lowerDesc.includes('fuel') || lowerDesc.includes('petrol') || lowerDesc.includes('diesel')) return 'fuel';
  if (lowerDesc.includes('uber') || lowerDesc.includes('taxi') || lowerDesc.includes('transport')) return 'transportation';
  if (lowerDesc.includes('electricity') || lowerDesc.includes('water') || lowerDesc.includes('gas')) return 'utilities';
  if (lowerDesc.includes('rent') || lowerDesc.includes('mortgage')) return 'rent_mortgage';
  if (lowerDesc.includes('insurance')) return 'insurance';
  if (lowerDesc.includes('medical') || lowerDesc.includes('hospital') || lowerDesc.includes('pharmacy')) return 'healthcare';
  if (lowerDesc.includes('movie') || lowerDesc.includes('entertainment')) return 'entertainment';
  if (lowerDesc.includes('shopping') || lowerDesc.includes('mall')) return 'shopping';
  if (lowerDesc.includes('emi') || lowerDesc.includes('loan')) return 'loan_payment';
  if (lowerDesc.includes('credit card')) return 'credit_card_payment';
  
  return 'other_expense';
};

const isValidTransaction = (transaction) => {
  return transaction && 
         transaction.date && 
         transaction.description && 
         transaction.amount > 0 &&
         transaction.description.length > 3;
};

const removeDuplicateTransactions = (transactions) => {
  const seen = new Set();
  return transactions.filter(txn => {
    try {
      const dateStr = txn.date && !isNaN(txn.date.getTime()) ? 
        txn.date.toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0];
      const key = `${dateStr}-${txn.amount}-${txn.description}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    } catch (error) {
      return true; // Keep transaction if there's an error
    }
  });
};
