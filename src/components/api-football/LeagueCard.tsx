import React from "react";
import { Trophy, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface League {
  id: string;
  external_id: string;
  name: string;
  name_fr: string | null;
  country: string | null;
  country_code: string | null;
  logo_url: string | null;
  type: string | null;
  season: number | null;
  is_active: boolean;
  is_synced: boolean;
  updated_at: string;
}

interface LeagueCardProps {
  league: League;
  onToggleSync: (id: string, isSynced: boolean) => void;
  onClick: (league: League) => void;
  disabled?: boolean;
}

export const LeagueCard = React.forwardRef<HTMLDivElement, LeagueCardProps>(
  ({ league, onToggleSync, onClick, disabled }, ref) => {
    return (
      <div
        ref={ref}
        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
        onClick={() => onClick(league)}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Checkbox
            checked={league.is_synced}
            disabled={disabled}
            onCheckedChange={(checked) => {
              onToggleSync(league.id, !!checked);
            }}
          />
        </div>
        {league.logo_url ? (
          <img
            src={league.logo_url}
            alt={league.name}
            className="h-10 w-10 object-contain"
          />
        ) : (
          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
            <Trophy className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{league.name}</p>
          <p className="text-xs text-muted-foreground">
            {league.country} • {league.season}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {league.is_synced ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    );
  }
);

LeagueCard.displayName = "LeagueCard";
