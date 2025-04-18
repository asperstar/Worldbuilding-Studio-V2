// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const axios = require('axios');

// Check for required environment variables
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set in the environment variables.');
  process.exit(1);
}

if (!process.env.REPLICATE_API_KEY) {
  console.error('REPLICATE_API_KEY is not set in the environment variables.');
  process.exit(1);
}

// Define the handler function for Vercel serverless
const handler = async (req, res) => {
  // CORS configuration
  const corsOptions = {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000', // For local development
        'https://worldbuilding-app-plum.vercel.app',
        /\.vercel\.app$/, // Allow all Vercel subdomains
      ];
      if (!origin || allowedOrigins.some(allowed =>
        typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
      )) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204, // Ensure preflight requests return 204
  };

  // Apply CORS middleware
  const corsMiddleware = cors(corsOptions);

  // Manually handle CORS for Vercel serverless environment
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Apply CORS middleware for other requests
  corsMiddleware(req, res, async () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    if (req.method === 'GET' && req.url === '/') {
      res.status(200).send('Worldbuilding Backend is running!');
      return;
    }

    if (req.method === 'POST' && req.url === '/chat') {
      try {
        const { systemPrompt, userMessage } = req.body;
        if (!systemPrompt || !userMessage) {
          res.status(400).json({ error: 'Missing systemPrompt or userMessage' });
          return;
        }
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-opus-20240229',
            messages: [{ role: 'user', content: `${systemPrompt}\n\n${userMessage}` }],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });
        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status}`);
        }
        const claudeData = await response.json();
        const reply = claudeData.content[0].text;
        res.status(200).json({ response: reply });
      } catch (error) {
        console.error('Error in /chat endpoint:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: 'Internal server error' });
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/api/chat') {
      try {
        const { messages, character, context } = req.body;
        if (!messages || !Array.isArray(messages) || !character) {
          res.status(400).json({ error: 'Messages and character are required' });
          return;
        }
        let prompt = `You are ${character}, a character in a roleplay game. Respond in character, using the following context and conversation history to inform your response.\n\n`;
        if (context) {
          prompt += `Campaign Context:\n${context}\n\n`;
        }
        prompt += `Conversation History:\n`;
        messages.forEach(msg => {
          const sender = msg.role === 'user' ? 'Player' : character;
          prompt += `${sender}: ${msg.content}\n`;
        });
        prompt += `\n${character}: `;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-opus-20240229',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });
        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status}`);
        }
        const claudeData = await response.json();
        const reply = claudeData.content[0].text;
        res.status(200).json({ response: reply });
      } catch (error) {
        console.error('Error in /api/chat endpoint:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: 'Internal server error' });
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/generate-map') {
      try {
        const { environments, connections } = req.body;
        if (!environments || !Array.isArray(environments)) {
          res.status(400).json({ error: 'Missing or invalid environments' });
          return;
        }
        let prompt = `A detailed fantasy map featuring the following environments: `;
        if (environments.length === 0) {
          prompt += 'a generic fantasy world with forests, mountains, and rivers';
        } else {
          prompt += environments.map(env => env.name).join(', ');
          if (connections && Array.isArray(connections) && connections.length > 0) {
            prompt += ', with paths connecting ';
            prompt += connections.map(conn => `${conn.source} to ${conn.target}`).join('; ');
          }
        }
        prompt += '. The map should have a medieval fantasy style with vibrant colors, detailed terrain, and clear labels for each environment.';
        const response = await axios.post(
          'https://api.replicate.com/v1/predictions',
          {
            version: 'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5',
            input: {
              prompt: prompt,
              negative_prompt: 'blurry, low quality, modern elements, sci-fi, futuristic',
              width: 512,
              height: 512,
              num_outputs: 1,
              num_inference_steps: 50,
              guidance_scale: 7.5,
            },
          },
          {
            headers: {
              Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const prediction = response.data;
        let result;
        while (true) {
          const statusResponse = await axios.get(
            `https://api.replicate.com/v1/predictions/${prediction.id}`,
            {
              headers: {
                Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
              },
            }
          );
          result = statusResponse.data;
          if (result.status === 'succeeded') {
            const imageUrl = result.output[0];
            res.status(200).json({ imageUrl });
            break;
          } else if (result.status === 'failed') {
            throw new Error('Image generation failed.');
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error('Error in /generate-map endpoint:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: 'Internal server error' });
      }
      return;
    }

    res.status(404).json({ error: 'Not found' });
  });
};

// Export for Vercel serverless function
module.exports = handler;

// Run as a standalone server in development
if (process.env.NODE_ENV !== 'production') {
  const app = express();
  app.use(express.json()); // Parse JSON bodies
  app.use((req, res) => handler(req, res)); // Use the handler for all requests
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}