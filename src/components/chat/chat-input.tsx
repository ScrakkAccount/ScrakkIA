"use client";

import type React from 'react';
import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent, useCallback } from 'react';
import { useChat } from '@/contexts/chat-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, SendHorizonal, CornerDownLeft, X, FileText, Mic, Square, Loader2, CircleStop, Settings2, MessageSquare, Volume2, MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { transcribeAudio } from '@/ai/flows/speech-to-text-flow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import dynamic from 'next/dynamic';

// Importar el botón de ubicación con carga dinámica para evitar errores de SSR
const LocationButton = dynamic(() => import('@/components/maps/LocationButton'), {
  ssr: false
});

interface AttachmentPreview {
  file: File;
  type: 'image' | 'file';
  previewDataUrl?: string; // For image previews
  name: string;
  fileType: string;
}

type MicPermissionStatus = 'idle' | 'pending' | 'granted' | 'denied' | 'unsupported';

// VAD Constants
const REQUIRED_SILENCE_DURATION_MS = 1800; // Stop after 1.8s of silence
const VAD_CHECK_INTERVAL_MS = 200;       // Check for silence every 200ms
const RMS_SILENCE_THRESHOLD = 0.008;      // RMS threshold for silence (normalized: 0-1). Needs tuning.
const FFT_SIZE = 512;                     // Smaller FFT size for faster analysis in VAD

export function ChatInput() {
  const [message, setMessage] = useState('');
  const [attachmentPreview, setAttachmentPreview] = useState<AttachmentPreview | null>(null);
  // const [isRecording, setIsRecording] = useState(false); // Managed by currentMicAction now
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micPermissionStatus, setMicPermissionStatus] = useState<MicPermissionStatus>('idle');
  const [showLocationButton, setShowLocationButton] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const { 
    sendMessage, 
    isLoadingAiResponse, 
    selectedLanguage, 
    currentMicAction, 
    setCurrentMicAction,
    stopSpeaking,
    isPlayingAudio,
   } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const baseMessageOnRecordStartRef = useRef<string>('');
  const micStreamRef = useRef<MediaStream | null>(null);

  // VAD refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceStartTimeRef = useRef<number | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined' && (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)) {
      setMicPermissionStatus('unsupported');
    } else {
      setMicPermissionStatus('idle');
    }
    // Cleanup on unmount
    return () => {
      if (silenceDetectionIntervalRef.current) clearInterval(silenceDetectionIntervalRef.current);
      micStreamRef.current?.getTracks().forEach(track => track.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.warn("Error closing AudioContext on unmount:", e));
      }
    };
  }, []);


  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview({
          file,
          type: 'image',
          previewDataUrl: reader.result as string,
          name: file.name,
          fileType: file.type,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview({
        file,
        type: 'file',
        name: file.name,
        fileType: file.type,
      });
    }
    if (event.target) {
      event.target.value = ''; 
    }
  };

  const removeAttachment = () => {
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = useCallback(async (event?: React.FormEvent | { currentTarget: HTMLTextAreaElement }) => {
    if (event && 'preventDefault' in event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    const currentMessageText = message.trim();
    const currentAttachment = attachmentPreview;

    if ((!currentMessageText && !currentAttachment) || isLoadingAiResponse || isTranscribing || currentMicAction !== 'idle') return;
    
    await sendMessage(currentMessageText, currentAttachment?.file);
    
    setMessage(''); 
    setAttachmentPreview(null);
    baseMessageOnRecordStartRef.current = '';
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Only focus if it was a direct textarea interaction (Enter key), not a form submit button click
      if (event && 'currentTarget' in event && event.currentTarget instanceof HTMLTextAreaElement) { 
        textareaRef.current.focus();
      }
    }
  }, [message, attachmentPreview, isLoadingAiResponse, isTranscribing, currentMicAction, sendMessage]);


  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit({ currentTarget: event.currentTarget });
    }
  };

  const vadSilenceCheck = useCallback(() => {
    if (!analyserRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
      if (silenceDetectionIntervalRef.current) clearInterval(silenceDetectionIntervalRef.current);
      return;
    }

    const timeDomainDataArray = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(timeDomainDataArray);

    let sumOfSquares = 0;
    for (let i = 0; i < timeDomainDataArray.length; i++) {
      const deviation = (timeDomainDataArray[i] / 128.0) - 1.0; // Normalize: 0-255 -> -1 to 1 (approx)
      sumOfSquares += deviation * deviation;
    }
    const rms = Math.sqrt(sumOfSquares / timeDomainDataArray.length);

    if (rms > RMS_SILENCE_THRESHOLD) {
      silenceStartTimeRef.current = null; // Sound detected
    } else { // Silence
      if (silenceStartTimeRef.current === null) {
        silenceStartTimeRef.current = Date.now();
      } else if (Date.now() - (silenceStartTimeRef.current || 0) >= REQUIRED_SILENCE_DURATION_MS) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          // console.log("VAD: Silence detected, stopping recording.");
          mediaRecorderRef.current.stop(); // This will trigger onstop
        }
        if (silenceDetectionIntervalRef.current) clearInterval(silenceDetectionIntervalRef.current);
      }
    }
  }, []);


  const startRecording = async (micMode: 'voice-to-chat' | 'speak-with-ai') => {
    if (micPermissionStatus === 'unsupported' || !navigator.mediaDevices?.getUserMedia) {
      toast({ title: 'Voice Input Not Supported', description: 'Your browser does not support voice input.', variant: 'destructive' });
      return;
    }
    if (micPermissionStatus === 'denied') {
       toast({ title: 'Microphone Access Denied', description: 'Please enable microphone permissions in your browser settings.', variant: 'destructive' });
       return;
    }
    
    if (isPlayingAudio && micMode === 'speak-with-ai') {
        stopSpeaking(); // Stop any ongoing AI speech before user starts speaking
    }

    setMicPermissionStatus('pending');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream; // Store stream for cleanup
      setMicPermissionStatus('granted');
      setCurrentMicAction(micMode);
      
      baseMessageOnRecordStartRef.current = message; // Save current message text
      audioChunksRef.current = [];

      const options = { mimeType: 'audio/webm;codecs=opus' };
      let currentMediaRecorder: MediaRecorder;
      try {
        currentMediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback if opus is not supported (e.g., some Safari versions)
        currentMediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = currentMediaRecorder;

      // Setup VAD
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioContextRef.current;
      analyserRef.current = audioCtx.createAnalyser();
      analyserRef.current.fftSize = FFT_SIZE;
      mediaStreamSourceRef.current = audioCtx.createMediaStreamSource(stream);
      mediaStreamSourceRef.current.connect(analyserRef.current);
      
      silenceStartTimeRef.current = null;
      if (silenceDetectionIntervalRef.current) clearInterval(silenceDetectionIntervalRef.current);
      silenceDetectionIntervalRef.current = setInterval(vadSilenceCheck, VAD_CHECK_INTERVAL_MS);


      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const stoppedMicAction = currentMicAction; // Capture current mode before it's reset
        setCurrentMicAction('idle'); // Set state immediately

        // VAD & Web Audio API Cleanup
        if (silenceDetectionIntervalRef.current) {
          clearInterval(silenceDetectionIntervalRef.current);
          silenceDetectionIntervalRef.current = null;
        }
        mediaStreamSourceRef.current?.disconnect();
        analyserRef.current?.disconnect(); // Disconnect analyser
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(e => console.warn("Error closing AudioContext in onstop:", e))
          .finally(() => { audioContextRef.current = null; }); // Ensure context is nulled
        } else {
          audioContextRef.current = null; // Ensure context is nulled if already closed or never opened
        }
        analyserRef.current = null;
        mediaStreamSourceRef.current = null;
        silenceStartTimeRef.current = null;
        
        // Stop all tracks of the microphone stream
        micStreamRef.current?.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;

        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        audioChunksRef.current = [];

        if (audioBlob.size === 0) {
          setIsTranscribing(false);
          setMessage(baseMessageOnRecordStartRef.current); // Restore message if no audio
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const audioDataUri = reader.result as string;
          try {
            const response = await transcribeAudio({ audioDataUri, languageCode: selectedLanguage });
            const transcribedText = response.transcribedText.trim();
            
            let finalText = baseMessageOnRecordStartRef.current; // Start with text user might have typed before recording
            if (finalText.trim() && transcribedText) { // If both exist, add a space
              if (!finalText.endsWith(' ') && !finalText.endsWith('\n')) finalText += ' ';
            }
            finalText += transcribedText; // Append transcribed text
            setMessage(finalText); // Update the textarea

            if (textareaRef.current) { // Adjust textarea height
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
              textareaRef.current.focus(); // Focus and move cursor to end
              const len = textareaRef.current.value.length;
              textareaRef.current.setSelectionRange(len, len);
            }
            
            // If 'voice-to-chat' or 'speak-with-ai' and there's text or an attachment, send the message.
            // For 'speak-with-ai', the AI response will trigger speech.
            if ((stoppedMicAction === 'voice-to-chat' || stoppedMicAction === 'speak-with-ai') && (finalText.trim() || attachmentPreview)) {
              await sendMessage(finalText.trim(), attachmentPreview?.file);
              setMessage(''); // Clear input after sending
              setAttachmentPreview(null); // Clear attachment
              baseMessageOnRecordStartRef.current = ''; // Reset base message
               if (textareaRef.current) textareaRef.current.style.height = 'auto'; // Reset height
            }

          } catch (transcriptionError) {
            console.error('Error transcribing audio:', transcriptionError);
            toast({ variant: 'destructive', title: 'Transcription Error', description: 'Could not transcribe audio.'});
            setMessage(baseMessageOnRecordStartRef.current); // Restore original message on error
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.onerror = () => { // Handle file reader errors
            setIsTranscribing(false);
            setMessage(baseMessageOnRecordStartRef.current);
            toast({ variant: 'destructive', title: 'Audio Processing Error' });
        };
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setCurrentMicAction('idle');
        setIsTranscribing(false);
        setMessage(baseMessageOnRecordStartRef.current);
        toast({ variant: 'destructive', title: 'Recording Error' });
        // Cleanup in case of error
        if (silenceDetectionIntervalRef.current) clearInterval(silenceDetectionIntervalRef.current);
        micStreamRef.current?.getTracks().forEach(track => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
      };

      mediaRecorderRef.current.start();
      // setIsRecording(true); // State is now managed by currentMicAction

    } catch (error) {
      console.error('Error accessing microphone or starting recording:', error);
      setMicPermissionStatus('denied');
      setCurrentMicAction('idle');
      setIsTranscribing(false);
      toast({ variant: 'destructive', title: 'Microphone Access Denied' });
      micStreamRef.current?.getTracks().forEach(track => track.stop()); // Ensure cleanup if error
    }
  };

  const manualStopRecording = () => {
    if (mediaRecorderRef.current && currentMicAction !== 'idle') {
      mediaRecorderRef.current.stop(); 
      // onstop will handle cleanup and state changes
    }
  };
  
  const getMicButtonIcon = () => {
    if (micPermissionStatus === 'pending' || isTranscribing) return <Loader2 className="h-5 w-5 animate-spin" />;
    if (currentMicAction !== 'idle') return <CircleStop className="h-5 w-5 text-destructive" />;
    return <Mic className="h-5 w-5" />;
  };
  
  const getMicButtonTooltip = () => {
    if (micPermissionStatus === 'pending') return "Requesting permission...";
    if (isTranscribing) return "Transcribing audio...";
    if (currentMicAction !== 'idle') return "Stop recording (or wait for auto-stop)";
    if (micPermissionStatus === 'unsupported') return "Voice input not supported";
    if (micPermissionStatus === 'denied') return "Microphone access denied";
    return "Voice Input Options";
  };

  const isMicDisabled = isLoadingAiResponse || 
                        micPermissionStatus === 'unsupported' || 
                        (micPermissionStatus === 'pending' && currentMicAction === 'idle') || 
                        isTranscribing;

  const handleLocationObtained = (location: {lat: number, lng: number}) => {
    setUserLocation(location);
    // Opcional: insertar la ubicación en el mensaje
    // setMessage(msg => msg + ` [Mi ubicación: ${location.lat.toFixed(6)},${location.lng.toFixed(6)}]`);
    
    // Almacenar la ubicación en localStorage para usarla después
    try {
      localStorage.setItem('userExactLocation', JSON.stringify(location));
    } catch (e) {
      console.error('Error guardando ubicación:', e);
    }
    
    toast({
      title: "Ubicación obtenida",
      description: "Tu ubicación exacta se utilizará para las rutas en el mapa.",
    });
  };

  return (
    <div className="relative mt-auto pt-4 pb-6 md:pb-4 px-4 md:px-8 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-3 relative mx-auto max-w-5xl">
        {attachmentPreview && (
          <div className="flex items-center gap-2 rounded-md border bg-background/50 p-2 shadow-sm">
            {attachmentPreview.type === 'image' ? (
              <div className="relative h-12 w-12 overflow-hidden rounded">
                <Image 
                  src={attachmentPreview.previewDataUrl || ''} 
                  alt={attachmentPreview.name}
                  fill 
                  style={{ objectFit: 'cover' }} 
                  className="rounded" 
                  data-ai-hint="image preview thumbnail"
                />
              </div>
            ) : (
              <FileText className="h-8 w-8 text-muted-foreground" />
            )}
            
            <div className="flex-1 overflow-hidden pr-2">
              <p className="truncate text-sm font-medium">{attachmentPreview.name}</p>
              <p className="text-xs text-muted-foreground">
                {attachmentPreview.fileType} - {(attachmentPreview.file.size / 1024).toFixed(2)} KB
              </p>
            </div>
            
            <Button type="button" variant="ghost" size="icon" onClick={removeAttachment}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {showLocationButton && (
          <div className="mb-2">
            <LocationButton onLocationObtained={handleLocationObtained} />
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <Textarea 
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isLoadingAiResponse || isTranscribing || currentMicAction !== 'idle'}
              placeholder={
                isLoadingAiResponse ? "Esperando respuesta..." :
                isTranscribing ? "Transcribiendo audio..." :
                currentMicAction !== 'idle' ? "Grabando audio..." :
                `Escribe un mensaje...${selectedLanguage ? ` (${selectedLanguage})` : ''}`
              }
              className="min-h-[60px] w-full resize-none rounded-lg border bg-background pr-14 py-3 focus-visible:ring-accent"
            />
            <div className="absolute bottom-2 right-2 flex gap-2 justify-between items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-6 w-6 rounded-md">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowLocationButton(!showLocationButton)}>
                    <MapPin className="mr-2 h-4 w-4" />
                    {showLocationButton ? "Ocultar botón de ubicación" : "Mostrar botón de ubicación"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* Otros items del menú */}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex gap-1.5 items-center">
            {/* Botón de ubicación rápida */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  size="icon" 
                  variant="ghost" 
                  className={cn(
                    "h-9 w-9 rounded-full",
                    userLocation ? "text-primary border-primary" : "text-muted-foreground"
                  )}
                  onClick={() => setShowLocationButton(!showLocationButton)}
                >
                  <MapPin className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {userLocation ? "Ubicación exacta activada" : "Obtener ubicación exacta"}
              </TooltipContent>
            </Tooltip>
            
            {/* Botón de adjuntar archivo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  size="icon" 
                  variant="ghost" 
                  className="h-9 w-9 rounded-full" 
                  disabled={isLoadingAiResponse || isTranscribing || !!attachmentPreview || currentMicAction !== 'idle'}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Adjuntar archivo</TooltipContent>
            </Tooltip>
            
            {/* Botón de micrófono */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  size="icon" 
                  variant={micPermissionStatus === 'denied' ? 'destructive' : currentMicAction !== 'idle' ? 'default' : 'ghost'} 
                  className={cn(
                    "h-9 w-9 rounded-full",
                    currentMicAction !== 'idle' && "animate-pulse"
                  )} 
                  disabled={isLoadingAiResponse || isTranscribing || micPermissionStatus === 'unsupported'}
                  onClick={currentMicAction === 'idle' ? 
                    () => startRecording('voice-to-chat') : 
                    manualStopRecording
                  }
                >
                  {getMicButtonIcon()}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{getMicButtonTooltip()}</TooltipContent>
            </Tooltip>
            
            {/* Botón de enviar */}
            <Button 
              type="submit" 
              size="icon" 
              disabled={(!message.trim() && !attachmentPreview) || isLoadingAiResponse || isTranscribing || currentMicAction !== 'idle'} 
              className="h-9 w-9 rounded-full"
            >
              {isLoadingAiResponse ? 
                <Loader2 className="h-5 w-5 animate-spin" /> : 
                <SendHorizonal className="h-5 w-5" />
              }
            </Button>
          </div>
          
          {/* Input oculto para selección de archivos */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect} 
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/zip"
          />
        </div>
      </form>
    </div>
  );
}

