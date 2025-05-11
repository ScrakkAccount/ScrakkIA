
"use client";

import { useChat } from '@/contexts/chat-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_LANGUAGES } from '@/config/languages';
import type { LanguageCode } from '@/types';
import { Languages } from 'lucide-react';
import { useState, useEffect } from 'react';

export function LanguageSelector() {
  const { selectedLanguage, setLanguage } = useChat();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a placeholder or null during server render and initial client render
    // to avoid hydration mismatch if selectedLanguage from localStorage differs.
    // A simple div matching the trigger's height can prevent layout shifts.
    return <div className="w-auto min-w-[180px] h-10 bg-input border-border rounded-md" />;
  }

  return (
    <Select
      value={selectedLanguage}
      onValueChange={(value) => setLanguage(value as LanguageCode)}
    >
      <SelectTrigger className="w-auto min-w-[180px] h-10 bg-input border-border focus:ring-accent text-sm">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Select language" />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="focus:bg-accent focus:text-accent-foreground">
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
