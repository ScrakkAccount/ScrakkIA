
"use client";

import type React from 'react';
import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent, useCallback } from 'react';
import { useChat } from '@/contexts/chat-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, SendHorizonal, CornerDownLeft, X, FileText, Mic, Square, Loader2, CircleStop, Settings2, MessageSquare, Volume2 } from 'lucide-react';
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
} from "@/components/ui/dropdown-menu"

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

  return (
    <TooltipProvider delayDuration={300}>
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 z-10 border-t border-border bg-background/90 p-3 shadow-sm backdrop-blur-sm md:p-4"
      >
        {attachmentPreview && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-input bg-card p-2 shadow-sm">
            {attachmentPreview.type === 'image' && attachmentPreview.previewDataUrl ? (
              <Image
                src={attachmentPreview.previewDataUrl}
                alt={attachmentPreview.name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-md object-cover"
              />
            ) : (
              <FileText className="h-10 w-10 text-muted-foreground" />
            )}
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">{attachmentPreview.name}</p>
              <p className="text-xs text-muted-foreground">{attachmentPreview.fileType} - {(attachmentPreview.file.size / 1024).toFixed(2)} KB</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={removeAttachment} className="h-7 w-7 text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="relative flex items-end gap-2 rounded-lg border border-input focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-background transition-shadow duration-200 ease-in-out shadow-sm hover:shadow-md">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Send a message to Scrakk AI..."
            className="flex-1 resize-none border-0 bg-transparent p-3 pr-[105px] shadow-none focus-visible:ring-0 text-sm min-h-[52px] max-h-[200px]" 
            rows={1}
            disabled={isLoadingAiResponse || micPermissionStatus === 'pending' || currentMicAction !== 'idle' || isTranscribing}
            aria-label="Chat message input"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <input
              type="file"
              ref={fileInputRef}
              accept="*/*" // Allows selection from file system
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Attach file input"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-accent focus-visible:ring-accent"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoadingAiResponse || currentMicAction !== 'idle' || isTranscribing || micPermissionStatus === 'pending'}
                  aria-label="Attach file"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">Attach File</TooltipContent>
            </Tooltip>
            
            {currentMicAction !== 'idle' ? (
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive/80 focus-visible:ring-accent"
                            onClick={manualStopRecording}
                            disabled={isTranscribing}
                            aria-label="Stop recording"
                        >
                            {getMicButtonIcon()}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                        {getMicButtonTooltip()}
                    </TooltipContent>
                </Tooltip>
            ) : (
                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-9 w-9 text-muted-foreground hover:text-accent focus-visible:ring-accent",
                                        (isTranscribing || micPermissionStatus === 'pending') && "text-primary"
                                    )}
                                    disabled={isMicDisabled}
                                    aria-label={getMicButtonTooltip()}
                                >
                                    {getMicButtonIcon()}
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                            {getMicButtonTooltip()}
                        </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" className="bg-popover border-border shadow-xl w-56">
                        <DropdownMenuItem 
                            className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                            onSelect={() => startRecording('voice-to-chat')}
                            disabled={isMicDisabled}
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Voice to Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                            onSelect={() => startRecording('speak-with-ai')}
                            disabled={isMicDisabled}
                        >
                           <Volume2 className="mr-2 h-4 w-4" />
                            Speak with AI
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}


            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  variant="default"
                  size="icon"
                  className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-accent"
                  disabled={(!message.trim() && !attachmentPreview) || isLoadingAiResponse || currentMicAction !== 'idle' || isTranscribing || micPermissionStatus === 'pending'}
                  aria-label="Send message"
                >
                  {isLoadingAiResponse ? (
                     <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status" />
                  ) : (
                    <SendHorizonal className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
               <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                Send ( <CornerDownLeft className="inline h-3 w-3" /> )
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </form>
    </TooltipProvider>
  );
}

