// Script to generate properly hashed passwords for testing
const bcrypt = require('bcrypt');

async function generatePasswords() {
  console.log('Generating hashed passwords...\n');
  
  const adminPassword = 'admin123';
  const volunteerPassword = 'volunteer123';
  
  try {
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const volunteerHash = await bcrypt.hash(volunteerPassword, 10);
    
    console.log('Admin password hash:', adminHash);
    console.log('Volunteer password hash:', volunteerHash);
    
    // Test the hashes
    const adminTest = await bcrypt.compare(adminPassword, adminHash);
    const volunteerTest = await bcrypt.compare(volunteerPassword, volunteerHash);
    
    console.log('\nVerification:');
    console.log('Admin password test:', adminTest ? 'PASS' : 'FAIL');
    console.log('Volunteer password test:', volunteerTest ? 'PASS' : 'FAIL');
    
  } catch (error) {
    console.error('Error generating passwords:', error);
  }
}

generatePasswords();

