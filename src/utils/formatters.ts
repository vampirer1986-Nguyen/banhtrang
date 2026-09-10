export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return '';
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMinutes < 1) return 'Vừa vào';
  if (diffMinutes < 60) return `${diffMinutes} phút`;
  const hours = Math.floor(diffMinutes / 60);
  const remMinutes = diffMinutes % 60;
  return `${hours}h ${remMinutes}p`;
}

export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTimeOnly(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

