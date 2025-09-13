import crypto from 'crypto';
import Transaction from '../models/Transaction.js';
import Asset from '../models/Asset.js';
import Liability from '../models/Liability.js';
import Investment from '../models/Investment.js';
import EPF from '../models/EPF.js';
import CreditScore from '../models/CreditScore.js';
import AccountSummary from '../models/AccountSummary.js';
import { recomputeAccountSummary } from './summaryService.js';

function hashIdempotency(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

// --- EPF Ingestion ---
export async function ingestEPF({ userId, documentId, extracted }) {
  const data = extracted || {};
  const filter = {
    userId,
    ...(data.uanNumber ? { uanNumber: data.uanNumber } : {}),
    ...(data.pfAccountNumber ? { pfAccountNumber: data.pfAccountNumber } : {}),
  };

  // Minimal required fields fallbacks
  const lastUpdated = normalizeDate(data.lastUpdated) || new Date();
  const monthlyContribution = Number(data.monthlyContribution ?? 0);
  const totalBalance = Number(data.totalBalance ?? 0);
  const employeeContribution = Number(data.employeeContribution ?? 0);
  const employerContribution = Number(data.employerContribution ?? 0);
  const pensionFundContribution = Number(data.pensionFundContribution ?? 0);

  const upsert = {
    userId,
    uanNumber: data.uanNumber || `UAN-${userId}`,
    pfAccountNumber: data.pfAccountNumber || 'N/A',
    employerName: data.employerName || 'Employer',
    employeeContribution,
    employerContribution,
    pensionFundContribution,
    monthlyContribution,
    totalBalance,
    basicSalary: Number(data.basicSalary ?? monthlyContribution * 12) || 0,
    lastContributionDate: lastUpdated,
  };

  await EPF.findOneAndUpdate(filter.userId ? filter : { userId }, upsert, { upsert: true, new: true, setDefaultsOnInsert: true });

  // Recompute summary
  await recomputeAccountSummary(userId, lastUpdated);
  return { epfUpserted: true };
}

// --- Mutual Fund CAS Ingestion ---
export async function ingestCAS({ userId, documentId, extracted }) {
  const holdings = Array.isArray(extracted?.holdings) ? extracted.holdings : [];
  let count = 0;
  for (const h of holdings) {
    const quantity = Number(h.quantity ?? 0);
    const purchasePrice = Number(h.purchasePrice ?? h.currentPrice ?? 0);
    const currentPrice = h.currentPrice != null ? Number(h.currentPrice) : undefined;
    const currentValue = h.totalValue != null ? Number(h.totalValue) : (currentPrice != null ? currentPrice * quantity : undefined);
    const purchaseDate = normalizeDate(h.purchaseDate) || new Date();

    await Investment.create({
      userId,
      quantity,
      purchasePrice,
      currentPrice,
      currentValue,
      purchaseDate,
      institution: h.institution || 'CAS',
      accountNumber: h.accountNumber || undefined,
      notes: h.name || 'Mutual Fund',
    });
    count++;
  }

  await recomputeAccountSummary(userId, new Date());
  return { holdingsInserted: count };
}

// --- Credit Report Ingestion ---
export async function ingestCreditReport({ userId, documentId, extracted }) {
  const score = Number(extracted?.score ?? 0);
  const reportDate = normalizeDate(extracted?.reportedAt) || new Date();

  await CreditScore.create({
    userId,
    score: isNaN(score) ? 0 : score,
    bureau: 'CIBIL',
    reportDate,
    // Minimal mapping; factors can be expanded later
  });

  // No effect on net worth totals; skip recompute
  return { creditScoreSaved: true };
}

function normalizeDate(input) {
  if (!input) return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return d;
}

function normalizeAmount({ debit, credit }) {
  const d = typeof debit === 'number' ? debit : (debit ? parseFloat(String(debit).replace(/[, ]/g, '')) : null);
  const c = typeof credit === 'number' ? credit : (credit ? parseFloat(String(credit).replace(/[, ]/g, '')) : null);
  if (c != null && !isNaN(c)) return +c; // credits positive
  if (d != null && !isNaN(d)) return -Math.abs(+d); // debits negative
  return 0;
}

function inferType(amount) {
  return amount >= 0 ? 'income' : 'expense';
}

function normalizeDescription(s) {
  if (!s) return '';
  return String(s).trim().replace(/\s+/g, ' ');
}

function quickCategory(desc, amount) {
  const d = desc.toLowerCase();
  if (amount >= 0) {
    if (d.includes('salary') || d.includes('sal')) return 'salary';
    if (d.includes('interest') || d.includes('dividend')) return 'investment_income';
    return 'other_income';
  }
  if (d.includes('swiggy') || d.includes('zomato') || d.includes('restaurant')) return 'food_dining';
  if (d.includes('amazon') || d.includes('flipkart')) return 'shopping';
  if (d.includes('uber') || d.includes('ola') || d.includes('metro') || d.includes('fuel') || d.includes('petrol')) return 'transportation';
  if (d.includes('electricity') || d.includes('water') || d.includes('gas')) return 'utilities';
  if (d.includes('rent')) return 'rent_mortgage';
  if (d.includes('emi') || d.includes('loan')) return 'loan_payment';
  if (d.includes('netflix') || d.includes('spotify') || d.includes('prime')) return 'subscriptions';
  return 'other_expense';
}

export async function ingestBankStatement({ userId, documentId, extracted }) {
  // extracted follows schema from documentProcessor.extractDataWithAI
  const { accountNumber, summary, transactions = [] } = extracted || {};

  // Upsert Asset (bank account)
  let accountAsset = null;
  if (accountNumber) {
    accountAsset = await Asset.findOneAndUpdate(
      { userId, accountNumber },
      {
        userId,
        type: 'bank_account',
        name: 'Bank Account',
        accountNumber,
        balance: summary && typeof summary.endingBalance === 'number' ? summary.endingBalance : 0,
        lastUpdated: new Date(),
      },
      { new: true, upsert: true }
    );
  }

  // Ingest Transactions idempotently
  const createdOrExistingIds = [];
  for (const t of transactions) {
    const date = normalizeDate(t.date);
    const description = normalizeDescription(t.description);
    const amount = normalizeAmount({ debit: t.debit, credit: t.credit });
    const type = inferType(amount);
    const key = hashIdempotency([
      userId.toString(),
      accountNumber || '',
      date ? date.toISOString().slice(0, 10) : '',
      Math.abs(amount).toFixed(2),
      description.toUpperCase(),
    ].join('|'));

    // Try find existing by hash via a unique combination of fields
    const existing = await Transaction.findOne({
      userId,
      accountNumber: accountNumber || undefined,
      amount,
      date,
      description,
    }).lean();

    if (existing) {
      createdOrExistingIds.push(existing._id);
      continue;
    }

    const category = quickCategory(description, amount);

    const trx = await Transaction.create({
      userId,
      amount,
      type,
      description,
      category,
      date,
      merchant: undefined,
      balance: t.balance != null ? Number(t.balance) : undefined,
      accountNumber: accountNumber || undefined,
      referenceNumber: undefined,
      tags: [],
      isRecurring: false,
      source: 'pdf_upload',
      originalText: undefined,
    });
    createdOrExistingIds.push(trx._id);
  }

  // Recompute summary for the month(s) covered
  const periodEnd = normalizeDate(extracted?.statementPeriod?.endDate) || new Date();
  await recomputeAccountSummary(userId, periodEnd);

  return {
    assetId: accountAsset?._id || null,
    transactionsProcessed: createdOrExistingIds.length,
  };
}
