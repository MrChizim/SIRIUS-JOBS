#!/usr/bin/env node
/**
 * Minimal CLI loop for chatting with Claude using Anthropic's Messages API.
 * Reads ANTHROPIC_API_KEY from the environment and keeps the conversation context.
 */

const readline = require('readline');
const Anthropic = require('@anthropic-ai/sdk').default; // ✅ important: add .default

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('❌ Please set ANTHROPIC_API_KEY before running this script.');
  process.exit(1);
}

const client = new Anthropic({ apiKey });
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages = [];
const MODEL = "claude-sonnet-4-5-20250929"; // ✅ matches your available models


const ask = () => {
  rl.question('You: ', async (input) => {
    const trimmed = input.trim();

    if (trimmed.toLowerCase() === '/exit') {
      console.log('👋 Chat ended.');
      rl.close();
      return;
    }

    if (!trimmed) {
      ask();
      return;
    }

    messages.push({ role: 'user', content: trimmed });

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 512,
        temperature: 0.7,
        messages,
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text.trim())
        .join('\n\n');

      console.log(`Claude: ${text}\n`);
      messages.push({ role: 'assistant', content: text });
    } catch (error) {
      const detail = error?.error?.message || error.message || error;
      console.error(`❌ Error from Anthropic: ${detail}`);
    }

    ask();
  });
};

console.log(`💬 Type /exit to quit. Using model ${MODEL}.\n`);
ask();
