/**
 * Formatta una data in formato compatto (es. 15 Gen 2023)
 */
export function formatDateCompact(date: Date): string {
  if (!date) {
    return '';
  }
  
  const mesi = [
    'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
    'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
  ];
  
  const giorno = date.getDate();
  const mese = mesi[date.getMonth()];
  const anno = date.getFullYear();
  
  return `${giorno} ${mese} ${anno}`;
}

/**
 * Formatta una data in formato esteso (es. Lunedì 15 Gennaio 2023)
 */
export function formatDateExtended(date: Date): string {
  if (!date) {
    return '';
  }
  
  const giorni = [
    'Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 
    'Giovedì', 'Venerdì', 'Sabato'
  ];
  
  const mesi = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  const giornoSettimana = giorni[date.getDay()];
  const giorno = date.getDate();
  const mese = mesi[date.getMonth()];
  const anno = date.getFullYear();
  
  return `${giornoSettimana} ${giorno} ${mese} ${anno}`;
}