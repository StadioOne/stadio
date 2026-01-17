import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// UUID validation schema
export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

// Pricing tier enum matching database
export const pricingTierSchema = z.enum(['bronze', 'silver', 'gold']);
export type PricingTier = z.infer<typeof pricingTierSchema>;

// Publish event request schema
export const publishRequestSchema = z.object({
  eventId: uuidSchema,
});
export type PublishRequest = z.infer<typeof publishRequestSchema>;

// Unpublish event request schema
export const unpublishRequestSchema = z.object({
  eventId: uuidSchema,
});
export type UnpublishRequest = z.infer<typeof unpublishRequestSchema>;

// Pricing recompute request schema
export const pricingRecomputeSchema = z.object({
  eventId: uuidSchema.optional(),
  batch: z.boolean().optional(),
  manualPrice: z.number().min(0.01).max(999.99).optional(),
  manualTier: pricingTierSchema.optional(),
  isManualOverride: z.boolean().optional(),
}).refine(
  (data) => data.eventId || data.batch,
  { message: 'Either eventId or batch must be provided' }
);
export type PricingRecomputeRequest = z.infer<typeof pricingRecomputeSchema>;

// Generic payload validation helper
export function validatePayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.errors[0];
    const path = firstError.path.length > 0 ? `${firstError.path.join('.')}: ` : '';
    return { success: false, error: `${path}${firstError.message}` };
  }
  return { success: true, data: result.data };
}
