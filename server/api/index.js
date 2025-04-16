// api/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const axios = require('axios');

console.log('Starting backend server...');

// Check for required environment variables
if (!process.env.XAI_API_KEY) {
  console.error('XAI_API_KEY is not set in the environment variables.');
  process.exit(1);
}

if (!process.env.REPLICATE_API_KEY) {
  console.error('REPLICATE_API_KEY is not set in the environment variables.');
  process.exit(1);
}

const handler = async (req, res) => {
  const corsMiddleware = cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://worldbuilding-app-plum.vercel.app',
        'https://worldbuilding-app-git-main-zee-leonards-projects.vercel.app',
        /\.vercel\.app$/,
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
  });

  corsMiddleware(req, res, async () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

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

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'grok-3',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            max_tokens: 800,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        res.status(200).json({ response: data.choices[0].message.content });
      } catch (error) {
        console.error('Error in /chat endpoint:', { message: error.message, stack: error.stack });
        res.status(500).json({
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'AI service error',
        });
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

        // Construct messages for Grok API
        const grokMessages = [
          { role: 'system', content: `You are ${character}, a character in a roleplay game. Respond in character, using the following context and conversation history to inform your response.\n\n${context || ''}` },
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        ];

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'grok-3',
            messages: grokMessages,
            max_tokens: 800,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        res.status(200).json({ response: data.choices[0].message.content });
      } catch (error) {
        console.error('Error in /api/chat endpoint:', { message: error.message, stack: error.stack });
        res.status(500).json({
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'AI service error',
        });
      }
      return;
    }

    // Keep the /generate-map-description and /generate-map endpoints unchanged
    if (req.method === 'POST' && req.url === '/generate-map-description') {
      try {
        const { userInput, environments } = req.body;
        if (!environments || !Array.isArray(environments)) {
          res.status(400).json({ error: 'Missing or invalid environments' });
          return;
        }

        const envDescriptions = environments.map(env => `${env.name}: ${env.description || 'No description'}`).join('\n');
        const prompt = `Generate a detailed description of a fantasy RPG map based on the following user input and environments:

User Input: "${userInput}"

Environments:
${envDescriptions}

Describe the map's layout, key features, connections between environments, and visual style (e.g., dark forest, medieval village). Format as a single paragraph, max 200 words.`;

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'grok-3',
            messages: [
              { role: 'system', content: 'You are a creative assistant skilled in generating detailed fantasy RPG map descriptions.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: 300,
            temperature: 0.5,
          }),
        });

        if (!response.ok) {
          throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        res.status(200).json({ description: data.choices[0].message.content });
      } catch (error) {
        console.error('Error in /generate-map-description endpoint:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: 'Internal server error' });
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/generate-map') {
      try {
        const { prompt, environments, connections } = req.body;

        let mapPrompt = prompt;

        if (!mapPrompt) {
          if (!environments || !Array.isArray(environments)) {
            res.status(400).json({ error: 'Missing environment data or prompt' });
            return;
          }

          mapPrompt = `A detailed fantasy map featuring the following environments: `;
          if (environments.length === 0) {
            mapPrompt += 'a generic fantasy world with forests, mountains, and rivers';
          } else {
            mapPrompt += environments.map(env => env.name).join(', ');
            if (connections && Array.isArray(connections) && connections.length > 0) {
              mapPrompt += ', with paths connecting ';
              mapPrompt += connections.map(conn => `${conn.source} to ${conn.target}`).join('; ');
            }
          }
          mapPrompt += '. The map should have a medieval fantasy style with vibrant colors, detailed terrain, and clear labels for each environment.';
        }

        const response = await axios.post(
          'https://api.replicate.com/v1/predictions',
          {
            version: 'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5',
            input: {
              prompt: mapPrompt,
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
            res.status(200).json({ imageUrl, description: mapPrompt });
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

module.exports = handler;

if (process.env.NODE_ENV !== 'production') {
  const app = express();
  app.use(express.json());
  app.use((req, res) => handler(req, res));
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  }).on('error', (error) => {
    console.error('Error starting server:', error.message);
  });
}