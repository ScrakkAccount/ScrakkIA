
"use client";

import { ChatMessagesArea } from './chat-messages-area';
import { ChatInput } from './chat-input';

export function ChatInterface() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatMessagesArea />
      <ChatInput />
    </div>
  );
}
