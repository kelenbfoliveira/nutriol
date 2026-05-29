import { parseISO, differenceInCalendarDays } from 'date-fns';

export const isTomorrow = (dateStr: string): boolean => {
  try {
    const apptDate = parseISO(dateStr.replace(' ', 'T'));
    return differenceInCalendarDays(apptDate, new Date()) === 1;
  } catch {
    return false;
  }
};

export const formatWhatsAppNumber = (rawNumber: string): string => {
  if (!rawNumber) return '';
  let cleanNumber = rawNumber.replace(/\D/g, '');
  
  if (cleanNumber.startsWith('0')) {
    cleanNumber = cleanNumber.substring(1);
  }
  
  if (!cleanNumber.startsWith('55') && (cleanNumber.length === 10 || cleanNumber.length === 11)) {
    cleanNumber = '55' + cleanNumber;
  }
  
  return cleanNumber;
};

export const formatPhoneNumber = (value: string): string => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  const limitedDigits = digits.slice(0, 11);
  
  if (limitedDigits.length <= 2) {
    return limitedDigits.length > 0 ? `(${limitedDigits}` : '';
  }
  if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2)}`;
  }
  if (limitedDigits.length <= 10) {
    return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2, 6)}-${limitedDigits.slice(6)}`;
  }
  return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2, 7)}-${limitedDigits.slice(7)}`;
};

export const getPatientPhoto = (id: string, gender?: string, fotoUrl?: string | null) => {
  if (fotoUrl) return fotoUrl;
  const femalePhotos = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=150&h=150"
  ];

  const malePhotos = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150&h=150",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=150&h=150"
  ];

  let hash = 0;
  if (id) {
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
  }
  const index = Math.abs(hash);

  if (gender?.toLowerCase() === 'feminino') {
    return femalePhotos[index % femalePhotos.length];
  } else if (gender?.toLowerCase() === 'masculino') {
    return malePhotos[index % malePhotos.length];
  } else {
    const all = [...femalePhotos, ...malePhotos];
    return all[index % all.length];
  }
};
