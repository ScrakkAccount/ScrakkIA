
"use client";

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'plaintext' }: CodeBlockProps) {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        toast({ title: 'Code copied to clipboard!', duration: 2000 });
      }).catch(err => {
        toast({ title: 'Failed to copy code', variant: 'destructive', duration: 2000 });
        console.error('Failed to copy code: ', err);
      });
    } else {
       toast({ title: 'Copying to clipboard not supported in this browser.', variant: 'destructive', duration: 3000 });
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${language}_code_snippet.${language === 'html' ? 'html' : 'txt'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'Code download started!', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to download code', variant: 'destructive', duration: 2000 });
      console.error('Failed to download code: ', error);
    }
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const isHtml = language?.toLowerCase() === 'html';

  return (
    <div className="relative my-2 rounded-md border border-border bg-card/90 shadow-sm text-sm w-full">
      <div className="flex items-center justify-between rounded-t-md border-b border-border bg-muted/50 px-3 py-1.5">
        <span className="text-xs font-semibold uppercase text-muted-foreground">{language}</span>
        <div className="flex gap-1">
          {isHtml && (
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePreview}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label={showPreview ? "Hide HTML preview" : "Show HTML preview"}
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Copy code"
          >
            <Copy size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Download code"
          >
            <Download size={14} />
          </Button>
        </div>
      </div>
      {isHtml && showPreview && (
        <div className="border-t border-border p-2">
          <iframe
            srcDoc={code}
            title="HTML Preview"
            sandbox="allow-scripts allow-forms allow-popups allow-modals" // Removed allow-same-origin
            className="h-[300px] w-full rounded-md border border-input bg-background"
            // Consider adding a loading state or error handling for the iframe
          />
        </div>
      )}
      <ScrollArea className={cn("max-h-[400px] w-full", isHtml && showPreview && "border-t border-border")}>
        <pre className="overflow-x-auto p-3 w-full"> {/* Added w-full */}
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </ScrollArea>
    </div>
  );
}
