
"use client";

import type React from 'react';
import { useChat } from '@/contexts/chat-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_LANGUAGES } from '@/config/languages';
import type { AccentOption } from '@/types';
import { Globe2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const DEFAULT_ACCENT_VALUE = "__DEFAULT_ACCENT__"; // Unique value for default option

export function AccentSelector() {
  const { selectedLanguage, selectedAccent, setAccent } = useChat();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLanguageDetails = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage);
  const availableAccents = currentLanguageDetails?.accents || [];

  if (!mounted || availableAccents.length === 0) {
    return <div className="w-auto min-w-[180px] h-10" />;
  }

  const handleValueChange = (value: string) => {
    if (value === DEFAULT_ACCENT_VALUE) {
      setAccent(null);
    } else {
      setAccent(value);
    }
  };

  const displayValue = selectedAccent === null ? DEFAULT_ACCENT_VALUE : selectedAccent;

  return (
    <Select
      value={displayValue}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-auto min-w-[180px] h-10 bg-input border-border focus:ring-accent text-sm">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Select accent" />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        <SelectItem value={DEFAULT_ACCENT_VALUE} className="focus:bg-accent focus:text-accent-foreground">
          Default Accent
        </SelectItem>
        {availableAccents.map((accent: AccentOption) => (
          <SelectItem key={accent.code} value={accent.code} className="focus:bg-accent focus:text-accent-foreground">
            {accent.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

