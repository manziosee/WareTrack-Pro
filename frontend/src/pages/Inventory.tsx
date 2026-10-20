import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Package, Boxes, PackageX, AlertTriangle, Wallet, RefreshCw, Printer, Tags } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Drawer from '@/components/ui/Drawer';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ActivityTimeline from '@/components/ui/ActivityTimeline';
import DataTable, { type Column } from '@/components/table/DataTable';
import FilterChip from '@/components/table/FilterChip';
import SavedFilters from '@/components/table/SavedFilters';
import ExportMenu from '@/components/table/ExportMenu';
import AddInventoryForm from '@/components/forms/AddInventoryForm';
import EditInventoryForm from '@/components/forms/EditInventoryForm';
import ViewInventoryModal from '@/components/forms/ViewInventoryModal';
import { CategoryManager, useCategories } from '@/components/inventory/Categories';
import PackSizes from '@/components/inventory/PackSizes';
import InventoryMovementHistory from '@/components/inventory/InventoryMovementHistory';
import { inventoryService } from '@/services/inventoryService';
import { useList } from '@/hooks/useList';
import { undoableAction } from '@/utils/undoableAction';
import { useAuth } from '@/context/AuthContext';
import { printItemLabels } from '@/utils/labels';

const stockLevel = (i: any) => (i.quantity === 0 ? 'OUT_OF_STOCK' : i.quantity <= i.minQuantity ? 'LOW_STOCK' : 'IN_STOCK');
const rwf = (v: number) => `RWF ${Math.round(v).toLocaleString()}`;

export default function Inventory() {
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'WAREHOUSE_STAFF'].includes(user?.role || '');
  const [params, setParams] = useSearchParams();
  const { rows, loading, setRows, refresh } = useList<any>('inventory', '/inventory');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [showAdd, setShowAdd] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  useEffect(() => {
    if (params.get('new') === '1') setShowAdd(true);
    const view = Number(params.get('view'));
    if (view) setViewId(view);
    if (params.get('new') || params.get('view')) setParams({}, { replace: true });
  }, [params, setParams]);

  const { data: managedCategories = [] } = useCategories();
  const categories = useMemo(
    () => Array.from(new Set([...managedCategories.map((c) => c.name), ...rows.map((i) => i.category)].filter(Boolean))).sort(),
    [rows, managedCategories]
  );
  const filtered = useMemo(
    () => rows.filter((i) => (!category || i.category === category) && (!level || stockLevel(i) === level) && (!status || i.status === status)),
    [rows, category, level, status]
  );
  const viewing = rows.find((i) => i.id === viewId) || null;

  const stats = useMemo(() => ({
    skus: rows.length,
    low: rows.filter((i) => stockLevel(i) === 'LOW_STOCK').length,
    out: rows.filter((i) => stockLevel(i) === 'OUT_OF_STOCK').length,
    value: rows.reduce((s, i) => s + i.quantity * Number(i.unitPrice || 0), 0),
  }), [rows]);

  const removeItems = (targets: any[]) => {
    const ids = new Set(targets.map((i) => i.id));
    const snapshot = rows;
    undoableAction({
      message: targets.length === 1 ? `${targets[0].name} archived` : `${targets.length} items archived`,
      apply: () => {
        setRows((list) => list.filter((i) => !ids.has(i.id)));
        if (viewId && ids.has(viewId)) setViewId(null);
      },
      revert: () => setRows(() => snapshot),
      commit: async () => {
        for (const i of targets) {
          const res = await inventoryService.deleteInventoryItem(i.id);
          if (res?.success === false) throw new Error(res?.error?.message || `Could not delete ${i.name}`);
        }
        refresh();
      },
    });
  };

  const saveItem = async (data: any) => {
    const res = editing ? await inventoryService.updateInventoryItem(editing.id, data) : await inventoryService.createInventoryItem(data);
    if (res?.success === false) {
      toast.error(res?.error?.message || 'Could not save the item');
      return;
    }
    toast.success(editing ? 'Item updated' : 'Item added');
    setEditing(null);
    setShowAdd(false);
    refresh();
  };

  const columns: Column<any>[] = [
    {
      id: 'name', header: 'Item', required: true, accessor: (i) => i.name,
      cell: (i) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><Package className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{i.name}</p>
            <p className="font-mono text-xs text-gray-500">{i.code}</p>
          </div>
        </div>
      ),
    },
    { id: 'category', header: 'Category', accessor: (i) => i.category, cell: (i) => <span className="whitespace-nowrap rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{i.category}</span> },
    {
      id: 'stock', header: 'Stock', align: 'right', accessor: (i) => i.quantity,
      cell: (i) => {
        const ratio = i.minQuantity ? Math.min(1, i.quantity / (i.minQuantity * 2)) : 1;
        const lvl = stockLevel(i);
        return (
          <div className="ml-auto w-28">
            <p className="font-semibold text-gray-900">{i.quantity.toLocaleString()} <span className="text-xs font-normal text-gray-500">{i.unit}</span></p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${lvl === 'IN_STOCK' ? 'bg-success-500' : lvl === 'LOW_STOCK' ? 'bg-warning-500' : 'bg-error-500'}`} style={{ width: `${Math.max(4, ratio * 100)}%` }} />
            </div>
          </div>
        );
      },
    },
    { id: 'level', header: 'Level', accessor: (i) => stockLevel(i), cell: (i) => <StatusBadge status={stockLevel(i)} /> },
    { id: 'min', header: 'Minimum', align: 'right', accessor: (i) => i.minQuantity },
    { id: 'price', header: 'Unit price', align: 'right', accessor: (i) => Number(i.unitPrice || 0), cell: (i) => rwf(Number(i.unitPrice || 0)) },
    { id: 'value', header: 'Stock value', align: 'right', accessor: (i) => i.quantity * Number(i.unitPrice || 0), cell: (i) => <span className="font-semibold">{rwf(i.quantity * Number(i.unitPrice || 0))}</span> },
    { id: 'location', header: 'Location', accessor: (i) => i.location },
    { id: 'supplier', header: 'Supplier', defaultHidden: true, accessor: (i) => i.supplier || '' },
    { id: 'status', header: 'Status', defaultHidden: true, accessor: (i) => i.status, cell: (i) => <StatusBadge status={i.status} /> },
  ];

  const exportRows = (list: any[]) =>
    list.map((i) => ({
      Name: i.name, Code: i.code, Category: i.category, Quantity: i.quantity, 'Min Quantity': i.minQuantity,
      'Unit Price': Number(i.unitPrice || 0), Location: i.location, Status: stockLevel(i),
    }));

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Stock levels, values and locations across your warehouses"
        breadcrumbs={[{ label: 'Warehouse' }]}
        icon={<Boxes className="h-5 w-5" />}
        actions={
          <>
            <button onClick={refresh} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </button>
            {canEdit && <Button size="sm" variant="secondary" onClick={() => setShowCategories(true)}><Tags className="mr-1.5 h-4 w-4" /> Categories</Button>}
            {canEdit && <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1.5 h-4 w-4" /> Add item</Button>}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Products" value={stats.skus} icon={<Boxes className="h-5 w-5" />} />
        <StatCard label="Low stock" value={stats.low} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" />
        <StatCard label="Out of stock" value={stats.out} icon={<PackageX className="h-5 w-5" />} tone="error" />
        <StatCard label="Stock value" value={stats.value} prefix="RWF " compact icon={<Wallet className="h-5 w-5" />} tone="success" />
      </div>

      <DataTable
        storageKey="inventory"
        rows={filtered}
        columns={columns}
        rowKey={(i) => i.id}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, code, location…"
        initialSort={{ id: 'name', dir: 'asc' }}
        activeKey={viewId}
        onRowClick={(i) => setViewId(i.id)}
        filters={
          <>
            <FilterChip label="Category" value={category} onChange={setCategory} options={categories.map((c) => ({ value: c, label: c }))} />
            <FilterChip label="Stock level" value={level} onChange={setLevel} options={[{ value: 'IN_STOCK', label: 'In stock' }, { value: 'LOW_STOCK', label: 'Low stock' }, { value: 'OUT_OF_STOCK', label: 'Out of stock' }]} />
            <FilterChip label="Status" value={status} onChange={setStatus} options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }, { value: 'DISCONTINUED', label: 'Discontinued' }]} />
          </>
        }
        toolbarRight={
          <>
            <SavedFilters
              page="inventory"
              current={{ search, category, level, status }}
              onApply={(f) => { setSearch(f.search || ''); setCategory(f.category || ''); setLevel(f.level || ''); setStatus(f.status || ''); }}
            />
            <ExportMenu getRows={() => exportRows(filtered)} filename="inventory" title="Inventory Report" />
          </>
        }
        rowActions={(i) => (
          <>
            <button onClick={() => setViewId(i.id)} className="action-btn action-btn-view" title="View"><Eye className="h-4 w-4" /></button>
            {canEdit && <button onClick={() => setEditing(i)} className="action-btn action-btn-edit" title="Edit"><Edit className="h-4 w-4" /></button>}
            {canEdit && <button onClick={() => removeItems([i])} className="action-btn action-btn-delete" title="Delete"><Trash2 className="h-4 w-4" /></button>}
          </>
        )}
        bulkActions={
          canEdit
            ? (selected, clear) => (
                <>
                  <ExportMenu getRows={() => exportRows(selected)} filename="inventory-selected" title="Selected Items" label="Export selected" />
                  <button onClick={() => { removeItems(selected); clear(); }} className="inline-flex h-8 items-center gap-1 rounded-lg bg-error-500 px-2.5 text-xs font-semibold text-white hover:bg-error-600">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </>
              )
            : undefined
        }
        empty={
          <EmptyState
            variant={rows.length ? 'search' : 'empty'}
            title={rows.length ? 'No items match these filters' : 'Your inventory is empty'}
            description={rows.length ? 'Try clearing a filter.' : 'Add your first product to start tracking stock.'}
            action={!rows.length && canEdit ? <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1.5 h-4 w-4" /> Add your first item</Button> : undefined}
          />
        }
      />

      <Drawer
        open={Boolean(viewing)}
        onClose={() => setViewId(null)}
        title={viewing?.name || ''}
        subtitle={viewing?.code}
        icon={<Package className="h-4 w-4" />}
        width="xl"
        footer={
          viewing && canEdit ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => printItemLabels(viewing)}><Printer className="mr-1.5 h-4 w-4" /> Labels</Button>
              <Button variant="secondary" size="sm" onClick={() => setEditing(viewing)}><Edit className="mr-1.5 h-4 w-4" /> Edit</Button>
              <Button variant="error" size="sm" onClick={() => removeItems([viewing])}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
            </>
          ) : undefined
        }
      >
        {viewing && (
          <div className="space-y-5">
            <ViewInventoryModal item={viewing} />
            <PackSizes item={viewing} canEdit={canEdit} onChanged={refresh} />
            <InventoryMovementHistory itemId={viewing.id} />
            <ActivityTimeline entityType="InventoryItem" entityId={viewing.id} />
          </div>
        )}
      </Drawer>

      <Modal isOpen={showCategories} onClose={() => setShowCategories(false)} title="Inventory categories" subtitle="Add, rename or remove categories" icon={<Tags className="h-5 w-5" />}>
        <CategoryManager onChanged={refresh} />
      </Modal>
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add inventory item" icon={<Plus className="h-5 w-5" />} size="lg">
        <AddInventoryForm onClose={() => setShowAdd(false)} onSave={saveItem} />
      </Modal>
      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Edit item" subtitle={editing?.name} icon={<Edit className="h-5 w-5" />} size="lg">
        {editing && <EditInventoryForm item={editing} onClose={() => setEditing(null)} onSave={saveItem} />}
      </Modal>
    </div>
  );
}
