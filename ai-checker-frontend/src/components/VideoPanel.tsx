import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import meenaImage from '../image/meena.jpeg';
import { Video, Mic, MicOff, Play, Square, MoreHorizontal, AlertTriangle, ShieldAlert, Upload } from 'lucide-react';

interface VideoPanelProps {
  isInterviewStarted: boolean;
  isRecording: boolean;
  isAudioPlaying: boolean;
  candidateName: string;
  isInterviewComplete: boolean;
  showWarning: boolean;
  tabSwitchCount: number;
  onDismissWarning: () => void;
  onStartInterview: () => void;
  onStartRecording: () => void;
  onStopRecording: (isRecording: boolean) => void;
  onTranscriptReceived: (transcript: string) => Promise<void>;
}

export interface VideoPanelHandle {
  getRecordedVideoBlob: () => Blob | null;
}

const VideoPanel = forwardRef<VideoPanelHandle, VideoPanelProps>(({
  isInterviewStarted,
  isRecording,
  isAudioPlaying,
  candidateName,
  isInterviewComplete,
  showWarning,
  tabSwitchCount,
  onDismissWarning,
  onStartInterview,
  onStartRecording,
  onStopRecording,
  onTranscriptReceived
}, ref) => {
  // ── Audio recording (per-question STT) ──
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // ── Full interview video recording ──
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const [isVideoRecording, setIsVideoRecording] = useState<boolean>(false);
  const recordedBlobRef = useRef<Blob | null>(null);

  // ── Camera state ──
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  const [isMicGranted, setIsMicGranted] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Expose getRecordedVideoBlob to parent via ref
  useImperativeHandle(ref, () => ({
    getRecordedVideoBlob: () => recordedBlobRef.current,
  }));

  // ── Start camera + microphone together ──
  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      setIsCameraOn(true);
      setIsMicGranted(true);
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
      alert('Failed to start camera & microphone. Please ensure both are connected and permissions are granted.');
    }
  };

  // ── Start full interview video recording ──
  const startVideoRecording = useCallback(() => {
    if (!cameraStream) return;

    videoChunksRef.current = [];
    recordedBlobRef.current = null;

    try {
      const recorder = new MediaRecorder(cameraStream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        recordedBlobRef.current = blob;
        setIsVideoRecording(false);
        console.log(`[Video] Interview recording complete. Size: ${(blob.size / (1024 * 1024)).toFixed(1)} MB`);
      };

      recorder.start(1000); // collect data every second
      videoRecorderRef.current = recorder;
      setIsVideoRecording(true);
      console.log('[Video] Started full interview recording');
    } catch (error) {
      console.error('[Video] Failed to start recording:', error);
    }
  }, [cameraStream]);

  // ── Stop full interview video recording ──
  const stopVideoRecording = useCallback(() => {
    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.stop();
      console.log('[Video] Stopping full interview recording...');
    }
  }, []);

  // Auto-start video recording when interview starts
  useEffect(() => {
    if (isInterviewStarted && cameraStream && !isVideoRecording && !recordedBlobRef.current) {
      startVideoRecording();
    }
  }, [isInterviewStarted, cameraStream, isVideoRecording, startVideoRecording]);

  // Auto-stop video when interview is complete
  useEffect(() => {
    if (isInterviewComplete && isVideoRecording) {
      stopVideoRecording();
    }
  }, [isInterviewComplete, isVideoRecording, stopVideoRecording]);

  // ── Per-question audio recording (existing STT logic) ──
  const handleStartRecording = async () => {
    if (!isAudioPlaying) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        
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
            console.error('No audio data recorded.');
            alert('No audio data was recorded. Please ensure your microphone is enabled.');
            setIsProcessing(false);
            setMediaRecorder(null);
            onStopRecording(false);
            stream.getTracks().forEach(track => track.stop());
            return;
          }
          
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');
          
          try {
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
          
          setAudioChunks([]);
          setMediaRecorder(null);
          setIsProcessing(false);
          stream.getTracks().forEach(track => track.stop());
        };
        
        setMediaRecorder(recorder);
        recorder.start();
        onStartRecording();
        setTimeout(() => {
          if (recorder.state !== 'inactive') {
            console.log('Maximum recording duration reached. Stopping recording.');
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
        videoRecorderRef.current.stop();
      }
    };
  }, [cameraStream]);

  return (
    <div className="flex-1 bg-background rounded-l-lg flex items-center justify-center relative p-4">

      {/* ═══ TAB-SWITCH WARNING OVERLAY ═══ */}
      {showWarning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md rounded-l-lg"
             style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div className="bg-background border border-red-500/40 rounded-xl p-8 max-w-md mx-4 text-center shadow-2xl shadow-red-500/20"
               style={{ animation: 'scaleIn 0.3s ease-out' }}>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <ShieldAlert size={32} className="text-red-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Tab Switch Detected!</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Switching tabs during the interview is not allowed. This activity has been recorded.
            </p>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 mb-6">
              <p className="text-red-400 text-sm font-semibold">
                Violations: {tabSwitchCount}
              </p>
            </div>
            <button
              onClick={onDismissWarning}
              className="w-full bg-red-500 text-white hover:bg-red-600 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Return to Interview
            </button>
          </div>
        </div>
      )}

      {/* ═══ MAIN VIDEO AREA ═══ */}
      <div className="w-full h-full bg-black/5 rounded-md flex flex-col items-center justify-center text-muted-foreground">
        {isCameraOn ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-md" style={{ transform: 'scaleX(-1)' }} />
        ) : (
          <>
            <Video size={64} strokeWidth={1} />
            <p className="mt-2 text-sm">Camera & Microphone are off</p>
            <button 
              onClick={handleStartCamera}
              className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium"
            >
              Enable Camera & Mic
            </button>
          </>
        )}
        
        {isCameraOn && !isInterviewStarted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-md">
            <div className="flex items-center gap-2 mb-4 bg-green-500/20 border border-green-500/30 px-4 py-2 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 text-sm font-medium">Camera & Mic Ready</span>
            </div>
            <button 
              onClick={onStartInterview}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-semibold text-lg transition-all hover:scale-105"
            >
              Start Interview
            </button>
          </div>
        )}
        
        {isInterviewStarted && !isInterviewComplete && (
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

        {isInterviewComplete && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-md">
            <div className="bg-background border rounded-xl p-6 text-center max-w-sm">
              <Upload size={32} className="mx-auto mb-3 text-primary" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Interview Complete</h3>
              <p className="text-sm text-muted-foreground">Your recording is being uploaded to Google Drive...</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground max-w-md">
          Human eyes will review your performance - so keep it authentic and leave the AI assistants in airplane mode
        </p>
      </div>

      {/* ═══ CANDIDATE NAME BADGE ═══ */}
      <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
        <span>{candidateName}</span>
        {isRecording ? <Mic size={16} className="text-red-500" /> : <MicOff size={16} />}
      </div>

      {/* ═══ VIDEO RECORDING INDICATOR ═══ */}
      {isVideoRecording && (
        <div className="absolute top-6 left-6 bg-red-500/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 z-30">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="font-medium">REC</span>
        </div>
      )}

      {/* ═══ TAB-SWITCH COUNTER BADGE ═══ */}
      {tabSwitchCount > 0 && isInterviewStarted && (
        <div className="absolute top-6 right-6 bg-red-500/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 z-30">
          <AlertTriangle size={12} />
          <span className="font-medium">{tabSwitchCount} violation{tabSwitchCount > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ═══ MEENA PIP ═══ */}
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
});

VideoPanel.displayName = 'VideoPanel';

export default VideoPanel;
