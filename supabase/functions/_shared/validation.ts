import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// UUID validation schema
export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

// ============================================
// Analytics Ingestion Schemas
// ============================================

// Event types for analytics
export const analyticsEventTypeSchema = z.enum([
  'view_fixture',
  'purchase_fixture',
  'view_content',
  'like_content',
]);
export type AnalyticsEventType = z.infer<typeof analyticsEventTypeSchema>;

// Source platforms
export const analyticsSourceSchema = z.enum(['mobile', 'web', 'admin', 'backend']);
export type AnalyticsSource = z.infer<typeof analyticsSourceSchema>;

// Ingest event payload schema with strict validation
export const ingestEventSchema = z.object({
  occurred_at: z.string().datetime({ message: 'occurred_at must be ISO 8601 datetime' }).optional(),
  event_type: analyticsEventTypeSchema,
  source: analyticsSourceSchema,
  anon_id: z.string().max(255, 'anon_id must be 255 characters or less').optional(),
  user_id: z.string().uuid({ message: 'user_id must be valid UUID' }).optional(),
  fixture_id: z.string().uuid({ message: 'fixture_id must be valid UUID' }).optional(),
  content_id: z.string().uuid({ message: 'content_id must be valid UUID' }).optional(),
  country: z.string().length(2, 'country must be 2-letter ISO code').optional(),
  city: z.string().max(100, 'city must be 100 characters or less').optional(),
  metadata: z.record(z.unknown()).optional(),
}).strict({ message: 'Unknown fields are not allowed' })
  .refine(
    (data) => {
      // fixture_id required if event_type contains 'fixture'
      if (data.event_type.includes('fixture')) {
        return !!data.fixture_id;
      }
      return true;
    },
    { message: 'fixture_id is required for fixture events', path: ['fixture_id'] }
  )
  .refine(
    (data) => {
      // content_id required if event_type contains 'content'
      if (data.event_type.includes('content')) {
        return !!data.content_id;
      }
      return true;
    },
    { message: 'content_id is required for content events', path: ['content_id'] }
  );

export type IngestEventPayload = z.infer<typeof ingestEventSchema>;

// ============================================
// Existing Schemas
// ============================================

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
