import React, { useState, useRef, useEffect } from 'react';
import meenaImage from '../image/meena.jpeg';
import { Video, Mic, MicOff, Play, Square, MoreHorizontal } from 'lucide-react';

interface VideoPanelProps {
  isInterviewStarted: boolean;
  isRecording: boolean;
  isAudioPlaying: boolean;
  candidateName: string;
  onStartInterview: () => void;
  onStartRecording: () => void;
  onStopRecording: (isRecording: boolean) => void;
  onTranscriptReceived: (transcript: string) => Promise<void>;
}

const VideoPanel: React.FC<VideoPanelProps> = ({
  isInterviewStarted,
  isRecording,
  isAudioPlaying,
  candidateName,
  onStartInterview,
  onStartRecording,
  onStopRecording,
  onTranscriptReceived
}) => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const handleStartRecording = async () => {
    if (!isAudioPlaying) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        recorder.onstop = async () => {
          setIsProcessing(true);
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          console.log('Audio Blob Size:', audioBlob.size);
          
          if (audioBlob.size === 0) {
            console.error('No audio data recorded. Please check microphone permissions or ensure audio input is available.');
            alert('No audio data was recorded. Please ensure your microphone is enabled and permissions are granted in your browser settings.');
            setIsProcessing(false);
            setMediaRecorder(null);
            onStopRecording(false);
            stream.getTracks().forEach(track => track.stop());
            return;
          }
          
          // Create form data for the API
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');
          
          try {
          // Send to STT API
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
          const response = await fetch(`${backendUrl}/audio/stt`, {
              method: 'POST',
              body: formData,
            });
            
            const data = await response.json();
            
            if (data.transcript) {
              await onTranscriptReceived(data.transcript);
            }
          } catch (error) {
            console.error('Error transcribing audio:', error);
          }
          
          // Clean up
          setAudioChunks([]);
          setMediaRecorder(null);
          setIsProcessing(false);
          stream.getTracks().forEach(track => track.stop());
        };
        
        setMediaRecorder(recorder);
        recorder.start();
        onStartRecording();
        // Automatically stop recording after 30 seconds to prevent indefinitely long recordings
        setTimeout(() => {
          if (recorder.state !== 'inactive') {
            console.log('Maximum recording duration of 30 seconds reached. Stopping recording.');
            recorder.stop();
            onStopRecording(false);
          }
        }, 15000);
      } catch (error) {
        console.error('Error setting up recording:', error);
        onStopRecording(false);
      }
    }
  };
  
  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    onStopRecording(false);
  };

  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStream(stream);
      setIsCameraOn(true);
      // Add a small delay to ensure the video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('Video stream assigned to video element');
        } else {
          console.error('Video element not found in DOM');
        }
      }, 100);
    } catch (error) {
      console.error('Error starting camera:', error);
      alert('Failed to start camera. Please ensure your camera is connected and permissions are granted.');
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  return (
    <div className="flex-1 bg-background rounded-l-lg flex items-center justify-center relative p-4">
      <div className="w-full h-full bg-black/5 rounded-md flex flex-col items-center justify-center text-muted-foreground">
        {isCameraOn ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-md" style={{ transform: 'scaleX(-1)' }} />
        ) : (
          <>
            <Video size={64} strokeWidth={1} />
            <p className="mt-2 text-sm">Camera is off</p>
            <button 
              onClick={handleStartCamera}
              className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium"
            >
              Start Camera
            </button>
          </>
        )}
        
        {isCameraOn && !isInterviewStarted && (
          <button 
            onClick={onStartInterview}
            className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium"
          >
            Start Interview
          </button>
        )}
        
        {isInterviewStarted && (
          <div className="mt-6 flex flex-col items-center">
            {isAudioPlaying ? (
              <p className="text-sm mb-2">Meena is speaking...</p>
            ) : isRecording ? (
              <button 
                onClick={handleStopRecording}
                className="flex items-center gap-2 bg-red-500 text-white hover:bg-red-600 px-4 py-2 rounded-md font-medium"
                disabled={isProcessing}
              >
                <Square size={16} />
                {isProcessing ? 'Processing...' : 'Stop Recording'}
              </button>
            ) : (
              <button 
                onClick={handleStartRecording}
                className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium"
              >
                <Mic size={16} />
                Tap to Speak
              </button>
            )}
          </div>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground max-w-md">
          Human eyes will review your performance - so keep it authentic and leave the AI assistants in airplane mode
        </p>
      </div>

      <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
        <span>{candidateName}</span>
        {isRecording ? <Mic size={16} className="text-red-500" /> : <MicOff size={16} />}
      </div>

      <div className="absolute bottom-6 right-6 w-32 h-24 md:w-44 md:h-32 bg-black/10 rounded-lg flex flex-col items-center justify-center text-white overflow-hidden border border-white/10">
        <div className="absolute inset-0 bg-black/20"></div>
        <img src={meenaImage} alt="Meena" className="relative z-10 w-full h-full object-cover rounded-md" />
        {isAudioPlaying && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="flex gap-1 items-center bg-black/50 p-2 rounded-md">
              <div className="w-1 h-3 bg-primary animate-pulse"></div>
              <div className="w-1 h-5 bg-primary animate-pulse delay-75"></div>
              <div className="w-1 h-2 bg-primary animate-pulse delay-150"></div>
              <div className="w-1 h-4 bg-primary animate-pulse delay-300"></div>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm text-white p-1 rounded-full z-30">
            <MoreHorizontal size={16} />
        </div>
      </div>
    </div>
  );
};

export default VideoPanel;
