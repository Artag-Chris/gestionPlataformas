const https = require('https');

const token = "EAAN0ak51HtcBROakHkCqzU3ZAeGNHkIbnkpabDTLzyFfwI09pcN0xCu8hggXBgbaWRgk6RFvs4yb7YZBQsPnB8cr85LPI4nP4S0NDvjwKp1Bh9ZBjS6ZApGq3E1YZCXaWcOePs5628N80zV3NWkaJJPthhDusyNVGfWViQap2OGY7Opd1bQBzq7n1RN0BdgZDZD";
const pageId = "970925329432465";

console.log('\n=== Testing Instagram Token ===\n');

// Test 1: Check token validity via /me endpoint
const testMe = () => {
  const url = `https://graph.instagram.com/v25.0/me?access_token=${token}`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Test 1: /me endpoint');
      console.log(`Status: ${res.statusCode}`);
      console.log('Response:', data);
      console.log('\n');
      
      testPageInfo();
    });
  }).on('error', (err) => {
    console.log('Test 1 Error:', err.message);
  });
};

// Test 2: Check page info
const testPageInfo = () => {
  const url = `https://graph.instagram.com/v25.0/${pageId}?fields=username,name,id&access_token=${token}`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Test 2: Page Info');
      console.log(`Status: ${res.statusCode}`);
      console.log('Response:', data);
      console.log('\n');
      
      testBusinessAccount();
    });
  }).on('error', (err) => {
    console.log('Test 2 Error:', err.message);
  });
};

// Test 3: Check business account
const testBusinessAccount = () => {
  const businessAccountId = "17841472713425441";
  const url = `https://graph.instagram.com/v25.0/${businessAccountId}?fields=username,name,id&access_token=${token}`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Test 3: Business Account Info');
      console.log(`Status: ${res.statusCode}`);
      console.log('Response:', data);
    });
  }).on('error', (err) => {
    console.log('Test 3 Error:', err.message);
  });
};

testMe();
