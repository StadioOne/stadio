import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MoreHorizontal, Edit, Trash2, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ActiveBadge } from './ActiveBadge';
import { SocialLinks } from './SocialLinks';
import type { AuthorWithStats } from '@/hooks/useAuthors';

interface AuthorRowProps {
  author: AuthorWithStats;
  onEdit: (author: AuthorWithStats) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onViewContents: (authorId: string) => void;
  index?: number;
}

export function AuthorRow({
  author,
  onEdit,
  onToggleActive,
  onDelete,
  onViewContents,
  index = 0,
}: AuthorRowProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const bio = lang === 'en' && author.bio_en ? author.bio_en : author.bio_fr;
  const initials = author.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onEdit(author)}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-1 ring-border">
            <AvatarImage src={author.avatar_url || undefined} alt={author.name} />
            <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{author.name}</span>
        </div>
      </TableCell>

      <TableCell>
        {bio ? (
          <span className="text-sm text-muted-foreground line-clamp-1 max-w-xs">
            {bio}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/50 italic">
            {t('authors.noBio')}
          </span>
        )}
      </TableCell>

      <TableCell>
        <SocialLinks
          twitter={author.social_twitter}
          linkedin={author.social_linkedin}
          size="sm"
        />
      </TableCell>

      <TableCell>
        <Badge
          variant="secondary"
          className="cursor-pointer hover:bg-secondary/80"
          onClick={(e) => {
            e.stopPropagation();
            onViewContents(author.id);
          }}
        >
          <FileText className="h-3 w-3 mr-1" />
          {author.contentsCount}
        </Badge>
      </TableCell>

      <TableCell>
        <ActiveBadge isActive={author.is_active ?? true} />
      </TableCell>

      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(author)}>
              <Edit className="h-4 w-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewContents(author.id)}>
              <FileText className="h-4 w-4 mr-2" />
              {t('authors.viewContents')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onToggleActive(author.id, !author.is_active)}
            >
              {author.is_active ? (
                <>
                  <ToggleLeft className="h-4 w-4 mr-2" />
                  {t('common.deactivate')}
                </>
              ) : (
                <>
                  <ToggleRight className="h-4 w-4 mr-2" />
                  {t('common.activate')}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(author.id)}
              className="text-destructive focus:text-destructive"
              disabled={author.contentsCount > 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </motion.tr>
  );
}
