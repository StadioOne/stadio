import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MoreHorizontal, Edit, Trash2, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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

interface AuthorCardProps {
  author: AuthorWithStats;
  onEdit: (author: AuthorWithStats) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onViewContents: (authorId: string) => void;
  index?: number;
}

export function AuthorCard({
  author,
  onEdit,
  onToggleActive,
  onDelete,
  onViewContents,
  index = 0,
}: AuthorCardProps) {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/20"
        onClick={() => onEdit(author)}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <Avatar className="h-20 w-20 mb-4 ring-2 ring-background shadow-md">
              <AvatarImage src={author.avatar_url || undefined} alt={author.name} />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Name & Badge */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-base">{author.name}</h3>
              <ActiveBadge isActive={author.is_active ?? true} />
            </div>

            {/* Bio */}
            {bio && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {bio}
              </p>
            )}

            {/* Social Links */}
            <SocialLinks
              twitter={author.social_twitter}
              linkedin={author.social_linkedin}
              size="sm"
              className="mb-3"
            />

            {/* Contents Count */}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onViewContents(author.id);
              }}
            >
              <FileText className="h-3 w-3 mr-1" />
              {t('authors.contentsCount', { count: author.contentsCount })}
            </Button>
          </div>

          {/* Actions Menu */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
