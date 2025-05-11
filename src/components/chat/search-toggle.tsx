
"use client";

import { useChat } from '@/contexts/chat-context';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Globe } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function SearchToggle() {
  const { useSearch, setUseSearch } = useChat();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder to prevent layout shift and hydration issues
    return <div className="flex items-center space-x-2 h-10 w-[120px]" />;
  }

  const handleToggle = (checked: boolean) => {
    setUseSearch(checked);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2 h-10">
            <Switch
              id="search-toggle"
              checked={useSearch}
              onCheckedChange={handleToggle}
              aria-label="Toggle Google Search for AI"
              className={cn(
                "data-[state=checked]:bg-accent data-[state=unchecked]:bg-input focus-visible:ring-ring"
              )}
            />
            <Label htmlFor="search-toggle" className="flex items-center gap-1 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              <Globe className="h-4 w-4" />
              <span>Search</span>
            </Label>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-popover text-popover-foreground border-border">
          <p>{useSearch ? "Disable Google Search" : "Enable Google Search for responses"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

