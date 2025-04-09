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
      'https://api.grok.x.ai/v1/chat/completions',
      {
        model: 'grok-3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 150,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json({ response: reply });
  } catch (error) {
    console.error('Error calling Grok API:', error.message);
    res.status(500).json({ error: 'Failed to get response from Grok API' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});