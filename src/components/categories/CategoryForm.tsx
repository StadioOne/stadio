import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Category, CategoryInput } from '@/hooks/useCategories';

const categorySchema = z.object({
  name_fr: z.string().min(1, 'Nom FR requis'),
  name_en: z.string().min(1, 'Nom EN requis'),
  description_fr: z.string().optional(),
  description_en: z.string().optional(),
  slug: z.string().min(1, 'Slug requis').regex(/^[a-z0-9-]+$/, 'Slug invalide (lettres minuscules, chiffres, tirets)'),
  display_order: z.coerce.number().int().min(0),
  is_visible: z.boolean(),
  status: z.enum(['draft', 'published', 'archived']),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSubmit: (data: CategoryInput) => void;
  isLoading?: boolean;
}

export function CategoryForm({
  open,
  onOpenChange,
  category,
  onSubmit,
  isLoading,
}: CategoryFormProps) {
  const { t } = useTranslation();
  const isEditing = !!category;

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name_fr: '',
      name_en: '',
      description_fr: '',
      description_en: '',
      slug: '',
      display_order: 0,
      is_visible: true,
      status: 'draft',
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name_fr: category.name_fr,
        name_en: category.name_en,
        description_fr: category.description_fr || '',
        description_en: category.description_en || '',
        slug: category.slug,
        display_order: category.display_order,
        is_visible: category.is_visible,
        status: category.status,
      });
    } else {
      form.reset({
        name_fr: '',
        name_en: '',
        description_fr: '',
        description_en: '',
        slug: '',
        display_order: 0,
        is_visible: true,
        status: 'draft',
      });
    }
  }, [category, form]);

  const handleSubmit = (data: CategoryFormData) => {
    onSubmit({
      name_fr: data.name_fr,
      name_en: data.name_en,
      slug: data.slug,
      display_order: data.display_order,
      is_visible: data.is_visible,
      status: data.status,
      description_fr: data.description_fr || undefined,
      description_en: data.description_en || undefined,
    });
  };

  // Auto-generate slug from French name
  const generateSlug = () => {
    const nameFr = form.getValues('name_fr');
    if (nameFr) {
      const slug = nameFr
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      form.setValue('slug', slug);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? t('categories.edit') : t('categories.create')}
          </SheetTitle>
          <SheetDescription>
            {isEditing 
              ? t('categories.editDescription') 
              : t('categories.createDescription')
            }
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6">
            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name_fr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom (FR) *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        onBlur={(e) => {
                          field.onBlur();
                          if (!isEditing && !form.getValues('slug')) {
                            generateSlug();
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom (EN) *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Slug */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug *</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input {...field} className="font-mono" />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={generateSlug}
                      >
                        Générer
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    URL: /categories/{field.value || 'slug'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descriptions */}
            <FormField
              control={form.control}
              name="description_fr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (FR)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (EN)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Settings row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordre d'affichage</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">{t('status.draft')}</SelectItem>
                        <SelectItem value="published">{t('status.published')}</SelectItem>
                        <SelectItem value="archived">{t('status.archived')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Visibility toggle */}
            <FormField
              control={form.control}
              name="is_visible"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Visible</FormLabel>
                    <FormDescription>
                      Afficher cette catégorie dans l'application
                    </FormDescription>
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

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? t('common.save') : t('common.create')}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
