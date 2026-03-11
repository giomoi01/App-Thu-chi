import { format } from 'date-fns';
import { vi, enUS, fr, es, zhCN, ja, ko, it, pt, ru } from 'date-fns/locale';

export const getLocale = (language: string) => {
  switch (language) {
    case 'vi': return vi;
    case 'en': return enUS;
    case 'fr': return fr;
    case 'es': return es;
    case 'zh': return zhCN;
    case 'ja': return ja;
    case 'ko': return ko;
    case 'it': return it;
    case 'pt': return pt;
    case 'ru': return ru;
    default: return vi;
  }
};

export const formatCurrency = (amount: number, currency: string, language: string) => {
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'VND' ? 0 : 2,
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
  }).format(amount);
};

export const formatDate = (date: Date | string, dateFormat: string, language: string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, dateFormat, { locale: getLocale(language) });
};
