import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface Sport {
  id: string;
  name: string;
  name_fr: string | null;
  slug: string;
  icon: string | null;
  api_base_url: string | null;
  is_configured: boolean | null;
  is_active: boolean | null;
  leaguesCount?: number;
}

interface SportSelectorProps {
  sports: Sport[];
  selectedSport: Sport | null;
  onSelectSport: (sport: Sport) => void;
  isLoading?: boolean;
}

export function SportSelector({ 
  sports, 
  selectedSport, 
  onSelectSport,
  isLoading 
}: SportSelectorProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 h-24">
              <div className="h-full bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {sports.map((sport) => {
        const isSelected = selectedSport?.id === sport.id;
        const isConfigured = sport.is_configured;

        return (
          <Card
            key={sport.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              isSelected && "ring-2 ring-primary",
              !sport.is_active && "opacity-50"
            )}
            onClick={() => onSelectSport(sport)}
          >
            <CardContent className="p-4 text-center relative">
              {isConfigured && (
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 right-2 h-5 w-5 p-0 flex items-center justify-center"
                >
                  <Check className="h-3 w-3" />
                </Badge>
              )}
              
              <div className="text-3xl mb-2">{sport.icon || '🏆'}</div>
              <div className="font-medium text-sm truncate">
                {sport.name_fr || sport.name}
              </div>
              
              {sport.leaguesCount !== undefined && sport.leaguesCount > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {sport.leaguesCount} ligues
                </div>
              )}
              
              {!isConfigured && (
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                  <Settings className="h-3 w-3" />
                  À configurer
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
