import type { Database } from '@/integrations/supabase/types';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

// Dashboard KPIs
export interface DashboardKPIs {
  totalEvents: number;
  publishedEvents: number;
  liveEvents: number;
  totalOriginals: number;
  publishedOriginals: number;
  totalAuthors: number;
  totalCategories: number;
  recentWorkflows: number;
}

// Event types
export type Event = Database['public']['Tables']['events']['Row'];
export type EventInsert = Database['public']['Tables']['events']['Insert'];
export type EventUpdate = Database['public']['Tables']['events']['Update'];

// Pricing types
export type EventPricing = Database['public']['Tables']['event_pricing']['Row'];
export type PricingTier = Database['public']['Enums']['pricing_tier'];

export interface PricingRecomputeParams {
  eventId: string;
  manualPrice?: number;
  manualTier?: PricingTier;
  isManualOverride?: boolean;
}

// Original content types
export type Original = Database['public']['Tables']['originals']['Row'];
export type OriginalType = Database['public']['Enums']['original_type'];

// Category types
export type Category = Database['public']['Tables']['categories']['Row'];

export interface ListsRebuildResult {
  categoriesProcessed: number;
  results: Array<{
    categoryId: string;
    name: string;
    eventsMatched: number;
  }>;
}

// Workflow types
export type WorkflowRun = Database['public']['Tables']['workflow_runs']['Row'];
export type WorkflowStatus = Database['public']['Enums']['workflow_status'];

export type WorkflowType = 
  | 'import_fixtures'
  | 'recompute_pricing'
  | 'rebuild_editorial_lists'
  | 'refresh_notoriety'
  | 'send_notifications';

export interface WorkflowTriggerResult {
  workflowRunId: string;
  workflow: WorkflowType;
  status: string;
  message: string;
}

// Audit types
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];

export interface AuditFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Author types
export type Author = Database['public']['Tables']['authors']['Row'];

// Profile types
export type Profile = Database['public']['Tables']['profiles']['Row'];

// User role types
export type UserRole = Database['public']['Tables']['user_roles']['Row'];
export type AdminRole = Database['public']['Enums']['admin_role'];
