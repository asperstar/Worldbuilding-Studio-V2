import React, { useState } from 'react';

function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);


  const generateImage = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt,
          width: parseInt(width),
          height: parseInt(height)
        }),
      });
      
      if (!response.ok) {
        throw new Error('Image generation failed');
      }
      
      const data = await response.json();
      
      if (data.images && data.images.length > 0) {
        setGeneratedImage(`data:image/png;base64,${data.images[0]}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to generate image. Make sure Stable Diffusion WebUI is running.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="image-generator">
      <div className="form-group">
        <label>Prompt:</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to generate..."
          rows="3"
        />
      </div>
      
      <div className="form-group">
        <label>Negative Prompt:</label>
        <textarea
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="Describe what to avoid (e.g., blurry, distorted)"
          rows="2"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Width:</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            min="256"
            max="1024"
            step="64"
          />
        </div>
        
        <div className="form-group">
          <label>Height:</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            min="256"
            max="1024"
            step="64"
          />
        </div>
      </div>
      
      <button 
        onClick={generateImage} 
        disabled={isGenerating || !prompt.trim()}
        className="generate-button"
      >
        {isGenerating ? 'Generating...' : 'Generate Image'}
      </button>
      
      {error && <div className="error-message">{error}</div>}
      
      {generatedImage && (
        <div className="generated-image">
          <img src={generatedImage} alt="Generated" />
        </div>
      )}
    </div>
  );
}

export default ImageGenerator;