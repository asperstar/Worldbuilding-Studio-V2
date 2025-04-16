const { generateText } = require('ai');
const { createXai } = require('@ai-sdk/xai');

// Initialize Grok model
const grokModel = createXai({ apiKey: process.env.XAI_API_KEY })('grok-3');

module.exports = async (req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body (raw):', req.body);
  console.log('Query:', req.query);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request for:', req.url);
    res.status(200).end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.status(200).send('Worldbuilding Backend is running!');
    return;
  }

  const normalizedUrl = req.url.split('?')[0].replace(/\/$/, '');
  console.log('Raw URL:', req.url);
  console.log('Normalized URL:', normalizedUrl);
  console.log('Request Method:', req.method);

  if (req.method === 'POST' && normalizedUrl === '/chat') {
    console.log('Matched /chat endpoint');
    try {
      const { systemPrompt, userMessage } = req.body;
      if (!systemPrompt || !userMessage) {
        res.status(400).json({ error: 'Missing systemPrompt or userMessage' });
        return;
      }

      console.log('Sending request to Grok API...');
      const response = await generateText({
        model: grokModel,
        prompt: `${systemPrompt}\n\n${userMessage}`,
        maxTokens: 500,
        temperature: 0.7,
      });

      res.status(200).json({ response: response.text });
    } catch (error) {
      console.error('Error in /chat endpoint:', { message: error.message, stack: error.stack });
      res.status(500).json({ error: 'Internal server error: Failed to process /chat request' });
    }
    return;
  }

  if (req.method === 'POST' && normalizedUrl === '/generate-map') {
    console.log('Matched /generate-map endpoint');
    try {
      const { prompt } = req.body;
      if (!prompt) {
        res.status(400).json({ error: 'Missing prompt' });
        return;
      }

      const replicateApiKey = process.env.REPLICATE_API_KEY;
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          Authorization: `Token ${replicateApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff0fc380ae413b026a239',
          input: { prompt: `A detailed fantasy RPG map: ${prompt}`, negative_prompt: 'sexual content' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const imageUrl = data.output?.[0] || '';
      res.status(200).json({ imageUrl });
    } catch (error) {
      console.error('Error in /generate-map endpoint:', { message: error.message, stack: error.stack });
      res.status(500).json({ error: 'Internal server error: Failed to process /generate-map request' });
    }
    return;
  }

  console.log('No matching route found for:', req.url);
  res.status(404).json({ error: 'Not found' });
};