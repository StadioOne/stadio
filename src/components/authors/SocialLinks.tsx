import { Twitter, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SocialLinksProps {
  twitter?: string | null;
  linkedin?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

function normalizeTwitterUrl(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const cleaned = handle.trim();
  if (cleaned.startsWith('http')) return cleaned;
  const username = cleaned.replace(/^@/, '');
  return `https://twitter.com/${username}`;
}

function normalizeLinkedInUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const cleaned = url.trim();
  if (cleaned.startsWith('http')) return cleaned;
  return `https://linkedin.com/in/${cleaned}`;
}

export function SocialLinks({ twitter, linkedin, size = 'sm', className }: SocialLinksProps) {
  const twitterUrl = normalizeTwitterUrl(twitter);
  const linkedinUrl = normalizeLinkedInUrl(linkedin);

  if (!twitterUrl && !linkedinUrl) {
    return null;
  }

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {twitterUrl && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(buttonSize, 'text-muted-foreground hover:text-foreground')}
              onClick={(e) => {
                e.stopPropagation();
                window.open(twitterUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              <Twitter className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Twitter / X</TooltipContent>
        </Tooltip>
      )}
      {linkedinUrl && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(buttonSize, 'text-muted-foreground hover:text-foreground')}
              onClick={(e) => {
                e.stopPropagation();
                window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              <Linkedin className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>LinkedIn</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
