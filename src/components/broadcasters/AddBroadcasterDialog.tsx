import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBroadcasterMutations } from '@/hooks/useBroadcasterMutations';
import type { BroadcasterStatus } from '@/hooks/useBroadcasters';

const formSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  legal_name: z.string().optional(),
  contact_email: z.string().email('Email invalide').optional().or(z.literal('')),
  logo_url: z.string().url('URL invalide').optional().or(z.literal('')),
  status: z.enum(['active', 'suspended', 'pending']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddBroadcasterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBroadcasterDialog({ open, onOpenChange }: AddBroadcasterDialogProps) {
  const { createBroadcaster } = useBroadcasterMutations();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      legal_name: '',
      contact_email: '',
      logo_url: '',
      status: 'pending',
      notes: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    await createBroadcaster.mutateAsync({
      name: values.name,
      legal_name: values.legal_name || undefined,
      contact_email: values.contact_email || undefined,
      logo_url: values.logo_url || undefined,
      status: values.status as BroadcasterStatus,
      notes: values.notes || undefined,
    });
    
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouveau diffuseur</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau diffuseur pour gérer ses droits de diffusion.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom commercial *</FormLabel>
                  <FormControl>
                    <Input placeholder="Canal+, DAZN..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="legal_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raison sociale</FormLabel>
                  <FormControl>
                    <Input placeholder="Groupe Canal Plus SA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de contact</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@diffuseur.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL du logo</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
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
                  <FormLabel>Statut initial</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="suspended">Suspendu</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes internes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes sur ce diffuseur..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createBroadcaster.isPending}>
                {createBroadcaster.isPending ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
