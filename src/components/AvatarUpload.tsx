"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';

type Props = {
  url: string | null;
  onUpload: (url: string) => void;
  size?: number;
};

export const AvatarUpload = ({ url, onUpload, size = 100 }: Props) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (url) downloadImage(url);
  }, [url]);

  const downloadImage = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('avatars').download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      setAvatarUrl(url);
    } catch (error) {
      console.log('Error downloading image: ', error);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      onUpload(filePath);
    } catch (error) {
      alert('画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="border-2 border-slate-200" style={{ width: size, height: size }}>
          <AvatarImage src={avatarUrl || ''} className="object-cover" />
          <AvatarFallback className="bg-slate-100 text-slate-400">
            <Camera className="w-8 h-8" />
          </AvatarFallback>
        </Avatar>
        
        {/* アップロード中のローディング表示 */}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {/* ファイル選択input (透明にしてアバターの上に重ねる) */}
        <input
          type="file"
          id="single"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <Button variant="outline" size="sm" className="relative" disabled={uploading}>
        画像を変更
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={uploadAvatar}
          disabled={uploading}
        />
      </Button>
    </div>
  );
};