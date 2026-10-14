import React from 'react';
import { supportedLanguages, useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'minimal' | 'bordered';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className, variant = 'bordered' }) => {
  const { language, setLanguage, t } = useLanguage();
  const handleLanguageChange = (value: string) => {
    const selectedLanguage = supportedLanguages.find(({ code }) => code === value);
    if (selectedLanguage) setLanguage(selectedLanguage.code);
  };
  const currentLanguage = supportedLanguages.find(({ code }) => code === language);

  return (
    <div className={cn('relative group', className)}>
      <div className={cn(
        'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-gray-500 backdrop-blur-sm transition-colors duration-200 hover:text-ms-blue',
        variant === 'bordered' ? 'bg-white/90 border-transparent hover:border-gray-200' : 'bg-transparent border-transparent'
      )}>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2 12H22" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" />
        </svg>
      </div>
      <select
        value={language}
        onChange={(event) => handleLanguageChange(event.target.value)}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        title={`${t('settings.language')}: ${currentLanguage?.nativeName ?? language}`}
        aria-label={`${t('settings.language')}: ${currentLanguage?.nativeName ?? language}`}
      >
        {supportedLanguages.map(({ code, nativeName }) => (
          <option key={code} value={code}>{nativeName}</option>
        ))}
      </select>
    </div>
  );
};
