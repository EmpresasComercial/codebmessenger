import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Check } from 'lucide-react';
import { COUNTRIES, Country } from '../lib/countries';
import { useLanguage } from '../contexts/LanguageContext';

interface CountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
}

export default function CountryModal({
  isOpen,
  onClose,
  selectedCountry,
  onSelectCountry,
}: CountryModalProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const locale = language === 'zh-hans' ? 'zh-Hans' : language;
  const countryNames = useMemo(() => new Intl.DisplayNames([locale], { type: 'region' }), [locale]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      // Auto-focus search after modal opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const query = search.toLowerCase().trim();
    // Normalize string to remove accents for easy searching
    const normalize = (str: string) =>
      str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const queryNormalized = normalize(query);

    return COUNTRIES.filter((c) => {
      const nameNorm = normalize(c.name);
      const localizedName = normalize(countryNames.of(c.code.toUpperCase()) || c.name);
      return (
        nameNorm.includes(queryNormalized) ||
        localizedName.includes(queryNormalized) ||
        c.dial_code.includes(query) ||
        c.code.toLowerCase().includes(query)
      );
    });
  }, [search, countryNames]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col antialiased">
      {/* Header */}
      <div className="h-[56px] px-4 flex items-center border-b border-[#c8c7cc] shrink-0 bg-[#f8f8f8]">
        <button
          type="button"
          onClick={onClose}
          className="text-[#3390ec] text-[17px] font-medium cursor-pointer hover:opacity-80 transition-opacity"
        >
          {t('common.back')}
        </button>
        <h2 className="flex-1 text-center text-[17px] font-semibold text-black">
          {t('country.choose')}
        </h2>
        <div className="w-[48px]" />
      </div>

      {/* Search Bar */}
      <div className="p-2.5 bg-[#f8f8f8] border-b border-[#c8c7cc] shrink-0">
        <div className="bg-[#e3e3e8] h-[38px] rounded-[12px] flex items-center px-3">
          <Search className="w-5 h-5 text-[#8e8e93] mr-2 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t('country.search_placeholder')}
            className="bg-transparent outline-none flex-1 text-[16px] text-black placeholder:text-[#8e8e93]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="bg-[#8e8e93] hover:bg-[#707579] text-white rounded-full p-0.5 ml-2 cursor-pointer transition-colors"
              aria-label={t('country.clear_search')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Country List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#e5e5ea]">
        {filteredCountries.map((c) => {
          const isSelected = selectedCountry.code === c.code;
          return (
            <div
              key={c.code}
              className={`flex items-center px-4 h-[52px] active:bg-[#f2f2f7] hover:bg-[#f9f9fb] cursor-pointer transition-colors ${
                isSelected ? 'bg-[#f0f7ff]' : ''
              }`}
              onClick={() => {
                onSelectCountry(c);
                onClose();
              }}
            >
              <span className="text-[26px] mr-3.5 shrink-0 select-none leading-none">
                {c.emoji}
              </span>
              <span className="flex-1 text-[16px] font-medium text-black truncate">
                {countryNames.of(c.code.toUpperCase()) || c.name}
              </span>
              <span className="text-[#8e8e93] text-[16px] mr-3 font-normal shrink-0">
                {c.dial_code}
              </span>
              {isSelected && (
                <Check className="w-5 h-5 text-[#3390ec] shrink-0" strokeWidth={2.5} />
              )}
            </div>
          );
        })}

        {filteredCountries.length === 0 && (
          <div className="p-12 text-center text-[#8e8e93] text-[15px]">
            Nenhum paÃ­s encontrado
          </div>
        )}
      </div>
    </div>
  );
}

