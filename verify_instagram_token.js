#!/usr/bin/env node

/**
 * Script para verificar si un token de Instagram es válido
 * 
 * Uso:
 *   node verify_instagram_token.js <TOKEN>
 * 
 * Ejemplo:
 *   node verify_instagram_token.js "EAAN0ak51HtcBRO..."
 */

const https = require('https');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    }).on('error', reject);
  });
}

async function verifyToken(token) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         Instagram Token Verification Script                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  if (!token) {
    console.log('❌ Error: No token provided');
    console.log('\nUsage: node verify_instagram_token.js <TOKEN>\n');
    process.exit(1);
  }
  
  console.log('Token (first 20 chars):', token.substring(0, 20) + '...\n');
  
  try {
    // Test 1: Verify token with /me endpoint
    console.log('📌 Test 1: Checking token validity...');
    const meUrl = `https://graph.instagram.com/v25.0/me?access_token=${token}`;
    const meResult = await makeRequest(meUrl);
    
    if (meResult.status === 200) {
      console.log('✅ Token is VALID\n');
      console.log('Account Information:');
      console.log('  ID:', meResult.data.id);
      console.log('  Username:', meResult.data.username);
      console.log('  Name:', meResult.data.name || 'N/A');
      
      // Verify it's @artagdev
      if (meResult.data.username === 'artagdev') {
        console.log('\n✅ ✅ ✅ This is @artagdev account!');
      } else {
        console.log('\n⚠️  WARNING: This token belongs to @' + meResult.data.username);
        console.log('   Expected: @artagdev');
      }
      
      // Test 2: Check permissions
      console.log('\n📌 Test 2: Checking token permissions...');
      const permsUrl = `https://graph.instagram.com/v25.0/me/permissions?access_token=${token}`;
      const permsResult = await makeRequest(permsUrl);
      
      if (permsResult.data.data) {
        console.log('\n✅ Token Permissions:');
        permsResult.data.data.forEach(perm => {
          console.log('  ✓', perm.permission, `(${perm.status})`);
        });
        
        // Check required permissions
        const requiredPerms = [
          'instagram_manage_messages',
          'pages_manage_metadata',
          'pages_read_engagement',
          'pages_read_user_content'
        ];
        
        const grantedPerms = permsResult.data.data
          .filter(p => p.status === 'granted')
          .map(p => p.permission);
        
        const missingPerms = requiredPerms.filter(p => !grantedPerms.includes(p));
        
        if (missingPerms.length > 0) {
          console.log('\n⚠️  Missing Permissions:');
          missingPerms.forEach(p => console.log('  ✗', p));
        } else {
          console.log('\n✅ All required permissions granted!');
        }
      }
      
      // Test 3: Try accessing Instagram Business Account
      console.log('\n📌 Test 3: Checking Instagram Business Account access...');
      const businessAccountId = "17841472713425441";
      const accountUrl = `https://graph.instagram.com/v25.0/${businessAccountId}?fields=username,name,id,ig_username&access_token=${token}`;
      const accountResult = await makeRequest(accountUrl);
      
      if (accountResult.status === 200) {
        console.log('\n✅ Can access Instagram Business Account:');
        console.log('  ID:', accountResult.data.id);
        console.log('  Username:', accountResult.data.username);
      } else {
        console.log('\n⚠️  Cannot access business account:', accountResult.data?.error?.message);
      }
      
      console.log('\n✅ Token looks GOOD! You can use this token.\n');
      
    } else if (meResult.status === 400 || meResult.status === 401) {
      console.log('\n❌ Token is INVALID or EXPIRED\n');
      console.log('Error:', meResult.data.error?.message);
      console.log('Code:', meResult.data.error?.code);
      console.log('\n⚠️  You need to generate a NEW token from Meta Business Suite');
      
    } else {
      console.log('\n❌ Unexpected error:', meResult.status);
      console.log('Response:', meResult.data);
    }
    
  } catch (error) {
    console.log('\n❌ Request failed:', error.message);
    process.exit(1);
  }
}

// Get token from command line argument
const token = process.argv[2];
verifyToken(token);
