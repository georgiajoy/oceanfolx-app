'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { updateUserProfilePhotoAction } from './actions';

interface UserProfilePhotoUploadProps {
  userId: string;
  currentPhotoUrl?: string | null;
  onPhotoUpdate: (url: string) => void;
}

export function UserProfilePhotoUpload({ userId, currentPhotoUrl, onPhotoUpdate }: UserProfilePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const ext = file.name.split('.').pop() || 'jpg';
      const safeBaseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${userId}/${Date.now()}_${safeBaseName}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const updatePhotoResult = await updateUserProfilePhotoAction(userId, publicUrl);
      if (!updatePhotoResult.success) {
        setError(updatePhotoResult.error || 'Failed to update profile photo');
        return;
      }

      onPhotoUpdate(publicUrl);
    } catch (uploadError: any) {
      setError(uploadError.message || 'Failed to upload profile photo');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#4FBACA] bg-gradient-to-br from-[#4FBACA] to-[#3AA8BC] flex items-center justify-center">
        {currentPhotoUrl ? (
          <img src={currentPhotoUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <User className="h-12 w-12 text-white" />
        )}
      </div>
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Profile Photo'}
        </Button>
        <p className="text-xs text-gray-500">JPG/PNG up to 5MB</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
