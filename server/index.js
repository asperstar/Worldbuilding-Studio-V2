require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3002;

// Redeploy to ensure CORS configuration is applied - 2025-04-08
//redeploy again 2025-04-08

const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000', // Frontend dev server
      'https://worldbuilding-bbluwxi-zoe-leonhardt-projects.vercel.app', // Current frontend production URL
      /\.vercel\.app$/, // Allow all Vercel subdomains (for future deployments)
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



// Increase the limit but not too much
app.use(express.json({ 
  limit: '1mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ success: false, error: 'Invalid JSON' });
    }
  }
}));

// Add root route handler
app.get('/', (req, res) => {
  res.json({
    message: 'Worldbuilding Studio API is running',
    status: 'ok',
    endpoints: {
      test: '/test',
      chat: '/chat'
    }
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Character chat endpoint
app.post('/chat', async (req, res) => {
  try {
    // Log the raw request
    console.log('Received chat request:', {
      bodySize: JSON.stringify(req.body).length,
      hasSystemPrompt: !!req.body.systemPrompt,
      hasUserMessage: !!req.body.userMessage
    });

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body - expected an object'
      });
    }

    const { systemPrompt, userMessage } = req.body;

    // Validate systemPrompt
    if (!systemPrompt || typeof systemPrompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'System prompt must be a non-empty string',
        received: {
          type: typeof systemPrompt,
          value: systemPrompt
        }
      });
    }

    // Validate userMessage
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'User message must be a non-empty string',
        received: {
          type: typeof userMessage,
          value: userMessage
        }
      });
    }

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Missing API key');
      return res.status(500).json({
        success: false,
        error: 'API key not configured'
      });
    }

    // Trim prompts to acceptable lengths
    const trimmedSystemPrompt = systemPrompt.slice(0, 4000);
    const trimmedUserMessage = userMessage.slice(0, 500);

    console.log('Making Claude API request:', {
      systemPromptLength: trimmedSystemPrompt.length,
      userMessageLength: trimmedUserMessage.length
    });

    // Make request to Claude API
    const response = await axios({
      method: 'post',
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      data: {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.7,
        system: trimmedSystemPrompt,
        messages: [{ 
          role: 'user', 
          content: trimmedUserMessage
        }]
      },
      timeout: 30000
    });

    // Validate Claude API response
    if (!response.data?.content?.[0]?.text) {
      throw new Error('Invalid response format from Claude API');
    }

    // Return successful response
    return res.json({
      success: true,
      response: response.data.content[0].text
    });

  } catch (error) {
    // Log detailed error information
    console.error('Chat error:', {
      name: error.name,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    // Handle specific error types
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        error: 'Request timed out'
      });
    }

    if (error.response?.status === 431) {
      return res.status(431).json({
        success: false,
        error: 'Request header fields too large'
      });
    }

    // Return error response
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});


// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('API Key configured:', !!process.env.ANTHROPIC_API_KEY);
}); 