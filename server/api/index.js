require('dotenv').config();
const cors = require('cors');
const fetch = require('node-fetch');
const axios = require('axios');

// Vercel serverless function
module.exports = async (req, res) => {
  console.log('Environment variables:', {
    hasAnthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
    hasReplicateApiKey: !!process.env.REPLICATE_API_KEY,
  });

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set in the environment variables.');
    res.status(500).json({ error: 'Server configuration error: ANTHROPIC_API_KEY is not set' });
    return;
  }

  if (!process.env.REPLICATE_API_KEY) {
    console.error('REPLICATE_API_KEY is not set in the environment variables.');
    res.status(500).json({ error: 'Server configuration error: REPLICATE_API_KEY is not set' });
    return;
  }

  const corsMiddleware = cors({
    origin: (origin, callback) => {
      console.log('CORS origin check - Origin:', origin);
      const allowedOrigins = ['https://worldbuilding-1a9y7m9zq-zoe-leonhards-projects.vercel.app'];
      if (!origin || allowedOrigins.includes(origin)) {
        console.log('CORS origin allowed:', origin);
        callback(null, true);
      } else {
        console.error('CORS origin rejected:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true,
  });

  corsMiddleware(req, res, async () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body (raw):', req.body);
    console.log('Query:', req.query); // Add this to check for query parameters

    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS preflight request for:', req.url);
      res.status(200).end();
      return;
    }

    if (req.method === 'GET' && req.url === '/') {
      res.status(200).send('Worldbuilding Backend is running!');
      return;
    }

    const normalizedUrl = req.url.split('?')[0].replace(/\/$/, ''); // Handle query params and trailing slash
    console.log('Normalized URL:', normalizedUrl);

    if (req.method === 'POST' && normalizedUrl === '/chat') {
      console.log('Matched /chat endpoint');
      try {
        const { systemPrompt, userMessage } = req.body;

        if (!systemPrompt || !userMessage) {
          res.status(400).json({ error: 'Missing systemPrompt or userMessage' });
          return;
        }

        console.log('Sending request to Anthropic API...');
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-opus-20240229',
            messages: [
              { role: 'user', content: `${systemPrompt}\n\n${userMessage}` },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Claude API error: ${response.status} - ${errorText}`);
        }

        const claudeData = await response.json();
        if (!claudeData.content || !claudeData.content[0] || !claudeData.content[0].text) {
          throw new Error('Unexpected Claude API response structure');
        }
        const reply = claudeData.content[0].text;
        res.status(200).json({ response: reply });
      } catch (error) {
        console.error('Error in /chat endpoint:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: 'Internal server error: Failed to process /chat request' });
      }
      return;
    }

    // Rest of the endpoints remain unchanged
    if (req.method === 'POST' && normalizedUrl === '/api/chat') {
      console.log('Matched /api/chat endpoint');
      try {
        const { messages, character, context } = req.body;
        // ... (unchanged)
      } catch (error) {
        console.error('Error in /api/chat endpoint:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: 'Internal server error: Failed to process /api/chat request' });
      }
      return;
    }

    if (req.method === 'POST' && normalizedUrl === '/generate-map') {
      console.log('Matched /generate-map endpoint');
      try {
        const { environments, connections } = req.body;
        // ... (unchanged)
      } catch (error) {
        console.error('Error in /generate-map endpoint:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: 'Internal server error: Failed to process /generate-map request' });
      }
      return;
    }

    console.log('No matching route found for:', req.url);
    res.status(404).json({ error: 'Not found' });
  });
};