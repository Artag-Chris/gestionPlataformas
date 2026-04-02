const https = require('https');

const token = "IGAAcNmkVLc5NBZAGJoWjM2ZAFNGRm0xUkhUQ1ZAqdGxmck5ZAb0x1NHRJdXBJUXpNZA3FPVmh5SkJZAUzFYVzR1LTNmZAUY5dHpTSlFzUHZAXR1lUT1E1QTVCNzJiTjRPUDdVRHc5eFFIekdBZATVtc2V0cXRHTG13dE9mVTY5R1JKakc4ZAwZDZD";
const businessAccountId = "17841472713425441";
const testRecipientId = "12345"; // ID de prueba

const endpoints = [
  {
    name: '/me/messages (Usuario actual)',
    path: `/v21.0/me/messages`,
    data: {
      message: JSON.stringify({ text: "test from /me/messages" }),
      recipient: JSON.stringify({ id: testRecipientId })
    }
  },
  {
    name: `/${businessAccountId}/messages (Business Account)`,
    path: `/v21.0/${businessAccountId}/messages`,
    data: {
      message: JSON.stringify({ text: "test from business account" }),
      recipient: JSON.stringify({ id: testRecipientId })
    }
  }
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(endpoint.data);
    
    const options = {
      hostname: 'graph.instagram.com',
      port: 443,
      path: endpoint.path + `?access_token=${token}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            endpoint: endpoint.name,
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch {
          resolve({
            endpoint: endpoint.name,
            status: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        endpoint: endpoint.name,
        status: 'ERROR',
        data: error.message
      });
    });
    
    req.write(postData);
    req.end();
  });
}

async function testAllEndpoints() {
  console.log('\n=== Testing Different Instagram Message Endpoints ===\n');
  console.log('Token: @artagdev (válido)');
  console.log('Business Account ID:', businessAccountId);
  console.log('Test Recipient ID:', testRecipientId);
  console.log('\n' + '='.repeat(70) + '\n');
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    
    console.log(`📌 ${result.endpoint}`);
    console.log(`   Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log('   ✅ SUCCESS');
      console.log('   Response:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('   ❌ ERROR');
      if (result.data.error) {
        console.log('   Message:', result.data.error.message);
        console.log('   Code:', result.data.error.code);
        console.log('   Subcode:', result.data.error.error_subcode);
      } else {
        console.log('   Response:', result.data);
      }
    }
    console.log('\n');
  }
}

testAllEndpoints();
