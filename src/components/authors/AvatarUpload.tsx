import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Upload, X, Crop as CropIcon, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  authorName: string;
  onAvatarChange: (url: string) => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function AvatarUpload({
  currentAvatarUrl,
  authorName,
  onAvatarChange,
}: AvatarUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('authors.avatarInvalidType'));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('authors.avatarTooLarge'));
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsDialogOpen(true);

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [t]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const getCroppedImg = useCallback(async (
    image: HTMLImageElement,
    crop: Crop
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    const pixelCrop = {
      x: (crop.x / 100) * image.width * scaleX,
      y: (crop.y / 100) * image.height * scaleY,
      width: (crop.width / 100) * image.width * scaleX,
      height: (crop.height / 100) * image.height * scaleY,
    };

    // Target size for avatar (256x256)
    const targetSize = 256;
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      targetSize,
      targetSize
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas is empty'));
        },
        'image/jpeg',
        0.9
      );
    });
  }, []);

  const handleUpload = useCallback(async () => {
    if (!imgRef.current || !crop || !selectedFile) return;

    setIsUploading(true);
    try {
      // Get cropped image
      const croppedBlob = await getCroppedImg(imgRef.current, crop);
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `author-${timestamp}.jpg`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filename, croppedBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      onAvatarChange(urlData.publicUrl);
      toast.success(t('authors.avatarUploadSuccess'));
      
      // Cleanup
      setIsDialogOpen(false);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('authors.avatarUploadError'));
    } finally {
      setIsUploading(false);
    }
  }, [crop, selectedFile, getCroppedImg, onAvatarChange, previewUrl, t]);

  const handleCancel = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const handleRemoveAvatar = useCallback(() => {
    onAvatarChange('');
  }, [onAvatarChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20 border-2 border-border">
          <AvatarImage src={currentAvatarUrl} alt={authorName} />
          <AvatarFallback className="text-lg bg-primary/10 text-primary">
            {getInitials(authorName || 'A')}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('authors.uploadAvatar')}
          </Button>
          {currentAvatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveAvatar}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4 mr-2" />
              {t('authors.removeAvatar')}
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('authors.avatarHint')}
      </p>

      {/* Crop Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CropIcon className="h-5 w-5" />
              {t('authors.cropAvatar')}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-center py-4">
            {previewUrl && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                aspect={1}
                circularCrop
                className="max-h-[400px]"
              >
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-h-[400px] w-auto"
                />
              </ReactCrop>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isUploading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.uploading')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('common.confirm')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
