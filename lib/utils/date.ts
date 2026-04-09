/**
 * Utilitários de data e hora
 */

/**
 * Formata data relativa (ex: "há 2 minutos", "ontem", "há 3 dias")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'agora';
  } else if (diffMins < 60) {
    return `há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
  } else if (diffHours < 24) {
    return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  } else if (diffDays === 1) {
    return 'ontem';
  } else if (diffDays < 7) {
    return `há ${diffDays} dias`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `há ${years} ${years === 1 ? 'ano' : 'anos'}`;
  }
}

/**
 * Formata data para formato brasileiro (DD/MM/YYYY)
 */
export function formatDateBR(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata data e hora para formato brasileiro (DD/MM/YYYY HH:MM)
 */
export function formatDateTimeBR(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Verifica se uma data está dentro de um horário silencioso
 * @param quietStartTime ex: "22:00"
 * @param quietEndTime ex: "08:00"
 * @returns true se está dentro do horário silencioso
 */
export function isInQuietHours(quietStartTime: string, quietEndTime: string): boolean {
  const now = new Date();
  const [startHour, startMin] = quietStartTime.split(':').map(Number);
  const [endHour, endMin] = quietEndTime.split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Se start > end (ex: 22:00 > 08:00), quiet hours cruzam meia-noite
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}
