// index.js (backend)
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3002;

const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:55596', // Ensure this is included
      'https://worldbuilding-bbluwxi-zoe-leonhardt-projects.vercel.app',
      'https://worldbuilding.studio', // If you’ve set up the custom domain
      'https://www.worldbuilding.studio',
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

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// Test endpoint
app.get('/', (req, res) => {
  res.send('Worldbuilding Backend is running!');
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  const { systemPrompt, userMessage } = req.body;

  if (!systemPrompt || !userMessage) {
    return res.status(400).json({ error: 'Missing systemPrompt or userMessage' });
  }

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-opus-20240229', // You can also use 'claude-3-sonnet-20240229' or another Claude model
        messages: [
          { role: 'user', content: `${systemPrompt}\n\n${userMessage}` } // Claude doesn't support a separate system prompt, so we combine them
        ],
        max_tokens: 150,
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});