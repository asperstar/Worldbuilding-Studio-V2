// src/components/maps/drawing-helpers.js

// Compass Rose Drawing
export const drawCompassRose = (ctx, x, y, size) => {
    ctx.save();
    ctx.translate(x, y);
    
    // Outer circle
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Cardinal and Ordinal Directions
    const directions = [
      { angle: 0, label: 'N' },
      { angle: Math.PI / 4, label: 'NE' },
      { angle: Math.PI / 2, label: 'E' },
      { angle: 3 * Math.PI / 4, label: 'SE' },
      { angle: Math.PI, label: 'S' },
      { angle: 5 * Math.PI / 4, label: 'SW' },
      { angle: 3 * Math.PI / 2, label: 'W' },
      { angle: 7 * Math.PI / 4, label: 'NW' }
    ];
    
    ctx.fillStyle = '#5C3317';
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    directions.forEach(dir => {
      const x = Math.cos(dir.angle) * (size - 10);
      const y = Math.sin(dir.angle) * (size - 10);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw direction labels
      const labelX = Math.cos(dir.angle) * (size + 5);
      const labelY = Math.sin(dir.angle) * (size + 5);
      ctx.fillText(dir.label, labelX, labelY);
    });
    
    ctx.restore();
  };
  
  // Mountain Range Drawing
  export const drawMountainRange = (ctx, x, y, width, height) => {
    ctx.fillStyle = '#8B4513';  // Brown mountain color
    
    // Draw multiple mountain peaks
    const peakCount = Math.floor(width / 30) + 1;
    for (let i = 0; i < peakCount; i++) {
      const peakX = x + i * (width / peakCount) + Math.random() * 20;
      const peakHeight = height * (0.7 + Math.random() * 0.3);
      
      ctx.beginPath();
      ctx.moveTo(peakX - width / (peakCount * 2), y + height);
      ctx.lineTo(peakX, y + height - peakHeight);
      ctx.lineTo(peakX + width / (peakCount * 2), y + height);
      ctx.closePath();
      
      // Add some shading
      const gradient = ctx.createLinearGradient(
        peakX - width / (peakCount * 2), y, 
        peakX + width / (peakCount * 2), y + height
      );
      gradient.addColorStop(0, 'rgba(139, 69, 19, 0.8)');
      gradient.addColorStop(1, 'rgba(139, 69, 19, 0.5)');
      
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  };
  
  // Forest Drawing
  export const drawForest = (ctx, x, y, width, height) => {
    ctx.fillStyle = 'rgba(34, 139, 34, 0.7)';  // Forest green with transparency
    
    // Draw multiple trees
    const treeCount = Math.floor(width / 20) + 2;
    for (let i = 0; i < treeCount; i++) {
      const treeX = x + i * (width / treeCount) + Math.random() * 10;
      const treeHeight = height * (0.6 + Math.random() * 0.4);
      
      ctx.beginPath();
      ctx.moveTo(treeX, y + height);
      ctx.lineTo(treeX - 10, y + height - treeHeight);
      ctx.lineTo(treeX + 10, y + height - treeHeight);
      ctx.closePath();
      
      ctx.fill();
    }
  };
  
  // Hills Drawing
  export const drawHills = (ctx, x, y, width, height) => {
    ctx.fillStyle = 'rgba(107, 142, 35, 0.6)';  // Olive drab with transparency
    
    // Draw multiple rolling hills
    const hillCount = Math.floor(width / 50) + 1;
    for (let i = 0; i < hillCount; i++) {
      const hillX = x + i * (width / hillCount) + Math.random() * 30;
      const hillHeight = height * (0.5 + Math.random() * 0.3);
      
      ctx.beginPath();
      ctx.moveTo(hillX - width / (hillCount * 2), y + height);
      ctx.quadraticCurveTo(hillX, y + height - hillHeight, hillX + width / (hillCount * 2), y + height);
      ctx.closePath();
      
      ctx.fill();
    }
  };
  
  // Desert Drawing
  export const drawDesert = (ctx, x, y, width, height) => {
    // Sand-colored base
    ctx.fillStyle = 'rgba(238, 214, 175, 0.7)';  // Sandy color with transparency
    ctx.fillRect(x, y, width, height);
    
    // Add some texture with lighter and darker spots
    for (let i = 0; i < 50; i++) {
      const spotX = x + Math.random() * width;
      const spotY = y + Math.random() * height;
      const spotSize = Math.random() * 5;
      
      ctx.beginPath();
      ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
      
      // Alternate between slightly lighter and darker shades
      ctx.fillStyle = i % 2 === 0 
        ? 'rgba(244, 164, 96, 0.3)' 
        : 'rgba(210, 180, 140, 0.3)';
      
      ctx.fill();
    }
  };
  
  // Swamp Drawing
  export const drawSwamp = (ctx, x, y, width, height) => {
    // Dark, murky green base
    ctx.fillStyle = 'rgba(75, 83, 32, 0.7)';  // Dark olive green
    ctx.fillRect(x, y, width, height);
    
    // Add watery texture
    for (let i = 0; i < 100; i++) {
      const lineX = x + Math.random() * width;
      const lineY = y + Math.random() * height;
      
      ctx.beginPath();
      ctx.moveTo(lineX, lineY);
      ctx.lineTo(lineX + Math.random() * 20 - 10, lineY + Math.random() * 20 - 10);
      
      ctx.strokeStyle = 'rgba(64, 224, 208, 0.2)';  // Turquoise with low opacity
      ctx.lineWidth = Math.random() * 2;
      ctx.stroke();
    }
  };
  
  // City Marker Drawing
  export const drawCityMarker = (ctx, x, y, size, name) => {
    // Draw a stylized city marker
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = '#8B0000';  // Dark red
    ctx.fill();
    
    // Optional: add a small white dot in the center
    ctx.beginPath();
    ctx.arc(x, y, size / 3, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    
    // Optional: add city name
    ctx.font = '12px serif';
    ctx.fillStyle = '#5C3317';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y + size + 15);
  };
  
  // Point of Interest Marker Drawing
  export const drawPoiMarker = (ctx, x, y, name) => {
    // Draw a star-like marker for points of interest
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 5, y - 5);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x + 5, y + 5);
    ctx.lineTo(x, y + 10);
    ctx.lineTo(x - 5, y + 5);
    ctx.lineTo(x - 10, y);
    ctx.lineTo(x - 5, y - 5);
    ctx.closePath();
    
    ctx.fillStyle = '#800080';  // Purple
    ctx.fill();
    
    // Add name
    ctx.font = '12px serif';
    ctx.fillStyle = '#5C3317';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y + 25);
  };
  
  // Legend Drawing
  export const drawLegend = (ctx, x, y) => {
    // Draw a semi-transparent legend box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(x, y, 200, 180);
    
    // Legend title
    ctx.font = 'bold 16px serif';
    ctx.fillStyle = '#5C3317';
    ctx.textAlign = 'center';
    ctx.fillText('Map Legend', x + 100, y + 25);
    
    // Define legend items
    const legendItems = [
      { color: '#8B4513', label: 'Mountains' },
      { color: 'rgba(34, 139, 34, 0.7)', label: 'Forests' },
      { color: 'rgba(238, 214, 175, 0.7)', label: 'Desert' },
      { color: 'rgba(75, 83, 32, 0.7)', label: 'Swamp' },
      { color: '#4682B4', label: 'Water' },
      { color: '#8B0000', label: 'Cities' }
    ];
    
    // Draw legend items
    legendItems.forEach((item, index) => {
      ctx.fillStyle = item.color;
      ctx.fillRect(x + 20, y + 50 + index * 25, 20, 15);
      
      ctx.font = '12px serif';
      ctx.fillStyle = '#5C3317';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, x + 50, y + 62 + index * 25);
    });
  };
  
  // Image Saving Logic
  export const handleSaveImage = (generatedMapImage) => {
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = generatedMapImage;
    link.download = 'fantasy_map.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Simple Fantasy Map Generation (placeholder)
  export const generateFantasyMap = () => {
    // This is a basic placeholder for map generation
    // In a real implementation, you'd have more sophisticated logic
    return {
      mapName: 'Generated Fantasy Map',
      regions: [
        {
          name: 'Northern Realm',
          coordinates: { x1: 100, y1: 100, x2: 400, y2: 300 },
          color: '#90EE90'
        }
      ],
      waterBodies: [
        {
          name: 'Crystal River',
          type: 'river',
          coordinates: [
            { x: 200, y: 250 },
            { x: 300, y: 350 }
          ]
        }
      ],
      terrainFeatures: [
        {
          name: 'Misty Mountains',
          type: 'mountain',
          coordinates: { x: 500, y: 200, width: 200, height: 150 }
        }
      ],
      cities: [
        {
          name: 'Rivertown',
          size: 'medium',
          coordinates: { x: 250, y: 275 }
        }
      ],
      pointsOfInterest: [
        {
          name: 'Ancient Ruins',
          coordinates: { x: 400, y: 350 }
        }
      ]
    };
  };