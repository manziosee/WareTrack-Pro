import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { barcodeSvgDataUrl } from '../../utils/barcode';
import { Package, MapPin, Tag, Wallet, Boxes, Info, CalendarClock, AlertTriangle } from 'lucide-react';
import Badge from '../ui/Badge';
import { DetailHero, DetailSection, DetailField, DetailGrid, DetailStat } from '../ui/Detail';
import { formatDate } from '../../utils/formatters';

interface ViewInventoryModalProps {
  item: any;
}

export default function ViewInventoryModal({ item }: ViewInventoryModalProps) {
  const [qrImage, setQrImage] = useState('');
  const [barcodeImage, setBarcodeImage] = useState('');
  useEffect(() => {
    let active = true;
    if (item.barcode) {
      setBarcodeImage(barcodeSvgDataUrl(item.barcode));
      QRCode.toDataURL(item.barcode, { margin: 1, width: 180, color: { dark: '#172B3C', light: '#FFFFFF' } }).then((url) => { if (active) setQrImage(url); }).catch(() => setQrImage(''));
    } else { setQrImage(''); setBarcodeImage(''); }
    return () => { active = false; };
  }, [item.barcode]);
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'DISCONTINUED': return 'error';
      default: return 'gray';
    }
  };

  const quantity = Number(item.quantity) || 0;
  const minQuantity = Number(item.minQuantity) || 0;
  const unitPrice = Number(item.unitPrice) || 0;

  const stockStatus = quantity === 0 ? 'Out of Stock' : quantity <= minQuantity ? 'Low Stock' : 'In Stock';
  const stockVariant = quantity === 0 ? 'error' : quantity <= minQuantity ? 'warning' : 'success';
  // Bar is full at twice the minimum, so the minimum sits at the midpoint
  const stockPercent = minQuantity > 0 ? Math.min(100, Math.round((quantity / (minQuantity * 2)) * 100)) : 100;
  const meterColor = quantity === 0 ? 'bg-error-500' : quantity <= minQuantity ? 'bg-warning-500' : 'bg-success-500';

  return (
    <div className="space-y-5">
      <DetailHero
        avatar={<Package className="w-6 h-6" />}
        title={item.name}
        subtitle={<span className="font-mono">{item.code}</span>}
        badges={
          <>
            <Badge variant={stockVariant}>{stockStatus}</Badge>
            <Badge variant={getStatusBadgeVariant(item.status)} size="sm">{item.status}</Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DetailStat
          label="In Stock"
          value={<>{quantity.toLocaleString()} <span className="text-sm font-medium text-gray-500">{item.unit}</span></>}
          hint={`Minimum ${minQuantity.toLocaleString()} ${item.unit || ''}`}
          icon={<Boxes className="w-4 h-4" />}
          tone={stockVariant === 'success' ? 'success' : stockVariant === 'warning' ? 'warning' : 'error'}
        />
        <DetailStat label="Unit Price" value={`RWF ${unitPrice.toLocaleString()}`} icon={<Tag className="w-4 h-4" />} tone="accent" />
        <DetailStat label="Total Value" value={`RWF ${(quantity * unitPrice).toLocaleString()}`} icon={<Wallet className="w-4 h-4" />} />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-soft">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
          <span>Stock level</span>
          <span className="tabular-nums">{quantity.toLocaleString()} / {(minQuantity * 2).toLocaleString()} target</span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full rounded-full ${meterColor} transition-all duration-700`} style={{ width: `${stockPercent}%` }} />
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-gray-300" title="Minimum quantity" />
        </div>
      </div>

      {quantity <= minQuantity && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning-200 bg-warning-50 p-4">
          <AlertTriangle className="mt-0.5 w-5 h-5 shrink-0 text-warning-600" />
          <div>
            <p className="text-sm font-semibold text-warning-800">Stock alert</p>
            <p className="text-sm text-warning-700">
              This item is {quantity === 0 ? 'out of stock' : 'running low'}. Consider restocking soon to avoid shortages.
            </p>
          </div>
        </div>
      )}

      <DetailSection title="Details" icon={<Info className="w-4 h-4" />}>
        <DetailGrid>
          <DetailField label="Category"><Badge variant="primary" size="sm">{item.category}</Badge></DetailField>
          <DetailField label="Location">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-accent-500" />
              {item.location || '—'}
            </span>
          </DetailField>
          <DetailField label="Unit">{item.unit || '—'}</DetailField>
          <DetailField label="Unit Category">{item.unitCategory || 'Not specified'}</DetailField>
          <DetailField label="Supplier">{item.supplier || 'Not specified'}</DetailField>
          <DetailField label="Barcode"><span className="font-mono">{item.barcode || 'Not specified'}</span></DetailField>
          {qrImage && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 p-3 sm:col-span-2"><img src={qrImage} alt={`QR code for ${item.name}`} className="h-24 w-24" /><div><p className="text-sm font-semibold text-gray-800">Product QR code</p><p className="mt-1 font-mono text-xs text-gray-500">Scans to {item.barcode}</p></div>{barcodeImage && <img src={barcodeImage} alt={`Code 128 barcode for ${item.name}`} className="ml-auto h-14 w-48" />}</div>}
          <DetailField label="Description" className="sm:col-span-2">
            <span className="font-normal text-gray-700">{item.description || 'No description provided'}</span>
          </DetailField>
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Record" icon={<CalendarClock className="w-4 h-4" />}>
        <DetailGrid>
          <DetailField label="Created">{formatDate(item.createdAt)}</DetailField>
          <DetailField label="Last Updated">{formatDate(item.lastUpdated || item.updatedAt)}</DetailField>
        </DetailGrid>
      </DetailSection>
    </div>
  );
}
