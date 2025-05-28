require('dotenv').config();
const { checkEmailInvitations } = require('../src/meeting/autoJoin');

async function testEmail() {
  try {
    console.log('📧 Checking for meeting invitations...');
    await checkEmailInvitations();
    console.log('✅ Email check completed');
  } catch (error) {
    console.error('❌ Error checking emails:', error);
  }
}

testEmail(); 