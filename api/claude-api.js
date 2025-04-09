import { auth } from '../utils/firebase'; // Adjust path as needed
import { getIdToken } from 'firebase/auth';

export default async function handler(req, res) {
  // CORS handling
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Validate request body
    const { 
      characterId, 
      message, 
      context = {}, 
      options = {} 
    } = req.body;

    if (!characterId || !message) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Authenticate the request (optional but recommended)
    const user = auth.currentUser;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the user's ID token for additional security
    const token = await user.getIdToken();

    // Call Claude API (replace with your actual API call)
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CLAUDE_API_KEY}`,
        'X-Firebase-Token': token
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: options.maxTokens || 300,
        messages: [
          {
            role: 'system',
            content: `You are roleplaying as a character with ID: ${characterId}. 
                      Context: ${JSON.stringify(context)}`
          },
          {
            role: 'user',
            content: message
          }
        ]
      })
    });

    // Handle Claude API response
    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.json();
      return res.status(claudeResponse.status).json({ 
        error: 'Claude API error',
        details: errorData 
      });
    }

    const responseData = await claudeResponse.json();

    // Return the response
    return res.status(200).json({
      success: true,
      response: responseData.content[0].text,
      raw: responseData
    });

  } catch (error) {
    console.error('Claude API Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
}