import { useState } from 'react';
import VideoPanel from '@/components/VideoPanel';
import TranscriptPanel from '@/components/TranscriptPanel';
import { useCandidateName } from '@/api/candidate';

interface Message {
  sender: string;
  text: string;
}

interface InterviewState {
  question_count: number;
  conversation_history: Array<{ role: string; content: string }>;
  is_interview_complete: boolean;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [interviewState, setInterviewState] = useState<InterviewState | null>(null);
  const candidateName = useCandidateName();
  const [isInterviewStarted, setIsInterviewStarted] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  // Start the interview
  const startInterview = async () => {
    try {
      console.log('Attempting to start interview...');
      // Use environment variable for backend URL or default to localhost:8010 as in the earlier working version
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      console.log('Using backend URL:', backendUrl);
      const response = await fetch(`${backendUrl}/interview/start`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      console.log('Interview started successfully:', data);
      setInterviewState(data.state);
      setIsInterviewStarted(true);
      
      // Add greeting message
      const newMessage: Message = {
        sender: 'Meena',
        text: data.greeting
      };
      
      setMessages([newMessage]);
      
      // Play the greeting audio
      playAudio(data.greeting);
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview. Please check the console for details. Make sure the backend server is running on the correct port.');
    }
  };

  // Play audio using TTS
  const playAudio = async (text: string) => {
    try {
      setIsAudioPlaying(true);
      
      // Use environment variable for backend URL or default to localhost:8000
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      console.log('Sending to /audio/tts:', { text });
      const response = await fetch(`${backendUrl}/audio/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (currentAudio) {
        currentAudio.pause();
        URL.revokeObjectURL(currentAudio.src);
      }
      
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);
      
      audio.onended = () => {
        setIsAudioPlaying(false);
      };
      
      audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsAudioPlaying(false);
    }
  };

  // Handle user's speech
  const handleUserResponse = async (transcript: string) => {
    if (!interviewState || !transcript.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      sender: candidateName,
      text: transcript
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Use environment variable for backend URL or default to localhost:8000
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      // Log the data being sent for debugging
      console.log('Sending to /interview/ask:', { user_response: transcript, state: interviewState });
      // Send user response to backend
      const response = await fetch(`${backendUrl}/interview/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_response: transcript,
          state: interviewState
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
      }
      
      const data = await response.json();
      console.log('Response from /interview/ask:', data);
      
      // Update interview state
      setInterviewState(data.state);
      
      // Add AI response
      const aiMessage: Message = {
        sender: 'Meena',
        text: data.question
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Play the AI response
      playAudio(data.question);
    } catch (error) {
      console.error('Error sending user response:', error);
    }
  };

  return (
    <div className="w-screen h-screen bg-background text-foreground flex items-center justify-center p-0 sm:p-4">
      <div className="w-full h-full sm:rounded-lg shadow-2xl shadow-primary/10 flex flex-col md:flex-row font-sans overflow-hidden border">
        <VideoPanel 
          isInterviewStarted={isInterviewStarted}
          isRecording={isRecording}
          isAudioPlaying={isAudioPlaying}
          candidateName={candidateName}
          onStartInterview={startInterview}
          onStartRecording={() => setIsRecording(true)}
          onStopRecording={setIsRecording}
          onTranscriptReceived={handleUserResponse}
        />
        <TranscriptPanel messages={messages} />
      </div>
    </div>
  );
};

export default Index;
