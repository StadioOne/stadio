import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Globe, GlobeLock, Save, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TypeBadge } from './TypeBadge';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { useOriginalMutations } from '@/hooks/useOriginalMutations';
import type { OriginalWithAuthor } from '@/hooks/useOriginals';
import type { Author } from '@/lib/api-types';
import type { Database } from '@/integrations/supabase/types';

type OriginalType = Database['public']['Enums']['original_type'];

interface OriginalDetailPanelProps {
  original: OriginalWithAuthor | null;
  isOpen: boolean;
  onClose: () => void;
  authors: Author[];
  isCreating?: boolean;
  createType?: OriginalType;
}

interface FormData {
  type: OriginalType;
  title_fr: string;
  title_en: string;
  slug: string;
  excerpt_fr: string;
  excerpt_en: string;
  content_fr: string;
  content_en: string;
  cover_image_url: string;
  media_url: string;
  duration_seconds: number | null;
  author_id: string | null;
  meta_title: string;
  meta_description: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function OriginalDetailPanel({
  original,
  isOpen,
  onClose,
  authors,
  isCreating = false,
  createType = 'article',
}: OriginalDetailPanelProps) {
  const { t } = useTranslation();
  const { createOriginal, updateOriginal, publishOriginal, unpublishOriginal } = useOriginalMutations();

  const [formData, setFormData] = useState<FormData>({
    type: createType,
    title_fr: '',
    title_en: '',
    slug: '',
    excerpt_fr: '',
    excerpt_en: '',
    content_fr: '',
    content_en: '',
    cover_image_url: '',
    media_url: '',
    duration_seconds: null,
    author_id: null,
    meta_title: '',
    meta_description: '',
  });

  const [contentTab, setContentTab] = useState<'fr' | 'en'>('fr');

  // Populate form when original changes
  useEffect(() => {
    if (original) {
      setFormData({
        type: original.type,
        title_fr: original.title_fr || '',
        title_en: original.title_en || '',
        slug: original.slug || '',
        excerpt_fr: original.excerpt_fr || '',
        excerpt_en: original.excerpt_en || '',
        content_fr: original.content_fr || '',
        content_en: original.content_en || '',
        cover_image_url: original.cover_image_url || '',
        media_url: original.media_url || '',
        duration_seconds: original.duration_seconds,
        author_id: original.author_id,
        meta_title: original.meta_title || '',
        meta_description: original.meta_description || '',
      });
    } else if (isCreating) {
      setFormData({
        type: createType,
        title_fr: '',
        title_en: '',
        slug: '',
        excerpt_fr: '',
        excerpt_en: '',
        content_fr: '',
        content_en: '',
        cover_image_url: '',
        media_url: '',
        duration_seconds: null,
        author_id: null,
        meta_title: '',
        meta_description: '',
      });
    }
  }, [original, isCreating, createType]);

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      title_fr: value,
      slug: prev.slug || generateSlug(value),
    }));
  };

  const handleSave = async () => {
    if (isCreating) {
      await createOriginal.mutateAsync({
        type: formData.type,
        title_fr: formData.title_fr,
        title_en: formData.title_en || null,
        slug: formData.slug || null,
        excerpt_fr: formData.excerpt_fr || null,
        excerpt_en: formData.excerpt_en || null,
        content_fr: formData.content_fr || null,
        content_en: formData.content_en || null,
        cover_image_url: formData.cover_image_url || null,
        media_url: formData.media_url || null,
        duration_seconds: formData.duration_seconds,
        author_id: formData.author_id,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        status: 'draft',
      });
      onClose();
    } else if (original) {
      await updateOriginal.mutateAsync({
        id: original.id,
        data: {
          title_fr: formData.title_fr,
          title_en: formData.title_en || null,
          slug: formData.slug || null,
          excerpt_fr: formData.excerpt_fr || null,
          excerpt_en: formData.excerpt_en || null,
          content_fr: formData.content_fr || null,
          content_en: formData.content_en || null,
          cover_image_url: formData.cover_image_url || null,
          media_url: formData.media_url || null,
          duration_seconds: formData.duration_seconds,
          author_id: formData.author_id,
          meta_title: formData.meta_title || null,
          meta_description: formData.meta_description || null,
        },
      });
    }
  };

  const handlePublish = async () => {
    if (original) {
      await publishOriginal.mutateAsync(original.id);
    }
  };

  const handleUnpublish = async () => {
    if (original) {
      await unpublishOriginal.mutateAsync(original.id);
    }
  };

  const isPublished = original?.status === 'published';
  const isSaving = createOriginal.isPending || updateOriginal.isPending;
  const isPublishing = publishOriginal.isPending || unpublishOriginal.isPending;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TypeBadge type={formData.type} />
              {original && <StatusBadge status={original.status} />}
              <SheetTitle className="text-lg">
                {isCreating ? t('originals.createContent') : t('originals.editContent')}
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <section className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                {t('originals.basicInfo')}
              </h3>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title_fr">{t('originals.titleFr')} *</Label>
                  <Input
                    id="title_fr"
                    value={formData.title_fr}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder={t('originals.titlePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title_en">{t('originals.titleEn')}</Label>
                  <Input
                    id="title_en"
                    value={formData.title_en}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title_en: e.target.value }))}
                    placeholder={t('originals.titlePlaceholderEn')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">{t('originals.slug')}</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="mon-article-slug"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">{t('originals.author')}</Label>
                  <Select
                    value={formData.author_id || 'none'}
                    onValueChange={(value) => 
                      setFormData((prev) => ({ ...prev, author_id: value === 'none' ? null : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('originals.selectAuthor')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('originals.noAuthor')}</SelectItem>
                      {authors.map((author) => (
                        <SelectItem key={author.id} value={author.id}>
                          {author.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <Separator />

            {/* Content (bilingual tabs) */}
            <section className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                {t('originals.content')}
              </h3>

              <Tabs value={contentTab} onValueChange={(v) => setContentTab(v as 'fr' | 'en')}>
                <TabsList className="w-full">
                  <TabsTrigger value="fr" className="flex-1">🇫🇷 Français</TabsTrigger>
                  <TabsTrigger value="en" className="flex-1">🇬🇧 English</TabsTrigger>
                </TabsList>

                <TabsContent value="fr" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="excerpt_fr">{t('originals.excerpt')}</Label>
                    <Textarea
                      id="excerpt_fr"
                      value={formData.excerpt_fr}
                      onChange={(e) => setFormData((prev) => ({ ...prev, excerpt_fr: e.target.value }))}
                      placeholder={t('originals.excerptPlaceholder')}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content_fr">{t('originals.contentLabel')}</Label>
                    <Textarea
                      id="content_fr"
                      value={formData.content_fr}
                      onChange={(e) => setFormData((prev) => ({ ...prev, content_fr: e.target.value }))}
                      placeholder={t('originals.contentPlaceholder')}
                      rows={8}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="en" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="excerpt_en">{t('originals.excerpt')}</Label>
                    <Textarea
                      id="excerpt_en"
                      value={formData.excerpt_en}
                      onChange={(e) => setFormData((prev) => ({ ...prev, excerpt_en: e.target.value }))}
                      placeholder={t('originals.excerptPlaceholderEn')}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content_en">{t('originals.contentLabel')}</Label>
                    <Textarea
                      id="content_en"
                      value={formData.content_en}
                      onChange={(e) => setFormData((prev) => ({ ...prev, content_en: e.target.value }))}
                      placeholder={t('originals.contentPlaceholderEn')}
                      rows={8}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </section>

            <Separator />

            {/* Media */}
            <section className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                {t('originals.media')}
              </h3>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cover_image_url">{t('originals.coverImage')}</Label>
                  <Input
                    id="cover_image_url"
                    value={formData.cover_image_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cover_image_url: e.target.value }))}
                    placeholder="https://..."
                  />
                  {formData.cover_image_url && (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mt-2">
                      <img
                        src={formData.cover_image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {(formData.type === 'podcast' || formData.type === 'emission') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="media_url">{t('originals.mediaUrl')}</Label>
                      <Input
                        id="media_url"
                        value={formData.media_url}
                        onChange={(e) => setFormData((prev) => ({ ...prev, media_url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration_seconds">{t('originals.duration')}</Label>
                      <Input
                        id="duration_seconds"
                        type="number"
                        value={formData.duration_seconds || ''}
                        onChange={(e) => 
                          setFormData((prev) => ({ 
                            ...prev, 
                            duration_seconds: e.target.value ? parseInt(e.target.value) : null 
                          }))
                        }
                        placeholder="600"
                      />
                      <p className="text-xs text-muted-foreground">{t('originals.durationHint')}</p>
                    </div>
                  </>
                )}
              </div>
            </section>

            <Separator />

            {/* SEO */}
            <section className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                {t('originals.seoSection')}
              </h3>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meta_title">{t('originals.metaTitle')}</Label>
                  <Input
                    id="meta_title"
                    value={formData.meta_title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value }))}
                    placeholder={t('originals.metaTitlePlaceholder')}
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.meta_title.length}/60
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta_description">{t('originals.metaDescription')}</Label>
                  <Textarea
                    id="meta_description"
                    value={formData.meta_description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
                    placeholder={t('originals.metaDescriptionPlaceholder')}
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.meta_description.length}/160
                  </p>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="border-t px-6 py-4 flex items-center justify-between gap-4">
          <div>
            {original && !isCreating && (
              isPublished ? (
                <Button
                  variant="outline"
                  onClick={handleUnpublish}
                  disabled={isPublishing}
                  className="gap-2"
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GlobeLock className="h-4 w-4" />
                  )}
                  {t('common.unpublish')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="gap-2"
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  {t('common.publish')}
                </Button>
              )
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !formData.title_fr}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isCreating ? t('common.create') : t('common.save')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
