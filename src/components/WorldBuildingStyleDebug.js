// Example component (e.g., src/components/WorldBuildingStylesDebug.js)
import React, { useEffect, useState } from 'react';
import { useStorage } from '../contexts/StorageContext';
import { useParams } from 'react-router-dom'; // If using React Router

function WorldBuildingStylesDebug() {
  const { getCharacters, getEnvironments, getMapData } = useStorage();
  const { worldId } = useParams(); // Assuming worldId is in the URL, e.g., /worlds/1705
  const [characters, setCharacters] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [mapData, setMapData] = useState({ nodes: [], edges: [], imageUrl: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!worldId) {
          console.error('worldId is undefined - cannot fetch data');
          return;
        }

        // Fetch characters and environments with worldId as projectId
        const fetchedCharacters = await getCharacters(worldId);
        const fetchedEnvironments = await getEnvironments(worldId);
        const fetchedMapData = await getMapData();

        setCharacters(fetchedCharacters);
        setEnvironments(fetchedEnvironments);
        setMapData(fetchedMapData);

        // Check where indexOf might be called
        console.log('Fetched mapData in component:', fetchedMapData);
        if (fetchedMapData.imageUrl) {
          const index = fetchedMapData.imageUrl.indexOf('something'); // Example - replace with your actual usage
          console.log('indexOf result:', index);
        }
      } catch (error) {
        console.error('Error fetching data in WorldBuildingStylesDebug:', error);
      }
    };

    fetchData();
  }, [worldId, getCharacters, getEnvironments, getMapData]);

  return (
    <div>
      <h1>World Building Styles Debug</h1>
      <h2>Characters</h2>
      <ul>
        {characters.map(char => (
          <li key={char.id}>{char.name || 'Unnamed Character'}</li>
        ))}
      </ul>
      <h2>Environments</h2>
      <ul>
        {environments.map(env => (
          <li key={env.id}>{env.name || 'Unnamed Environment'}</li>
        ))}
      </ul>
      <h2>Map Data</h2>
      <pre>{JSON.stringify(mapData, null, 2)}</pre>
    </div>
  );
}

export default WorldBuildingStylesDebug;