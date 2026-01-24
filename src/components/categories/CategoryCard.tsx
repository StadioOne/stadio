import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown,
  Calendar,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CategoryWithEventCount } from '@/hooks/useCategories';

interface CategoryCardProps {
  category: CategoryWithEventCount;
  onEdit: (category: CategoryWithEventCount) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
}

export function CategoryCard({ 
  category, 
  onEdit, 
  onDelete, 
  onPublish, 
  onUnpublish 
}: CategoryCardProps) {
  const { t, i18n } = useTranslation();

  const name = i18n.language === 'fr' ? category.name_fr : (category.name_en || category.name_fr);
  const description = i18n.language === 'fr' 
    ? category.description_fr 
    : (category.description_en || category.description_fr);

  const statusColors = {
    draft: 'bg-muted text-muted-foreground',
    published: 'bg-success/10 text-success',
    archived: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md border",
      !category.is_visible && "opacity-60"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-md bg-muted cursor-move">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{name}</h3>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", statusColors[category.status])}
                >
                  {t(`status.${category.status}`)}
                </Badge>
                {!category.is_visible && (
                  <Badge variant="outline" className="text-xs">
                    <EyeOff className="h-3 w-3 mr-1" />
                    {t('categories.hidden')}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                /{category.slug}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(category)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {category.status === 'draft' ? (
                <DropdownMenuItem onClick={() => onPublish(category.id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t('common.publish')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onUnpublish(category.id)}>
                  <EyeOff className="h-4 w-4 mr-2" />
                  {t('common.unpublish')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(category.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {description}
          </p>
        )}
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{category.event_count} {t('categories.events')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ArrowUp className="h-4 w-4" />
            <span>{t('categories.order')}: {category.display_order}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
