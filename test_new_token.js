const https = require('https');

const token = "IGAAcNmkVLc5NBZAFlHaVNCX2NlMXNXSlJZAemVoTHhoWGc5UHFTTnpNRTF5SEhyaGxpS2VWS29iRnZA4S3YwVXExQzVnV3RyclZARS1NKNUxuOUJIakRST2RSTDhDUEYtVk9TeTV3eXdmUFVmd3l1NzhtTE5BUllqanZAwZAjNSekF5OAZDZD";

const data = {
  message: JSON.stringify({ text: "hello test" }),
  recipient: JSON.stringify({ id: "" })
};

const postData = JSON.stringify(data);

const options = {
  hostname: 'graph.instagram.com',
  port: 443,
  path: '/v21.0/me/messages',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('\n=== Testing Instagram API with New Token ===\n');
console.log('Token (first 30 chars):', token.substring(0, 30) + '...\n');
console.log('Request Details:');
console.log('- Endpoint: POST /v21.0/me/messages');
console.log('- Message: "hello test"');
console.log('- Recipient ID: (empty - test)\n');

const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('=== RESPONSE ===\n');
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    console.log('\nBody:');
    
    try {
      const parsed = JSON.parse(responseData);
      console.log(JSON.stringify(parsed, null, 2));
      
      // Analyze response
      if (res.statusCode === 200) {
        console.log('\n✅ SUCCESS! Token is valid and message endpoint works!');
        if (parsed.message_id) {
          console.log('Message ID:', parsed.message_id);
        }
      } else if (res.statusCode === 400 || res.statusCode === 401) {
        console.log('\n❌ Authentication Error');
        console.log('Error:', parsed.error?.message);
        console.log('Code:', parsed.error?.code);
      } else {
        console.log('\n⚠️  Other error');
      }
    } catch (e) {
      console.log(responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
});

req.write(postData);
req.end();
