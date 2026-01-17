import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from 'lucide-react';
import type { CountryStats } from '@/lib/api-types';

interface CountryTableProps {
  countries: CountryStats[];
  showRevenue?: boolean;
  title?: string;
}

// Map country codes to flag emojis
function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode === 'unknown') return '🌍';
  
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return '🌍';
  
  const offset = 127397;
  const flag = String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset
  );
  return flag;
}

export function CountryTable({ countries, showRevenue = true, title = 'Top pays' }: CountryTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pays</TableHead>
              <TableHead className="text-right">Vues</TableHead>
              <TableHead className="text-right">Achats</TableHead>
              {showRevenue && <TableHead className="text-right">CA</TableHead>}
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {countries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showRevenue ? 5 : 4} className="text-center text-muted-foreground">
                  Aucune donnée disponible
                </TableCell>
              </TableRow>
            ) : (
              countries.map((country) => (
                <TableRow key={country.country}>
                  <TableCell className="font-medium">
                    <span className="mr-2">{getCountryFlag(country.country)}</span>
                    {country.country.toUpperCase()}
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(country.views)}</TableCell>
                  <TableCell className="text-right">{formatNumber(country.purchases)}</TableCell>
                  {showRevenue && (
                    <TableCell className="text-right font-medium">
                      {formatCurrency(country.revenue)}
                    </TableCell>
                  )}
                  <TableCell className="text-right text-muted-foreground">
                    {country.percentage.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
