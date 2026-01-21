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

// Analytics types
export interface AnalyticsOverview {
  totalRevenue: number | null;
  totalPurchases: number;
  totalViews: number;
  totalLikes: number;
  topCountries: CountryStats[];
  topFixtures: FixtureStats[];
  topContents: ContentStats[];
  period: { from: string; to: string };
}

export interface CountryStats {
  country: string;
  views: number;
  purchases: number;
  revenue: number;
  percentage: number;
}

export interface FixtureStats {
  fixtureId: string;
  title: string;
  sport: string;
  league?: string | null;
  eventDate?: string | null;
  views: number;
  purchases: number;
  revenue: number;
  pricingTier?: PricingTier | null;
  topCountries: { country: string; revenue: number }[];
}

export interface ContentStats {
  contentId: string;
  title: string;
  type: string;
  views: number;
  likes: number;
  topCountries: { country: string; views: number }[];
}

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  country?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface GeoConcentration {
  top3Percentage: number;
  top5Percentage: number;
  top10Percentage: number;
}

export interface GeoAnalytics {
  byCountry: CountryStats[];
  concentration: GeoConcentration;
  totalCountries: number;
}

export interface FixturesAnalyticsResponse {
  fixtures: FixtureStats[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface OriginalsAnalyticsResponse {
  originals: ContentStats[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AggregationResult {
  date: string;
  fixturesProcessed: number;
  contentsProcessed: number;
  totalRowsUpserted: number;
  durationMs: number;
}
