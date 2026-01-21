import { motion } from 'framer-motion';
import { MoreHorizontal, Eye, Edit, Copy, Trash2, Globe, GlobeLock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { TypeBadge } from './TypeBadge';
import { DurationBadge } from './DurationBadge';
import { AuthorAvatar } from './AuthorAvatar';
import { cn } from '@/lib/utils';
import type { OriginalWithAuthor } from '@/hooks/useOriginals';

interface OriginalRowProps {
  original: OriginalWithAuthor;
  onEdit: (original: OriginalWithAuthor) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  index?: number;
}

const placeholderImages = {
  article: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=100&h=100&fit=crop',
  podcast: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=100&h=100&fit=crop',
  emission: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=100&h=100&fit=crop',
};

export function OriginalRow({
  original,
  onEdit,
  onPublish,
  onUnpublish,
  onDuplicate,
  onDelete,
  isSelected = false,
  onSelect,
  index = 0,
}: OriginalRowProps) {
  const { t } = useTranslation();
  const isPublished = original.status === 'published';
  const imageUrl = original.cover_image_url || placeholderImages[original.type];

  return (
    <TableRow 
      className="group cursor-pointer hover:bg-muted/50"
      onClick={() => onEdit(original)}
    >
      {/* Checkbox */}
      <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect?.(original.id, checked as boolean)}
        />
      </TableCell>

      {/* Thumbnail + Title */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
            <img
              src={imageUrl}
              alt={original.title_fr}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate group-hover:text-primary transition-colors">
              {original.title_fr}
            </p>
            {original.excerpt_fr && (
              <p className="text-sm text-muted-foreground truncate max-w-md">
                {original.excerpt_fr}
              </p>
            )}
          </div>
        </div>
      </TableCell>

      {/* Type */}
      <TableCell>
        <TypeBadge type={original.type} />
      </TableCell>

      {/* Author */}
      <TableCell>
        <AuthorAvatar author={original.author} showName size="sm" />
      </TableCell>

      {/* Duration (for podcast/emission) */}
      <TableCell>
        {(original.type === 'podcast' || original.type === 'emission') ? (
          <DurationBadge seconds={original.duration_seconds} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell>
        <StatusBadge status={original.status} />
      </TableCell>

      {/* Date */}
      <TableCell className="text-muted-foreground text-sm">
        {original.published_at 
          ? format(new Date(original.published_at), 'dd/MM/yyyy', { locale: fr })
          : format(new Date(original.created_at), 'dd/MM/yyyy', { locale: fr })
        }
      </TableCell>

      {/* Actions */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
      </TableCell>
    </TableRow>
  );
}
