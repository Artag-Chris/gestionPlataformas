#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Fetching recent messages from database...');
    const messages = await prisma.message.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    if (messages.length === 0) {
      console.log('No messages found in database.');
    } else {
      console.log(`Found ${messages.length} messages:\n`);
      messages.forEach((msg, i) => {
        console.log(`${i + 1}. Channel: ${msg.channel}`);
        console.log(`   Body: ${msg.body}`);
        console.log(`   Status: ${msg.status}`);
        console.log(`   Created: ${msg.createdAt}`);
        console.log(`   Metadata keys: ${Object.keys(msg.metadata || {}).join(', ')}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error fetching messages:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
