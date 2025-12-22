'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, User, Edit2, X } from 'lucide-react';

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
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

  async function handleUpdatePhoto() {
    if (!photoUrl.trim()) return;

    setUploading(true);
    try {
      const { error } = await supabase
        .from('participants')
        .update({ profile_photo_url: photoUrl })
        .eq('id', participantId);

      if (error) throw error;

      onPhotoUpdate(photoUrl);
      setPhotoUrl('');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating photo:', error);
    } finally {
      setUploading(false);
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
        <div className="flex flex-col gap-2 w-full max-w-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter photo URL"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="flex-1 border-2 border-[#4FBACA]/30 focus:border-[#4FBACA]"
            />
            <Button
              onClick={handleUpdatePhoto}
              disabled={uploading || !photoUrl.trim()}
              className="bg-[#4FBACA] hover:bg-[#3AA8BC]"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-[#443837]/60 text-center">
            Paste a photo URL to update your profile picture
          </p>
        </div>
      )}
    </div>
  );
}
