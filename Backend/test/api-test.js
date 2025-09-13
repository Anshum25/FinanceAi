import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';

// Test configuration
const testConfig = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User'
};

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      data
    };
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
};

// Test functions
const testAuth = async () => {
  console.log('\n🔐 Testing Authentication...');
  
  // Test signup
  const signupResult = await makeRequest('POST', '/auth/signup', testConfig);
  if (signupResult.success || signupResult.status === 400) {
    console.log('✅ Signup endpoint working');
  } else {
    console.log('❌ Signup failed:', signupResult.error);
  }
  
  // Test login
  const loginResult = await makeRequest('POST', '/auth/login', {
    email: testConfig.email,
    password: testConfig.password
  });
  
  if (loginResult.success) {
    authToken = loginResult.data.token;
    console.log('✅ Login successful');
  } else {
    console.log('❌ Login failed:', loginResult.error);
    return false;
  }
  
  return true;
};

const testFinancialSummary = async () => {
  console.log('\n📊 Testing Financial Summary API...');
  
  const result = await makeRequest('GET', '/data/summary');
  if (result.success) {
    console.log('✅ Financial summary retrieved');
    console.log('   - Assets:', result.data.data.assets?.total || 0);
    console.log('   - Liabilities:', result.data.data.liabilities?.total || 0);
    console.log('   - Net Worth:', result.data.data.netWorth || 0);
  } else {
    console.log('❌ Financial summary failed:', result.error);
  }
};

const testAssets = async () => {
  console.log('\n🏦 Testing Assets API...');
  
  const result = await makeRequest('GET', '/data/assets');
  if (result.success) {
    console.log('✅ Assets retrieved');
    console.log('   - Total Assets:', result.data.data.total || 0);
    console.log('   - Bank Accounts:', result.data.data.breakdown?.bankAccounts?.length || 0);
    console.log('   - Cash:', result.data.data.breakdown?.cash?.length || 0);
  } else {
    console.log('❌ Assets failed:', result.error);
  }
};

const testLiabilities = async () => {
  console.log('\n💳 Testing Liabilities API...');
  
  const result = await makeRequest('GET', '/data/liabilities');
  if (result.success) {
    console.log('✅ Liabilities retrieved');
    console.log('   - Total Liabilities:', result.data.data.total || 0);
    console.log('   - Loans:', result.data.data.breakdown?.loans?.length || 0);
    console.log('   - Credit Cards:', result.data.data.breakdown?.creditCards?.length || 0);
  } else {
    console.log('❌ Liabilities failed:', result.error);
  }
};

const testInvestments = async () => {
  console.log('\n📈 Testing Investments API...');
  
  const result = await makeRequest('GET', '/data/investments');
  if (result.success) {
    console.log('✅ Investments retrieved');
    console.log('   - Total Invested:', result.data.data.portfolio?.totalInvested || 0);
    console.log('   - Current Value:', result.data.data.portfolio?.currentValue || 0);
    console.log('   - Stocks:', result.data.data.breakdown?.stocks?.length || 0);
    console.log('   - Mutual Funds:', result.data.data.breakdown?.mutualFunds?.length || 0);
  } else {
    console.log('❌ Investments failed:', result.error);
  }
};

const testEPF = async () => {
  console.log('\n🏛️ Testing EPF API...');
  
  const result = await makeRequest('GET', '/data/epf');
  if (result.success) {
    console.log('✅ EPF data retrieved');
    if (result.data.data) {
      console.log('   - Employee Balance:', result.data.data.employeeBalance || 0);
      console.log('   - Employer Balance:', result.data.data.employerBalance || 0);
    } else {
      console.log('   - No EPF data found');
    }
  } else {
    console.log('❌ EPF failed:', result.error);
  }
};

const testCreditScore = async () => {
  console.log('\n📊 Testing Credit Score API...');
  
  const result = await makeRequest('GET', '/data/credit-score');
  if (result.success) {
    console.log('✅ Credit Score retrieved');
    if (result.data.data?.current) {
      console.log('   - Current Score:', result.data.data.current.score || 'N/A');
      console.log('   - Rating:', result.data.data.current.rating || 'N/A');
    } else {
      console.log('   - No credit score data found');
    }
  } else {
    console.log('❌ Credit Score failed:', result.error);
  }
};

const testTransactions = async () => {
  console.log('\n💰 Testing Transactions API...');
  
  const result = await makeRequest('GET', '/data/transactions?limit=10');
  if (result.success) {
    console.log('✅ Transactions retrieved');
    console.log('   - Total Income:', result.data.data.summary?.totalIncome || 0);
    console.log('   - Total Expenses:', result.data.data.summary?.totalExpenses || 0);
    console.log('   - Transaction Count:', result.data.data.summary?.transactionCount || 0);
  } else {
    console.log('❌ Transactions failed:', result.error);
  }
};

const testCategoryAnalysis = async () => {
  console.log('\n📋 Testing Category Analysis API...');
  
  const result = await makeRequest('GET', '/data/categories');
  if (result.success) {
    console.log('✅ Category analysis retrieved');
    console.log('   - Categories:', result.data.data.categories?.length || 0);
    console.log('   - Total Expenses:', result.data.data.totalExpenses || 0);
  } else {
    console.log('❌ Category analysis failed:', result.error);
  }
};

const testSpendingTrends = async () => {
  console.log('\n📈 Testing Spending Trends API...');
  
  const result = await makeRequest('GET', '/data/trends');
  if (result.success) {
    console.log('✅ Spending trends retrieved');
    console.log('   - Monthly Trends:', result.data.data.monthlyTrends?.length || 0);
    console.log('   - Insights:', result.data.data.insights?.length || 0);
  } else {
    console.log('❌ Spending trends failed:', result.error);
  }
};

const testAIChat = async () => {
  console.log('\n🤖 Testing AI Chat API...');
  
  const result = await makeRequest('POST', '/ai/chat', {
    message: 'What is my current financial status?'
  });
  
  if (result.success) {
    console.log('✅ AI Chat working');
    console.log('   - Response length:', result.data.response?.length || 0);
  } else {
    console.log('❌ AI Chat failed:', result.error);
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting FinanceAI Backend API Tests');
  console.log('=====================================');
  
  try {
    // Test authentication first
    const authSuccess = await testAuth();
    if (!authSuccess) {
      console.log('\n❌ Authentication failed. Stopping tests.');
      return;
    }
    
    // Test all data endpoints
    await testFinancialSummary();
    await testAssets();
    await testLiabilities();
    await testInvestments();
    await testEPF();
    await testCreditScore();
    await testTransactions();
    await testCategoryAnalysis();
    await testSpendingTrends();
    await testAIChat();
    
    console.log('\n✅ All API tests completed!');
    console.log('=====================================');
    
  } catch (error) {
    console.log('\n❌ Test runner error:', error.message);
  }
};

// Check if server is running
const checkServer = async () => {
  try {
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    return true;
  } catch (error) {
    console.log('❌ Server not running. Please start the server first:');
    console.log('   cd /Users/anshumdev/Desktop/GitHub/FinanceAi/Backend');
    console.log('   npm start');
    return false;
  }
};

// Run tests if server is available
checkServer().then(serverRunning => {
  if (serverRunning) {
    runTests();
  }
});
