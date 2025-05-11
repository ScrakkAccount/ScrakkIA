
"use client";

import { useChat } from '@/contexts/chat-context';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarMenuSkeleton
} from '@/components/ui/sidebar';
import { useEffect, useState } from 'react';

export function AppSidebar() {
  const { chats, activeChatId, createNewChat, selectChat, deleteChat, getChatName } = useChat();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <Sidebar side="left" collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Button onClick={createNewChat} variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="p-0">
        <ScrollArea className="h-full flex-1">
          <SidebarMenu className="p-2 pt-0">
            {!isClient ? ( // Render skeletons on server or before client hydration
              <>
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
              </>
            ) : chats.length === 0 ? (
                 <p className="p-4 text-sm text-sidebar-foreground/70 text-center group-data-[collapsible=icon]:hidden">No chats yet. Start a new one!</p>
            ) : (
              chats.sort((a,b) => b.lastModified - a.lastModified).map((chat) => (
              <SidebarMenuItem key={chat.id} className="relative group/chat-item">
                <SidebarMenuButton
                  onClick={() => selectChat(chat.id)}
                  isActive={activeChatId === chat.id}
                  tooltip={getChatName(chat)}
                  className={cn(
                    "w-full justify-start truncate",
                    activeChatId === chat.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/80"
                  )}
                >
                  <span className="truncate flex-1">{getChatName(chat)}</span>
                </SidebarMenuButton>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/chat-item:opacity-100 focus:opacity-100 text-muted-foreground hover:text-destructive group-data-[collapsible=icon]:hidden"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete "${getChatName(chat)}"?`)) {
                        deleteChat(chat.id);
                      }
                    }}
                    aria-label="Delete chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
              </SidebarMenuItem>
            ))
            )}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-4">
         {/* Can add footer items like settings or user profile later */}
      </SidebarFooter>
    </Sidebar>
  );
}
