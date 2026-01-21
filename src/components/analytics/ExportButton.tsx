import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ExportButtonProps<T> {
  data: T[];
  columns: { key: keyof T; label: string; hidden?: boolean }[];
  filename: string;
  disabled?: boolean;
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
  disabled = false,
}: ExportButtonProps<T>) {
  const { t } = useTranslation();

  const handleExport = () => {
    // Filter visible columns
    const visibleColumns = columns.filter((col) => !col.hidden);

    // Create CSV header
    const header = visibleColumns.map((col) => col.label).join(',');

    // Create CSV rows
    const rows = data.map((row) =>
      visibleColumns
        .map((col) => {
          const value = row[col.key];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        })
        .join(',')
    );

    // Combine header and rows
    const csv = [header, ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
    >
      <Download className="h-4 w-4 mr-2" />
      {t('common.export')}
    </Button>
  );
}
