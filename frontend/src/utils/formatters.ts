export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (error) {
    return 'N/A';
  }
};

export const formatTime = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Invalid Time';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return 'N/A';
  }
};

export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
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