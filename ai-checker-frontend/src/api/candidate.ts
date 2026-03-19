import { useState, useEffect } from 'react';

export const useCandidateName = () => {
  const [candidateName, setCandidateName] = useState<string>("Candidate");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandidateName = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/resume`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setCandidateName(data.name || 'Candidate');
        setError(null);
      } catch (error) {
        console.error('Error fetching candidate name:', error);
        setError('Failed to load candidate name');
        // Fallback to a default name if the API call fails
        setCandidateName('Candidate');
      }
    };

    fetchCandidateName();
  }, []);

  return candidateName;
};
