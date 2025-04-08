// Save this as test-api.js in your server directory

const fetch = require('node-fetch');
require('dotenv').config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function testClaudeAPI() {
  console.log('Testing Claude API connection...');
  console.log(`API Key configured: ${ANTHROPIC_API_KEY ? 'Yes (first 4 chars: ' + ANTHROPIC_API_KEY.substring(0, 4) + '...)' : 'No'}`);
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: "Hello, are you working?"
          }
        ]
      })
    });
    
    const data = await response.json();
    console.log('API Response:', data);
    
    if (data.content && data.content[0] && data.content[0].text) {
      console.log('Claude API is working properly!');
      return true;
    } else {
      console.log('Claude API returned an unexpected response structure.');
      return false;
    }
  } catch (error) {
    console.error('Error connecting to Claude API:', error);
    return false;
  }
}

// Run the test
testClaudeAPI();