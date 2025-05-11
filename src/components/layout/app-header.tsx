"use client";

import { LanguageSelector } from '@/components/chat/language-selector';
import { AccentSelector } from '@/components/chat/accent-selector';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { SearchToggle } from '@/components/chat/search-toggle';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'; // Added ScrollArea and ScrollBar

export function AppHeader() {
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 shadow-sm backdrop-blur-md md:px-6 md:gap-4">
      <div className="flex items-center gap-2 min-w-0"> {/* min-w-0 for flex child truncation */}
        {isMobile && <SidebarTrigger />}
        <h1 className="text-xl font-semibold tracking-tight text-foreground truncate md:whitespace-nowrap leading-10">
          SCRAKK AI STUDIO
        </h1>
      </div>

      {isMobile ? (
        <ScrollArea orientation="horizontal" className="whitespace-nowrap py-2 max-w-[60vw] sm:max-w-[70vw]">
          <div className="flex items-center gap-3 px-1"> {/* Added px-1 for slight padding from scroll area edges */}
            <SearchToggle />
            <LanguageSelector />
            <AccentSelector />
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5 mt-1" />
        </ScrollArea>
      ) : (
        <div className="flex flex-shrink-0 items-center gap-2">
          <SearchToggle />
          <LanguageSelector />
          <AccentSelector />
        </div>
      )}
    </header>
  );
}
