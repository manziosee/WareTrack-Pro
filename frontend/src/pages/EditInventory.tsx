import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Package } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import EditInventoryForm from '@/components/forms/EditInventoryForm';
import { inventoryService } from '@/services/inventoryService';

export default function EditInventory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    inventoryService.getInventoryById(Number(id))
      .then((data) => { if (active) setItem(data); })
      .catch((e: any) => { if (active) setError(e?.response?.data?.error?.message || e?.message || 'Could not load this inventory item.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const save = async (values: any) => {
    const result = await inventoryService.updateInventoryItem(Number(id), values);
    if (result?.success === false) throw new Error(result?.error?.message || 'Could not update the item');
    toast.success(`${values.name} updated`);
    navigate('/inventory');
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Edit inventory item" subtitle="Update product details using the same form as Inventory." breadcrumbs={[{ label: 'Warehouse' }, { label: 'Inventory' }]} icon={<Package className="h-5 w-5" />} actions={<Button variant="secondary" size="sm" onClick={() => navigate('/inventory')}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to inventory</Button>} />
      <Card className="p-5">
        {loading ? <div className="animate-pulse space-y-3"><div className="h-10 rounded-lg bg-gray-100" /><div className="h-10 rounded-lg bg-gray-100" /><div className="h-24 rounded-lg bg-gray-100" /></div> : error ? <div className="py-8 text-center"><p className="text-sm text-error-700">{error}</p><Button className="mt-4" variant="secondary" onClick={() => navigate('/inventory')}>Return to inventory</Button></div> : item ? <EditInventoryForm item={item} onClose={() => navigate('/inventory')} onSave={save} /> : <p className="py-8 text-center text-sm text-gray-500">Inventory item not found.</p>}
      </Card>
    </div>
  );
}
