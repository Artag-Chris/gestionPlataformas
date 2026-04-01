#!/usr/bin/env node

/**
 * Script to extract Instagram User IDs (IGSID) from your existing conversations
 * Reads INSTAGRAM_PAGE_ID and INSTAGRAM_ACCESS_TOKEN from .env automatically
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
const pageId = env.INSTAGRAM_PAGE_ID;
const accessToken = env.INSTAGRAM_ACCESS_TOKEN;

if (!pageId || !accessToken) {
  console.error('❌ Missing credentials in .env');
  console.error('   Required: INSTAGRAM_PAGE_ID and INSTAGRAM_ACCESS_TOKEN');
  process.exit(1);
}

async function getConversations() {
  try {
    console.log('🔍 Fetching Instagram conversations...\n');

    const url = `https://graph.facebook.com/v19.0/${pageId}/conversations?fields=participants,senders,updated_time,message_count&access_token=${accessToken}&limit=100`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      const err = data.error;
      console.error(`❌ Meta API Error: ${err.message}`);
      if (err.code === 190) {
        console.error('   → Token expired or invalid. Generate a new one from Meta Business.');
      } else if (err.code === 100) {
        console.error('   → Invalid Page ID. Check your INSTAGRAM_PAGE_ID.');
      }
      process.exit(1);
    }

    if (!data.data || data.data.length === 0) {
      console.log('⚠️  No conversations found. Start a conversation with a user first.');
      console.log('   Hint: Send a message from Instagram to your page.');
      return;
    }

    console.log(`✅ Found ${data.data.length} conversation(s):\n`);

    data.data.forEach((conv, idx) => {
      console.log(`─────────────────────────────────────────────────────`);
      console.log(`Conversation ${idx + 1}:`);

      if (conv.participants) {
        console.log('Participants (IGSIDs):');
        conv.participants.data.forEach((p) => {
          console.log(`  ✓ ${p.name} (ID: ${p.id})`);
        });
      }

      if (conv.senders) {
        console.log('Senders:');
        conv.senders.data.forEach((s) => {
          console.log(`  ✓ ${s.name} (ID: ${s.id})`);
        });
      }

      console.log(`Messages: ${conv.message_count || 'N/A'}`);
      console.log(`Last Updated: ${conv.updated_time}`);
    });

    console.log('\n─────────────────────────────────────────────────────');
    console.log('\n💡 Usage tip:');
    console.log('   Use any of the IDs above as the "recipient" when sending messages via the gateway:');
    console.log('');
    console.log('   POST http://localhost:3000/api/v1/messages/send');
    console.log('   {');
    console.log('     "channel": "instagram",');
    console.log('     "recipients": ["IGSID_FROM_LIST_ABOVE"],');
    console.log('     "message": "Hello from Instagram!"');
    console.log('   }');
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getConversations();
