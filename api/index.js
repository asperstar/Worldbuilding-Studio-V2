require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3002;

const cors = require('cors');
const fetch = require('node-fetch'); // For making HTTP requests to Claude API





// Add this at the top of index.js and update the fetch URLs in CampaignSessionPage.js
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://my-backend-jet-two.vercel.app/' // Update with your actual backend URL
  : 'http://localhost:3002';


// Check for required environment variables
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set in the environment variables.');
  process.exit(1);
}

if (!process.env.REPLICATE_API_KEY) {
  console.error('REPLICATE_API_KEY is not set in the environment variables.');
  process.exit(1);
}

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:55596',
      'https://worldbuilding-bbluwxi-zoe-leonhardt-projects.vercel.app',
      'http://192.168.0.0:3000',
      'https://worldbuilding.studio',
      'https://www.worldbuilding.studio',
      'https://worldbuilding-app-plum.vercel.app/',
      /\.vercel\.app$/,
    ];
    if (!origin || allowedOrigins.some(allowed =>
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true,
};
// Enable CORS for all routes
app.use(cors({
  origin: 'https://worldbuilding-app-plum.vercel.app', // Your frontend domain
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.options('*', cors(corsOptions));


app.use(express.json());
// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Test endpoint
app.get('/', (req, res) => {
  res.send('Worldbuilding Backend is running!');
});

// Existing chat endpoint (for 1x1 character chat)
// In your index.js, update the /chat endpoint:
app.post('/chat', async (req, res) => {
  const { systemPrompt, userMessage } = req.body;

  if (!systemPrompt || !userMessage) {
    return res.status(400).json({ error: 'Missing systemPrompt or userMessage' });
  }

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-opus-20240229',
        messages: [
          { role: 'user', content: `${systemPrompt}\n\n${userMessage}` }
        ],
        max_tokens: 500, // Increase this from 150 to 500
        temperature: 0.7,
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response.data.content[0].text;
    res.json({ response: reply });
  } catch (error) {
    console.error('Error calling Claude API:', error.message);
    if (error.response) {
      console.error('Claude API response:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to get response from Claude API' });
  }
});

// New endpoint for campaign chat
app.post('/api/chat', async (req, res) => {
  const { messages, character, context } = req.body;

  if (!messages || !Array.isArray(messages) || !character) {
    return res.status(400).json({ error: 'Messages and character are required' });
  }

  try {
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

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-opus-20240229',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response.data.content[0].text;
    res.json({ response: reply });
  } catch (error) {
    console.error('Error calling Claude API in /api/chat:', error.message);
    if (error.response) {
      console.error('Claude API response:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to get response from Claude API' });
  }
});

// Map generation endpoint
app.post('/generate-map', async (req, res) => {
  const { environments, connections } = req.body;

  if (!environments || !Array.isArray(environments)) {
    return res.status(400).json({ error: 'Missing or invalid environments' });
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

  try {
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
          guidance_scale: 7.5
        }
      },
      {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const prediction = response.data;
    let result;

    while (true) {
      const statusResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Token ${process.env.REPLICATE_API_KEY}`
          }
        }
      );
      result = statusResponse.data;

      if (result.status === 'succeeded') {
        const imageUrl = result.output[0];
        res.json({ imageUrl });
        break;
      } else if (result.status === 'failed') {
        throw new Error('Image generation failed.');
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error('Error calling Replicate API:', error.message);
    if (error.response) {
      console.error('Replicate API response:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to generate map using Replicate API' });
  }
});
// Handle preflight requests
app.options('*', cors());

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});