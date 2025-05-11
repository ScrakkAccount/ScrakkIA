
"use client";

import { useEffect, useRef } from 'react';
import { useChat } from '@/contexts/chat-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessageItem } from './chat-message-item';
import Image from 'next/image';

export function ChatMessagesArea() {
  const { chats, activeChatId } = useChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find(chat => chat.id === activeChatId);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [activeChat?.messages]);

  if (!activeChat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <div className="w-full max-w-[250px] sm:max-w-[300px] mx-auto mb-4">
          <Image 
            src="https://picsum.photos/seed/scrakk-empty/300/200" 
            alt="Empty chat" 
            width={300} 
            height={200} 
            layout="responsive"
            className="rounded-lg opacity-50" 
            data-ai-hint="abstract modern" 
          />
        </div>
        <p className="text-lg text-muted-foreground">
          Select a chat or start a new one.
        </p>
      </div>
    );
  }
  
  if (activeChat.messages.length === 0) {
     return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <div className="w-full max-w-[250px] sm:max-w-[300px] mx-auto mb-4">
          <Image 
            src="https://picsum.photos/seed/scrakk-welcome/300/200" 
            alt="Welcome" 
            width={300} 
            height={200} 
            layout="responsive"
            className="rounded-lg opacity-70" 
            data-ai-hint="futuristic robot" 
          />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Welcome to SCRAKK AI STUDIO!</h2>
        <p className="text-muted-foreground">
          Send a message to start your conversation with Scrakk AI.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1" ref={scrollAreaRef}>
      <div ref={viewportRef} className="h-full p-4 md:p-6 space-y-1"> {/* Reduced space-y from 4 to 1 */}
        {activeChat.messages.map((message) => (
          <ChatMessageItem key={message.id} message={message} />
        ))}
      </div>
    </ScrollArea>
  );
}

