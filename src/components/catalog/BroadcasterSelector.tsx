import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Radio, Sparkles, X, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBroadcasterSuggestions, useAllBroadcasters, type BroadcasterSuggestion } from '@/hooks/useBroadcasterSuggestions';

interface BroadcasterValue {
  name: string;
  logo_url: string | null;
}

interface BroadcasterSelectorProps {
  value: BroadcasterValue | null;
  onChange: (broadcaster: BroadcasterValue | null) => void;
  sportId?: string | null;
  leagueId?: string | null;
  eventDate?: string | null;
}

const scopeLabels: Record<string, string> = {
  sport: 'Sport',
  competition: 'Compétition',
  season: 'Saison',
};

export function BroadcasterSelector({
  value,
  onChange,
  sportId,
  leagueId,
  eventDate,
}: BroadcasterSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: suggestions = [], isLoading: suggestionsLoading } = useBroadcasterSuggestions({
    sportId: sportId || null,
    leagueId: leagueId || null,
    eventDate: eventDate || null,
  });

  const { data: allBroadcasters = [], isLoading: allLoading } = useAllBroadcasters(search);

  // Filter out broadcasters that are already in suggestions
  const suggestionIds = useMemo(
    () => new Set(suggestions.map((s) => s.broadcaster.id)),
    [suggestions]
  );

  const filteredBroadcasters = useMemo(
    () => allBroadcasters.filter((b) => !suggestionIds.has(b.id)),
    [allBroadcasters, suggestionIds]
  );

  const handleSelect = (broadcaster: { name: string; logo_url: string | null }) => {
    onChange(broadcaster);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10 py-2"
          >
            {value ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={value.logo_url || undefined} alt={value.name} />
                  <AvatarFallback className="text-xs">
                    {value.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{value.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground flex items-center gap-2">
                <Radio className="h-4 w-4" />
                Sélectionner un diffuseur...
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Rechercher un diffuseur..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {suggestionsLoading || allLoading ? (
                  <span className="text-muted-foreground">Chargement...</span>
                ) : (
                  <span className="text-muted-foreground">Aucun diffuseur trouvé</span>
                )}
              </CommandEmpty>

              {/* Suggestions automatiques */}
              {suggestions.length > 0 && !search && (
                <CommandGroup heading={
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-warning" />
                    Suggestions (basées sur les contrats)
                  </span>
                }>
                  {suggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion.packageId}
                      value={suggestion.broadcaster.name}
                      onSelect={() => handleSelect({
                        name: suggestion.broadcaster.name,
                        logo_url: suggestion.broadcaster.logo_url,
                      })}
                      className="flex items-center gap-3 py-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={suggestion.broadcaster.logo_url || undefined}
                          alt={suggestion.broadcaster.name}
                        />
                        <AvatarFallback className="text-xs">
                          {suggestion.broadcaster.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {suggestion.broadcaster.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {suggestion.packageName}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {scopeLabels[suggestion.matchType] || suggestion.matchType}
                      </Badge>
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          value?.name === suggestion.broadcaster.name
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {suggestions.length > 0 && filteredBroadcasters.length > 0 && !search && (
                <CommandSeparator />
              )}

              {/* Tous les diffuseurs */}
              {(filteredBroadcasters.length > 0 || search) && (
                <CommandGroup heading={
                  <span className="flex items-center gap-2">
                    <Building2 className="h-3 w-3" />
                    {search ? 'Résultats de recherche' : 'Tous les diffuseurs'}
                  </span>
                }>
                  {filteredBroadcasters.map((broadcaster) => (
                    <CommandItem
                      key={broadcaster.id}
                      value={broadcaster.name}
                      onSelect={() => handleSelect({
                        name: broadcaster.name,
                        logo_url: broadcaster.logo_url,
                      })}
                      className="flex items-center gap-3 py-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={broadcaster.logo_url || undefined}
                          alt={broadcaster.name}
                        />
                        <AvatarFallback className="text-xs">
                          {broadcaster.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{broadcaster.name}</span>
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          value?.name === broadcaster.name ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected broadcaster with clear button */}
      {value && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
          <Avatar className="h-8 w-8">
            <AvatarImage src={value.logo_url || undefined} alt={value.name} />
            <AvatarFallback className="text-xs">
              {value.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{value.name}</div>
            {value.logo_url && (
              <div className="text-xs text-muted-foreground truncate">{value.logo_url}</div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Retirer le diffuseur</span>
          </Button>
        </div>
      )}
    </div>
  );
}
