import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Film } from 'lucide-react';

export default function OriginalsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('nav.originals')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            {t('nav.originals')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Gestion des contenus Stadio Originals (articles, podcasts, émissions). Cette page permettra de publier et gérer le contenu éditorial.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
