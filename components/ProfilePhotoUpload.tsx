'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Camera, User, Edit2, X, Upload } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

interface ProfilePhotoUploadProps {
  participantId: string;
  currentPhotoUrl?: string | null;
  onPhotoUpdate: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function ProfilePhotoUpload({
  participantId,
  currentPhotoUrl,
  onPhotoUpdate,
  size = 'md'
}: ProfilePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5MB');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      console.log('Starting upload for user:', user.id);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      console.log('Uploading to storage:', fileName);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      // Update participant record
      const { data: updateData, error: updateError } = await supabase
        .from('participants')
        .update({ profile_photo_url: publicUrl })
        .eq('id', participantId)
        .select();

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }

      console.log('Database updated:', updateData);

      onPhotoUpdate(publicUrl);
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      setUploadError(error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-4 border-[#4FBACA] shadow-lg relative bg-gradient-to-br from-[#4FBACA] to-[#3AA8BC]`}>
          {currentPhotoUrl ? (
            <img
              src={currentPhotoUrl}
              alt="Profile"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Failed to load image:', currentPhotoUrl);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className={`${iconSizes[size]} text-white`} />
            </div>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
          className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 bg-[#4FBACA] hover:bg-[#3AA8BC] shadow-lg"
        >
          {isEditing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
        </Button>
      </div>

      {isEditing && (
        <div className="flex flex-col gap-3 w-full max-w-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id={`photo-upload-${participantId}`}
          />
          <Button
            type="button"
            disabled={uploading}
            className="w-full bg-[#4FBACA] hover:bg-[#3AA8BC]"
            onClick={() => {
              console.log('Button clicked');
              fileInputRef.current?.click();
            }}
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Choose Photo
              </>
            )}
          </Button>
          {uploadError && (
            <p className="text-xs text-red-600 text-center">{uploadError}</p>
          )}
          <p className="text-xs text-[#443837]/60 text-center">
            Upload a photo from your device (max 5MB)
          </p>
        </div>
      )}
    </div>
  );
}
