
"use client";

import type { ChatMessage } from '@/types';
import { useChat } from '@/contexts/chat-context';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Copy, Edit3, MoreHorizontal, RefreshCcw, SendHorizonal, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessageActionsProps {
  message: ChatMessage;
}

export function ChatMessageActions({ message }: ChatMessageActionsProps) {
  const { 
    copyMessageToClipboard, 
    startEditMessage, 
    regenerateLastAiResponse,
    isEditingMessageId,
    cancelEditMessage,
   } = useChat();
  const { toast } = useToast();

  const handleCopy = () => {
    copyMessageToClipboard(message.rawText || message.text);
    toast({ title: "Copied to clipboard!", duration: 2000 });
  };

  const handleEdit = () => {
    startEditMessage(message.id);
  };

  const handleRegenerate = () => {
    regenerateLastAiResponse();
  };

  if (isEditingMessageId === message.id && message.role === 'user') {
    // While editing, these actions are part of the editing form
    return null; 
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground focus-visible:ring-accent">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Message options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border shadow-xl">
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </DropdownMenuItem>
        {message.role === 'user' && (
          <DropdownMenuItem onClick={handleEdit} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
            <Edit3 className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {message.role === 'ai' && (
          <DropdownMenuItem onClick={handleRegenerate} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Regenerate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
