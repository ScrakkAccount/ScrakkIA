
"use client";

import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useEffect } from 'react';
import { useChat } from '@/contexts/chat-context';


export default function ChatPage() {
  const { createNewChat, chats } = useChat();

  useEffect(() => {
    // Ensure there's at least one chat session on initial load if localStorage was empty
    // This logic is mostly handled by ChatProvider, but this is a safeguard or for specific UI needs
    if (chats.length === 0) {
      // createNewChat(); // ChatProvider handles initial chat creation
    }
  }, [chats, createNewChat]);
  
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden p-0 m-0 rounded-none shadow-none">
        <AppHeader />
        <ChatInterface />
      </SidebarInset>
    </SidebarProvider>
  );
}
