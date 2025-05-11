"use client";

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, User, SendHorizonal, X, FileText, Download } from 'lucide-react';
import { ChatMessageActions } from './chat-message-actions';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/chat-context';
import { Skeleton } from '@/components/ui/skeleton';
import NextImage from 'next/image';
import { CodeBlock } from './code-block';
import dynamic from 'next/dynamic';
import { detectMapUrlInText } from '@/lib/geocoding';

// Importación dinámica para evitar errores de SSR con Leaflet
const MapDisplay = dynamic(() => import('@/components/maps/MapDisplay'), {
  ssr: false,
});

interface ChatMessageItemProps {
  message: ChatMessage;
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const { isEditingMessageId, submitEditMessage, cancelEditMessage } = useChat();
  const isUser = message.role === 'user';
  const [editText, setEditText] = useState(message.rawText || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [containsMapUrl, setContainsMapUrl] = useState(false);

  const isCurrentlyEditing = isEditingMessageId === message.id;

  useEffect(() => {
    if (isCurrentlyEditing && message.rawText) {
      setEditText(message.rawText);
    }
  }, [isCurrentlyEditing, message.rawText]);
  
  useEffect(() => {
    if (isCurrentlyEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isCurrentlyEditing]);

  useEffect(() => {
    if (message.text && !isUser) {
      setContainsMapUrl(detectMapUrlInText(message.text));
    }
  }, [message.text, isUser]);

  const handleEditSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (editText.trim()) {
      submitEditMessage(message.id, editText.trim());
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      cancelEditMessage();
    }
  };
  
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleDownload = (dataUri: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMessageContent = (text: string) => {
    const parts: (string | { code: string; language: string })[] = [];
    let lastIndex = 0;
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    let match;
  
    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before the code block
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add the code block
      parts.push({
        code: match[2], // The code content
        language: match[1] || 'plaintext', // The language identifier
      });
      lastIndex = codeBlockRegex.lastIndex;
    }
  
    // Add any remaining text after the last code block
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
  
    return parts.map((part, index) => {
      if (typeof part === 'string') {
        return <p key={index} className="whitespace-pre-wrap break-words text-sm leading-relaxed">{part}</p>;
      } else {
        return <CodeBlock key={index} code={part.code} language={part.language} />;
      }
    });
  };

  return (
    <div className={cn('flex items-start gap-3 px-1 py-4 group', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar className="h-8 w-8 border border-border shadow-sm">
          <AvatarImage src="/placeholder-bot.jpg" alt="AI Avatar" data-ai-hint="robot face" />
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'relative max-w-[75%] rounded-lg p-3 shadow-md transition-all duration-300 ease-in-out',
          isUser ? 'bg-primary/90 text-primary-foreground rounded-br-none' : 'bg-card/80 rounded-bl-none border border-border',
          'hover:shadow-lg flex flex-col gap-2'
        )}
      >
        {message.attachment && (
          <div className="mt-1">
            {message.attachment.type === 'image' ? (
              <div className="relative aspect-video max-w-xs cursor-pointer overflow-hidden rounded-md border border-border shadow-sm" onClick={() => message.attachment?.dataUri && handleDownload(message.attachment.dataUri, message.attachment.name)}>
                <NextImage
                  src={message.attachment.dataUri}
                  alt={message.attachment.name}
                  fill 
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
                  style={{ objectFit: 'cover' }} 
                  className="hover:scale-105 transition-transform duration-200"
                  data-ai-hint="user uploaded image"
                />
                 <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                    <Download className="h-8 w-8 text-white" />
                  </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-border bg-background/50 p-2 shadow-sm">
                <FileText className="h-8 w-8 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-foreground">{message.attachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {message.attachment.fileType} - {(message.attachment.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                {message.attachment.dataUri && ( 
                   <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => message.attachment?.dataUri && handleDownload(message.attachment.dataUri, message.attachment.name)}>
                     <Download className="h-4 w-4" />
                   </Button>
                )}
              </div>
            )}
          </div>
        )}

        {isCurrentlyEditing && isUser ? (
          <form onSubmit={handleEditSubmit} className="space-y-2 w-full">
            <Textarea
              ref={textareaRef}
              value={editText}
              onChange={handleTextareaInput}
              onKeyDown={handleTextareaKeyDown}
              className="min-h-[60px] w-full resize-none bg-background/30 text-foreground placeholder:text-muted-foreground focus:ring-accent"
              placeholder="Edit your message..."
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={cancelEditMessage} className="text-muted-foreground hover:text-foreground">
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
              <Button type="submit" variant="secondary" size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <SendHorizonal className="mr-1 h-4 w-4" /> Save
              </Button>
            </div>
          </form>
        ) : (
          <>
            {message.isLoading && message.role === 'ai' ? (
               <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            ) : (
              message.text ? (
                <div className="min-w-0">
                  {renderMessageContent(message.text)}
                  {!isUser && containsMapUrl && <MapDisplay text={message.text} />}
                </div>
              ) : null
            )}
            <div className={cn(
              "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              isUser ? "-left-10" : "-right-10"
            )}>
              {!message.isLoading && <ChatMessageActions message={message} />}
            </div>
          </>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 border border-border shadow-sm">
          <AvatarImage src="/placeholder-user.jpg" alt="User Avatar" data-ai-hint="person silhouette" />
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
