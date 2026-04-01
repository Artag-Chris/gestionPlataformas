#!/usr/bin/env node

/**
 * Script to find correct Instagram/Facebook Page IDs
 * Reads INSTAGRAM_ACCESS_TOKEN from .env and fetches all pages
 */

const fs = require('fs');
const path = require('path');

// Read .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  
  return env;
}

const env = loadEnv();
const accessToken = env.INSTAGRAM_ACCESS_TOKEN;

if (!accessToken) {
  console.error('❌ Missing INSTAGRAM_ACCESS_TOKEN in .env');
  process.exit(1);
}

async function getPages() {
  try {
    console.log('🔍 Fetching your Facebook Pages and Instagram accounts...\n');

    // First, get the user info
    const userUrl = `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`;
    const userResponse = await fetch(userUrl);
    const userData = await userResponse.json();

    if (!userResponse.ok) {
      const err = userData.error;
      console.error(`❌ Error: ${err.message}`);
      console.error('   Code:', err.code);
      process.exit(1);
    }

    console.log(`✅ Logged in as: ${userData.name} (${userData.email})`);
    console.log(`   User ID: ${userData.id}\n`);

    // Get all pages managed by this user
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}&limit=100`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    if (!pagesResponse.ok) {
      const err = pagesData.error;
      console.error(`❌ Error fetching pages: ${err.message}`);
      process.exit(1);
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      console.log('⚠️  No pages found. Make sure you have manage_pages permission.');
      return;
    }

    console.log(`📄 Found ${pagesData.data.length} Facebook page(s):\n`);

    for (const page of pagesData.data) {
      console.log(`─────────────────────────────────────────────────────`);
      console.log(`Page: ${page.name}`);
      console.log(`Facebook Page ID: ${page.id}`);

      if (page.instagram_business_account) {
        console.log(`Instagram Business Account ID: ${page.instagram_business_account.id}`);
        console.log(`✓ This page has Instagram linked!`);
      } else {
        console.log(`(No Instagram business account linked)`);
      }
    }

    console.log('\n─────────────────────────────────────────────────────');
    console.log('\n💡 Usage:');
    console.log('   For sending Instagram messages, use the FACEBOOK_PAGE_ID (not Instagram Business Account ID)');
    console.log('   Update your .env with:');
    console.log('   INSTAGRAM_PAGE_ID=<FACEBOOK_PAGE_ID_FROM_ABOVE>');
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getPages();
