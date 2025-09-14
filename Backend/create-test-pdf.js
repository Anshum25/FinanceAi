import fs from 'fs';

// Create a simple text-based PDF using a basic PDF structure
const createSimplePDF = (content, filename) => {
  const pdfHeader = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${content.length + 50}
>>
stream
BT
/F1 12 Tf
50 750 Td
(${content.replace(/\n/g, ') Tj T* (')}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
0000000380 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
456
%%EOF`;

  fs.writeFileSync(filename, pdfHeader);
};

// Create a test bank statement PDF
const bankStatementContent = `BANK STATEMENT
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

try {
  createSimplePDF(bankStatementContent, './test-bank-statement.pdf');
  console.log('✅ Test bank statement PDF created successfully');
} catch (error) {
  console.error('❌ Error creating PDF:', error.message);
}
