import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useEvents, useEventsStats, type EventsFilters, type EventWithPricing } from '@/hooks/useEvents';
import {
  usePublishEvent,
  useUnpublishEvent,
  useUpdateEvent,
  useUpdateEventPricing,
  useRecomputeEventPricing,
  useToggleLive,
  useTogglePinned,
  useArchiveEvent,
  useDeleteEvent,
} from '@/hooks/useEventMutations';
import { EventFilters, type TimeStatusFilter } from '@/components/events/EventFilters';
import { EventsStats } from '@/components/events/EventsStats';
import { EventCard } from '@/components/events/EventCard';
import { EventRow } from '@/components/events/EventRow';
import { EventsEmptyState } from '@/components/events/EventsEmptyState';
import { EventDetailPanel } from '@/components/events/EventDetailPanel';
import { DeleteEventDialog } from '@/components/events/DeleteEventDialog';
import { getTimeStatus, type TimeStatus } from '@/components/events/TimeStatusBadge';
import type { EventPricingUpdate } from '@/lib/api-types';

const ITEMS_PER_PAGE = 20;

export default function EventsPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<EventsFilters>({
    limit: ITEMS_PER_PAGE,
    offset: 0,
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEvent, setSelectedEvent] = useState<EventWithPricing | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [timeStatus, setTimeStatus] = useState<TimeStatusFilter>('all');
  const [eventToDelete, setEventToDelete] = useState<EventWithPricing | null>(null);

  // Data fetching
  const { data, isLoading, error } = useEvents(filters);
  const { data: stats, isLoading: statsLoading } = useEventsStats();

  // Mutations
  const publishMutation = usePublishEvent();
  const unpublishMutation = useUnpublishEvent();
  const updateMutation = useUpdateEvent();
  const updatePricingMutation = useUpdateEventPricing();
  const recomputePricingMutation = useRecomputeEventPricing();
  const toggleLiveMutation = useToggleLive();
  const togglePinnedMutation = useTogglePinned();
  const archiveMutation = useArchiveEvent();
  const deleteMutation = useDeleteEvent();

  // Filter events by time status (client-side)
  const filteredEvents = useMemo(() => {
    if (!data?.data || timeStatus === 'all') return data?.data || [];
    
    return data.data.filter((event) => {
      if (!event.event_date) return false;
      const eventTimeStatus = getTimeStatus(event.event_date, event.is_live || false);
      return eventTimeStatus === timeStatus;
    });
  }, [data?.data, timeStatus]);

  // Handlers
  const handleFiltersChange = useCallback((newFilters: EventsFilters) => {
    setFilters(newFilters);
  }, []);

  const handleTimeStatusChange = useCallback((status: TimeStatusFilter) => {
    setTimeStatus(status);
  }, []);

  const handleSelectEvent = useCallback((event: EventWithPricing) => {
    setSelectedEvent(event);
  }, []);

  const handleToggleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handlePublish = useCallback((id: string) => {
    publishMutation.mutate(id);
  }, [publishMutation]);

  const handleUnpublish = useCallback((id: string) => {
    unpublishMutation.mutate(id);
  }, [unpublishMutation]);

  const handleToggleLive = useCallback((id: string, isLive: boolean) => {
    toggleLiveMutation.mutate({ id, isLive });
  }, [toggleLiveMutation]);

  const handleTogglePinned = useCallback((id: string, isPinned: boolean) => {
    togglePinnedMutation.mutate({ id, isPinned });
  }, [togglePinnedMutation]);

  const handleArchive = useCallback((id: string) => {
    archiveMutation.mutate(id);
  }, [archiveMutation]);

  const handleDeleteRequest = useCallback((id: string) => {
    const event = data?.data.find((e) => e.id === id);
    if (event) {
      setEventToDelete(event);
    }
  }, [data?.data]);

  const handleConfirmDelete = useCallback(() => {
    if (eventToDelete) {
      deleteMutation.mutate(eventToDelete.id, {
        onSuccess: () => {
          setEventToDelete(null);
          if (selectedEvent?.id === eventToDelete.id) {
            setSelectedEvent(null);
          }
        },
      });
    }
  }, [eventToDelete, deleteMutation, selectedEvent]);

  const handleSaveEvent = useCallback((id: string, eventData: any) => {
    updateMutation.mutate({ id, data: eventData });
  }, [updateMutation]);

  const handleUpdatePricing = useCallback((eventId: string, pricingData: EventPricingUpdate) => {
    updatePricingMutation.mutate({ eventId, data: pricingData });
  }, [updatePricingMutation]);

  const handleRecomputePricing = useCallback((eventId: string) => {
    recomputePricingMutation.mutate(eventId);
  }, [recomputePricingMutation]);

  const handleClearFilters = useCallback(() => {
    setFilters({ limit: ITEMS_PER_PAGE, offset: 0 });
    setTimeStatus('all');
  }, []);

  // Pagination
  const currentPage = Math.floor((filters.offset || 0) / ITEMS_PER_PAGE) + 1;
  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({
      ...prev,
      offset: (page - 1) * ITEMS_PER_PAGE,
    }));
  };

  const hasActiveFilters = !!(
    filters.status ||
    filters.sport ||
    filters.league ||
    filters.isLive ||
    filters.isPinned ||
    filters.search ||
    timeStatus !== 'all'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            {t('events.title')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('events.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats */}
      <EventsStats
        total={stats?.total || 0}
        published={stats?.published || 0}
        live={stats?.live || 0}
        draft={stats?.draft || 0}
        archived={stats?.archived || 0}
        upcoming={stats?.upcoming || 0}
        ongoing={stats?.ongoing || 0}
        finished={stats?.finished || 0}
        isLoading={statsLoading}
      />

      {/* Filters */}
      <EventFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sports={data?.sports || []}
        leagues={data?.leagues || []}
        timeStatus={timeStatus}
        onTimeStatusChange={handleTimeStatusChange}
      />

      {/* Content */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-64 rounded-lg' : 'h-16 rounded-lg'} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">{t('common.errorOccurred')}</p>
        </div>
      ) : !filteredEvents.length ? (
        <EventsEmptyState
          hasFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />
      ) : viewMode === 'grid' ? (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filteredEvents.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              index={index}
              onSelect={handleSelectEvent}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onToggleLive={handleToggleLive}
              onTogglePinned={handleTogglePinned}
              onArchive={handleArchive}
              onDelete={handleDeleteRequest}
            />
          ))}
        </motion.div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10"></TableHead>
                <TableHead>Événement</TableHead>
                <TableHead>Sport</TableHead>
                <TableHead>Ligue</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event, index) => (
                <EventRow
                  key={event.id}
                  event={event}
                  index={index}
                  isSelected={selectedIds.has(event.id)}
                  onSelect={handleSelectEvent}
                  onToggleSelect={handleToggleSelect}
                  onPublish={handlePublish}
                  onUnpublish={handleUnpublish}
                  onToggleLive={handleToggleLive}
                  onTogglePinned={handleTogglePinned}
                  onArchive={handleArchive}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {data && data.total > ITEMS_PER_PAGE && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const page = i + 1;
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={page === currentPage}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Detail Panel */}
      <EventDetailPanel
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        onSave={handleSaveEvent}
        onUpdatePricing={handleUpdatePricing}
        onRecomputePricing={handleRecomputePricing}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onArchive={handleArchive}
        onDelete={handleDeleteRequest}
        isSaving={updateMutation.isPending || updatePricingMutation.isPending}
        isRecomputing={recomputePricingMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteEventDialog
        open={!!eventToDelete}
        onOpenChange={(open) => !open && setEventToDelete(null)}
        eventTitle={eventToDelete?.override_title || eventToDelete?.api_title || 'Sans titre'}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
