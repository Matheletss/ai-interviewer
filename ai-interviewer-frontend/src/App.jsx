import React, { useState } from 'react';
import axios from 'axios';

const App = () => {
  const [question, setQuestion] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [interviewState, setInterviewState] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);

  const speak = async (text) => {
    try {
      const response = await axios.post('http://localhost:8010/audio/tts', { text }, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.oncanplaythrough = () => audio.play().catch(err => console.error("Playback error:", err));
    } catch (err) {
      console.error("TTS Error:", err);
    }
  };

  const startInterview = async () => {
    try {
      const res = await axios.get('http://localhost:8010/interview/start');
      const greeting = res.data.greeting;
      const state = res.data.state;
      setInterviewState(state);
      setQuestion(greeting);
      setHasStarted(true);
      await speak(greeting);
      setCanSpeak(true);
    } catch (error) {
      console.error('Error fetching greeting:', error);
    }
  };

  const startRecording = async () => {
    if (!canSpeak) return;
    setIsRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');

        setLoading(true);
        try {
          const res = await axios.post('http://localhost:8010/audio/stt', formData);
          const userText = res.data.transcript;
          setTranscript(userText);

          const askRes = await axios.post('http://localhost:8010/interview/ask', {
            user_response: userText,
            state: interviewState
          });

          const nextQ = askRes.data.question;
          setInterviewState(askRes.data.state);
          setQuestion(nextQ);
          setConversation(prev => [...prev, { role: 'user', content: userText }, { role: 'assistant', content: nextQ }]);
          setCanSpeak(false);
          await speak(nextQ);
          setTimeout(() => setCanSpeak(true), 2000);
        } catch (err) {
          console.error('STT or GPT ask error:', err);
        } finally {
          setLoading(false);
          setIsRecording(false);
          stream.getTracks().forEach(track => track.stop()); // stop the mic
        }
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 sec max
    } catch (err) {
      console.error("Recording error:", err);
      setIsRecording(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="bg-blue-100 p-6 rounded-xl shadow-md max-w-xl w-full">
        <h1 className="text-xl font-semibold mb-4">AI Interviewer</h1>

        {!hasStarted ? (
          <button
            onClick={startInterview}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow"
          >
            Start Interview
          </button>
        ) : (
          <>
            <div className="mb-4">
              <p className="font-medium text-gray-700">Interviewer:</p>
              <div className="bg-white p-3 rounded-md border mt-1 text-gray-800 whitespace-pre-wrap">{question}</div>
            </div>

            {transcript && (
              <div className="mb-4">
                <p className="font-medium text-gray-700">You:</p>
                <div className="bg-gray-50 p-3 rounded-md border mt-1 text-gray-800 whitespace-pre-wrap">{transcript}</div>
              </div>
            )}

            {loading && <p className="text-sm text-blue-500">Processing...</p>}

            <button
              onClick={startRecording}
              disabled={!canSpeak || isRecording || loading}
              className={`mt-4 px-6 py-2 rounded-lg shadow text-white transition duration-150 ${
                canSpeak && !loading && !isRecording ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isRecording ? 'Recording...' : 'Tap to Speak'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
