'use client';

import { Language } from '@/lib/i18n';
import { Button } from './ui/button';

interface LanguageSwitcherProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LanguageSwitcher({ currentLanguage, onLanguageChange }: LanguageSwitcherProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={currentLanguage === 'en' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onLanguageChange('en')}
      >
        EN
      </Button>
      <Button
        variant={currentLanguage === 'id' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onLanguageChange('id')}
      >
        ID
      </Button>
    </div>
  );
}
