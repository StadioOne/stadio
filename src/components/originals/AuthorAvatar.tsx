import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Author } from '@/lib/api-types';

interface AuthorAvatarProps {
  author: Author | null;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function AuthorAvatar({ author, size = 'sm', showName = false, className }: AuthorAvatarProps) {
  if (!author) {
    return null;
  }

  const avatarElement = (
    <div className={cn('flex items-center gap-2', className)}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={author.avatar_url || undefined} alt={author.name} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {getInitials(author.name)}
        </AvatarFallback>
      </Avatar>
      {showName && (
        <span className="text-sm text-muted-foreground truncate">
          {author.name}
        </span>
      )}
    </div>
  );

  if (showName) {
    return avatarElement;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {avatarElement}
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-sm">{author.name}</p>
      </TooltipContent>
    </Tooltip>
  );
}
