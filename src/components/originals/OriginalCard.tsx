import { motion } from 'framer-motion';
import { MoreHorizontal, Eye, Edit, Copy, Trash2, Globe, GlobeLock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { TypeBadge } from './TypeBadge';
import { DurationBadge } from './DurationBadge';
import { AuthorAvatar } from './AuthorAvatar';
import { cn } from '@/lib/utils';
import type { OriginalWithAuthor } from '@/hooks/useOriginals';

interface OriginalCardProps {
  original: OriginalWithAuthor;
  onEdit: (original: OriginalWithAuthor) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  index?: number;
}

const placeholderImages = {
  article: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&h=300&fit=crop',
  podcast: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=300&fit=crop',
  emission: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=300&fit=crop',
};

export function OriginalCard({
  original,
  onEdit,
  onPublish,
  onUnpublish,
  onDuplicate,
  onDelete,
  index = 0,
}: OriginalCardProps) {
  const { t } = useTranslation();
  const isPublished = original.status === 'published';
  const imageUrl = original.cover_image_url || placeholderImages[original.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-border">
        <div className="relative aspect-video overflow-hidden" onClick={() => onEdit(original)}>
          <img
            src={imageUrl}
            alt={original.title_fr}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Type badge top-left */}
          <div className="absolute top-3 left-3">
            <TypeBadge type={original.type} />
          </div>

          {/* Status badge top-right */}
          <div className="absolute top-3 right-3">
            <StatusBadge status={original.status} />
          </div>

          {/* Duration badge for podcast/emission */}
          {(original.type === 'podcast' || original.type === 'emission') && (
            <div className="absolute bottom-3 right-3">
              <DurationBadge seconds={original.duration_seconds} />
            </div>
          )}

          {/* Actions menu - visible on hover */}
          <div className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit(original)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(original.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('originals.duplicate')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isPublished ? (
                  <DropdownMenuItem onClick={() => onUnpublish(original.id)}>
                    <GlobeLock className="h-4 w-4 mr-2" />
                    {t('common.unpublish')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onPublish(original.id)}>
                    <Globe className="h-4 w-4 mr-2" />
                    {t('common.publish')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(original.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <CardContent className="p-4" onClick={() => onEdit(original)}>
          {/* Title */}
          <h3 className="font-semibold text-base line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {original.title_fr}
          </h3>

          {/* Excerpt */}
          {original.excerpt_fr && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {original.excerpt_fr}
            </p>
          )}

          {/* Footer: Author + Date */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <AuthorAvatar author={original.author} showName size="sm" />
            <span className="text-xs text-muted-foreground">
              {original.published_at 
                ? format(new Date(original.published_at), 'dd MMM yyyy', { locale: fr })
                : format(new Date(original.created_at), 'dd MMM yyyy', { locale: fr })
              }
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
