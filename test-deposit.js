/**
 * Test Deposit API
 * Run: node test-deposit.js
 */

const backendUrl = 'https://server-tau-puce.vercel.app';

async function testDeposit() {
  console.log('\n🧪 Testing Deposit API\n');
  console.log(`Backend URL: ${backendUrl}\n`);

  // Test data
  const phoneNumber = '254712345678'; // Example M-Pesa number
  const amount = 100;
  const userId = 'user1';

  try {
    console.log('1️⃣ Testing Health Endpoint...');
    const healthResponse = await fetch(`${backendUrl}/api/health`);
    if (!healthResponse.ok) throw new Error(`Health check failed: ${healthResponse.status}`);
    const health = await healthResponse.json();
    console.log('✅ Backend Status:', health.status);
    console.log('✅ Environment:', health.environment);

    console.log('\n2️⃣ Testing Payment Initiation...');
    console.log(`📞 Phone: ${phoneNumber}`);
    console.log(`💰 Amount: KSH ${amount}`);
    console.log(`👤 User ID: ${userId}\n`);

    const paymentResponse = await fetch(`${backendUrl}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        phoneNumber,
        userId
      })
    });

    const paymentData = await paymentResponse.json();
    
    if (!paymentResponse.ok) {
      console.log('❌ Payment Initiation Failed');
      console.log('Status:', paymentResponse.status);
      console.log('Error:', paymentData.message);
      return;
    }

    console.log('✅ Payment Initiated Successfully!');
    console.log('Response:', JSON.stringify(paymentData, null, 2));

    if (paymentData.data?.externalReference || paymentData.externalReference) {
      const ref = paymentData.data?.externalReference || paymentData.externalReference;
      console.log('\n3️⃣ Testing Status Check...');
      console.log(`📋 Reference: ${ref}\n`);

      const statusResponse = await fetch(`${backendUrl}/api/payments/status/${ref}`);
      const statusData = await statusResponse.json();
      
      console.log('✅ Status Check Response:');
      console.log(JSON.stringify(statusData, null, 2));
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ If all tests passed, deposits should work!');
  console.log('═══════════════════════════════════════════════\n');
}

testDeposit();
