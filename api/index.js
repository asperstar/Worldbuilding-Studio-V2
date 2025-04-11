corsMiddleware(req, res, async () => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body (raw):', req.body);
  console.log('Query:', req.query);

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

  console.log('No matching route found for:', req.url);
  res.status(404).json({ error: 'Not found' });
});