'use client';

import React, { useEffect, useState, use } from 'react';
import { useCodeShareStore } from '@/store/useCodeShareStore';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CodeCanvas } from '@/components/code-share/CodeCanvas';
import { useSearchParams } from 'next/navigation';

export default function CodeSharePage({ params }: { params: Promise<{ category: string; id: string }> }) {
  const { category, id } = use(params);
  const searchParams = useSearchParams();
  const signature = searchParams.get('signature');
  const expiresAt = searchParams.get('expiresAt');
  
  const { init, save } = useCodeShareStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState('');

  useEffect(() => {
    if (category && id && signature && expiresAt) {
      init({ category, id, signature, expiresAt });
    }
  }, [category, id, signature, expiresAt, init]);

  const handleSave = async () => {
    await save(editedCode);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black text-white selection:bg-blue-500/30">
      <Header 
        isEditing={isEditing} 
        onEditToggle={() => setIsEditing(!isEditing)} 
        onSave={handleSave} 
      />
      
      <main className="flex-1 flex flex-col min-h-0">
        <CodeCanvas 
          isEditing={isEditing} 
          onCodeChange={setEditedCode} 
        />
      </main>

      <Footer />
    </div>
  );
}
