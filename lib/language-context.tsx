'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '@/lib/supabase';
import { getCurrentUser, getUserProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  updateLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserLanguage();
  }, []);

  async function loadUserLanguage() {
    try {
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.id);
        const profile = await getUserProfile(user.id);
        if (profile) {
          setLanguage(profile.preferred_language);
        }
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  }

  async function updateLanguage(newLang: Language) {
    if (!userId) return;

    try {
      await supabase
        .from('users')
        .update({ preferred_language: newLang })
        .eq('id', userId);

      setLanguage(newLang);
    } catch (error) {
      console.error('Error updating language:', error);
      throw error;
    }
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, updateLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
