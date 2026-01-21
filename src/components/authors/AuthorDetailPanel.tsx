import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { User, Globe, Twitter, Linkedin, FileText, ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthorMutations } from '@/hooks/useAuthorMutations';
import { useAuthorContents } from '@/hooks/useAuthors';
import type { AuthorWithStats } from '@/hooks/useAuthors';

const authorSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  avatar_url: z.string().url('URL invalide').optional().or(z.literal('')),
  bio_fr: z.string().optional(),
  bio_en: z.string().optional(),
  social_twitter: z.string().optional(),
  social_linkedin: z.string().optional(),
  is_active: z.boolean(),
});

type AuthorFormData = z.infer<typeof authorSchema>;

interface AuthorDetailPanelProps {
  author: AuthorWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  isCreating?: boolean;
}

export function AuthorDetailPanel({
  author,
  isOpen,
  onClose,
  isCreating = false,
}: AuthorDetailPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createAuthor, updateAuthor, deleteAuthor } = useAuthorMutations();
  const { data: contents } = useAuthorContents(author?.id ?? null);

  const form = useForm<AuthorFormData>({
    resolver: zodResolver(authorSchema),
    defaultValues: {
      name: '',
      avatar_url: '',
      bio_fr: '',
      bio_en: '',
      social_twitter: '',
      social_linkedin: '',
      is_active: true,
    },
  });

  // Reset form when author changes
  useEffect(() => {
    if (author && !isCreating) {
      form.reset({
        name: author.name,
        avatar_url: author.avatar_url || '',
        bio_fr: author.bio_fr || '',
        bio_en: author.bio_en || '',
        social_twitter: author.social_twitter || '',
        social_linkedin: author.social_linkedin || '',
        is_active: author.is_active ?? true,
      });
    } else if (isCreating) {
      form.reset({
        name: '',
        avatar_url: '',
        bio_fr: '',
        bio_en: '',
        social_twitter: '',
        social_linkedin: '',
        is_active: true,
      });
    }
  }, [author, isCreating, form]);

  const onSubmit = async (data: AuthorFormData) => {
    try {
      if (isCreating) {
        await createAuthor.mutateAsync({
          name: data.name,
          avatar_url: data.avatar_url || null,
          bio_fr: data.bio_fr || null,
          bio_en: data.bio_en || null,
          social_twitter: data.social_twitter || null,
          social_linkedin: data.social_linkedin || null,
          is_active: data.is_active,
        });
      } else if (author) {
        await updateAuthor.mutateAsync({
          id: author.id,
          data: {
            name: data.name,
            avatar_url: data.avatar_url || null,
            bio_fr: data.bio_fr || null,
            bio_en: data.bio_en || null,
            social_twitter: data.social_twitter || null,
            social_linkedin: data.social_linkedin || null,
            is_active: data.is_active,
          },
        });
      }
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!author) return;
    try {
      await deleteAuthor.mutateAsync(author.id);
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleViewContents = () => {
    if (author) {
      navigate(`/originals?authorId=${author.id}`);
    }
  };

  const isSubmitting = createAuthor.isPending || updateAuthor.isPending;
  const canDelete = author && (author.contentsCount === 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isCreating ? t('authors.createAuthor') : t('authors.editAuthor')}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-10rem)] mt-6 pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Identity Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t('authors.identity')}
                </h3>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('authors.name')} *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('authors.namePlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avatar_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        {t('authors.avatarUrl')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('authors.avatarPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>{t('authors.active')}</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Biography Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t('authors.biography')}
                </h3>

                <FormField
                  control={form.control}
                  name="bio_fr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('authors.bioFr')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('authors.bioPlaceholder')}
                          className="min-h-24 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('authors.bioEn')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('authors.bioPlaceholderEn')}
                          className="min-h-24 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Social Networks Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t('authors.socialNetworks')}
                </h3>

                <FormField
                  control={form.control}
                  name="social_twitter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" />
                        {t('authors.twitter')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('authors.twitterPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="social_linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4" />
                        {t('authors.linkedin')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('authors.linkedinPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Associated Contents (read-only) */}
              {!isCreating && contents && contents.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        {t('authors.associatedContents')}
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleViewContents}
                      >
                        {t('authors.viewContents')}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {contents.slice(0, 5).map((content) => (
                        <div
                          key={content.id}
                          className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 truncate">{content.title_fr}</span>
                          <Badge variant="outline" className="text-xs">
                            {content.type}
                          </Badge>
                        </div>
                      ))}
                      {contents.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{contents.length - 5} {t('common.more')}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                {!isCreating && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={!canDelete || deleteAuthor.isPending}
                  >
                    {t('common.delete')}
                  </Button>
                )}
                <div className="flex-1" />
                <Button type="button" variant="outline" onClick={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
