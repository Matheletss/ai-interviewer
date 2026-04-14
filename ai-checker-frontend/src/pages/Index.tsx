import { useState, useRef, useEffect, useCallback } from 'react';
import VideoPanel, { VideoPanelHandle } from '@/components/VideoPanel';
import TranscriptPanel from '@/components/TranscriptPanel';
import { useCandidateName } from '@/api/candidate';
import { useProctoring } from '@/hooks/useProctoring';

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
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Proctoring
  const { tabSwitchCount, showWarning, dismissWarning } = useProctoring(isInterviewStarted);

  // Ref to access VideoPanel's recorded blob
  const videoPanelRef = useRef<VideoPanelHandle>(null);

  // Derived state
  const isInterviewComplete = interviewState?.is_interview_complete ?? false;

  // ── Upload video to backend when interview completes ──
  const uploadVideo = useCallback(async () => {
    const blob = videoPanelRef.current?.getRecordedVideoBlob();
    if (!blob || blob.size === 0) {
      console.warn('[Upload] No video blob available to upload');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', blob, 'interview-recording.webm');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      console.log(`[Upload] Uploading ${(blob.size / (1024 * 1024)).toFixed(1)} MB video...`);

      const response = await fetch(`${backendUrl}/interview/upload-video`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Upload] Success!', data);
      alert(`Interview video uploaded successfully!\nDrive link: ${data.drive_link}`);
    } catch (error) {
      console.error('[Upload] Error uploading video:', error);
      alert('Failed to upload interview video. Please check the console for details.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Trigger upload when interview completes (with a short delay to let MediaRecorder finalize)
  useEffect(() => {
    if (isInterviewComplete) {
      const timer = setTimeout(() => {
        uploadVideo();
      }, 2000); // 2s delay for the recorder to flush all chunks
      return () => clearTimeout(timer);
    }
  }, [isInterviewComplete, uploadVideo]);

  // Start the interview
  const startInterview = async () => {
    try {
      console.log('Attempting to start interview...');
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
    
    const userMessage: Message = {
      sender: candidateName,
      text: transcript
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      console.log('Sending to /interview/ask:', { user_response: transcript, state: interviewState });
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
      
      setInterviewState(data.state);
      
      const aiMessage: Message = {
        sender: 'Meena',
        text: data.question
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      playAudio(data.question);
    } catch (error) {
      console.error('Error sending user response:', error);
    }
  };

  return (
    <div className="w-screen h-screen bg-background text-foreground flex items-center justify-center p-0 sm:p-4">
      <div className="w-full h-full sm:rounded-lg shadow-2xl shadow-primary/10 flex flex-col md:flex-row font-sans overflow-hidden border">
        <VideoPanel 
          ref={videoPanelRef}
          isInterviewStarted={isInterviewStarted}
          isRecording={isRecording}
          isAudioPlaying={isAudioPlaying}
          candidateName={candidateName}
          isInterviewComplete={isInterviewComplete}
          showWarning={showWarning}
          tabSwitchCount={tabSwitchCount}
          onDismissWarning={dismissWarning}
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
