export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const formatDateTime = (date: Date | string): string => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const formatOrderNumber = (id: number): string => {
  return `ORD-${String(id).padStart(6, '0')}`;
};

export const formatStockLevel = (current: number, min: number): string => {
  const percentage = (current / min) * 100;
  if (percentage <= 25) return 'Critical';
  if (percentage <= 50) return 'Low';
  if (percentage <= 100) return 'Normal';
  return 'High';
};