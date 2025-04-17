import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';
import aiConfig from '../utils/aiConfig';

function CampaignSettingsPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { currentUser, getCampaignById, getCharacters, updateCampaign } = useStorage();
  const [campaign, setCampaign] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [gmType, setGmType] = useState('USER');
  const [gmPrompt, setGmPrompt] = useState('');
  const [aiProvider, setAiProvider] = useState('grok'); // Default to grok
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCampaignAndCharacters = async () => {
      if (!currentUser || !currentUser.uid) {
        setError('User not authenticated. Please log in.');
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const loadedCampaign = await getCampaignById(campaignId);
        if (!loadedCampaign) {
          setError('Campaign not found.');
          return;
        }
        setCampaign(loadedCampaign);
        setGmType(loadedCampaign.gmType || 'USER');
        setGmPrompt(loadedCampaign.gmPrompt || '');
        
        // Set AI provider with fallback to grok
        setAiProvider(loadedCampaign.aiProvider || 'grok');

        const allCharacters = await getCharacters(null);
        setCharacters(allCharacters || []);
      } catch (err) {
        setError('Failed to load campaign or characters: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignAndCharacters();
  }, [currentUser, campaignId, getCampaignById, getCharacters, navigate]);

  const toggleCharacter = (characterId) => {
    const participantIds = campaign.participantIds || [];
    const updatedParticipantIds = participantIds.includes(characterId)
      ? participantIds.filter((id) => id !== characterId)
      : [...participantIds, characterId];

    setCampaign({ ...campaign, participantIds: updatedParticipantIds });
  };

  const handleSave = async () => {
    try {
      const updatedCampaign = {
        ...campaign,
        gmType,
        gmPrompt,
        aiProvider
      };
      const success = await updateCampaign(updatedCampaign);
      if (success) {
        navigate(`/campaigns/${campaign.id}/session`);
      } else {
        setError('Failed to save campaign settings.');
      }
    } catch (err) {
      setError('Failed to save campaign settings: ' + err.message);
    }
  };

  // Define the available AI providers
  const availableProviders = {
    grok: {
      key: 'grok',
      name: 'Grok AI',
      description: 'Local AI service using Grok. Best for privacy and offline use.',
      defaultModel: 'grok-1'
    },
    ollama: {
      key: 'ollama',
      name: 'Ollama (Legacy)',
      description: 'Local AI service using Ollama. Currently not in use.',
      defaultModel: 'mistral'
    },
    together: {
      key: 'together',
      name: 'Together AI',
      description: 'Cloud-based AI service with powerful models. Requires API key.',
      defaultModel: 'mixtral-8x7b'
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!campaign) return <div>Campaign not found.</div>;

  return (
    <div className="campaign-settings-page">
      <h1>Settings for {campaign.name}</h1>

      <div className="characters-section">
        <h2>Characters in Session</h2>
        {characters.length === 0 ? (
          <p>No characters available. Create some first.</p>
        ) : (
          <ul>
            {characters.map((char) => (
              <li key={char.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={(campaign.participantIds || []).includes(char.id)}
                    onChange={() => toggleCharacter(char.id)}
                  />
                  {char.name}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="gm-controls">
        <h2>GM Controls</h2>
        <div>
          <label>Who's the GM?</label>
          <select value={gmType} onChange={(e) => setGmType(e.target.value)}>
            <option value="USER">User</option>
            <option value="AI">AI</option>
          </select>
        </div>
        {gmType === 'USER' && (
          <div>
            <label>GM Narration Prompt (for when you act as GM)</label>
            <textarea
              value={gmPrompt}
              onChange={(e) => setGmPrompt(e.target.value)}
              placeholder="Enter a default narration style or prompt for when you act as the GM..."
            />
          </div>
        )}
        
        {/* Updated AI Provider Setting */}
        <div className="ai-provider-section">
          <h2>AI Provider Settings</h2>
          <div>
            <label>AI Provider:</label>
            <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)}>
              {Object.values(availableProviders).map(provider => (
                <option key={provider.key} value={provider.key}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>
          
          {aiProvider === 'together' && (
            <div className="api-key-warning">
              <p>⚠️ Together AI requires an API key in the .env file.</p>
            </div>
          )}
          
          {aiProvider === 'ollama' && (
            <div className="api-key-warning">
              <p>⚠️ Ollama is currently disabled. Please use Grok AI instead.</p>
            </div>
          )}
          
          <div className="provider-info">
            <p>{availableProviders[aiProvider]?.description || 'AI Provider for character interactions'}</p>
            <p><strong>Default Model:</strong> {availableProviders[aiProvider]?.defaultModel || 'unknown'}</p>
          </div>
        </div>
      </div>

      <button onClick={handleSave}>Save Settings</button>
      <Link to={`/campaigns/${campaign.id}/session`}>Back to Session</Link>
    </div>
  );
}

export default CampaignSettingsPage;