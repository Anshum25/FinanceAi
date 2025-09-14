import fs from 'fs';

async function debugPDFContent() {
  try {
    // Import pdf-parse using require for better compatibility
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const pdf = require('pdf-parse');
    
    // Check the first uploaded PDF file
    const uploadsDir = './uploads/documents/';
    const files = fs.readdirSync(uploadsDir);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      console.log('No PDF files found');
      return;
    }

    const testFile = `${uploadsDir}${pdfFiles[0]}`;
    console.log(`Debugging PDF content: ${pdfFiles[0]}`);
    
    const dataBuffer = fs.readFileSync(testFile);
    const pdfData = await pdf(dataBuffer);
    
    console.log('PDF Text Content:');
    console.log('='.repeat(50));
    console.log(pdfData.text);
    console.log('='.repeat(50));
    console.log(`Total characters: ${pdfData.text.length}`);
    
  } catch (error) {
    console.error('Error reading PDF:', error.message);
  }
}

debugPDFContent();
