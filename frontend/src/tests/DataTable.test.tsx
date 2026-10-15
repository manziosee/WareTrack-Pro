import { render, screen, fireEvent, within } from '@testing-library/react';
import DataTable, { type Column } from '@/components/table/DataTable';

interface Row { id: number; name: string; qty: number }

const rows: Row[] = [
  { id: 1, name: 'Cement', qty: 40 },
  { id: 2, name: 'Bubble wrap', qty: 5 },
  { id: 3, name: 'Apples', qty: 12 },
];

const columns: Column<Row>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name, required: true },
  { id: 'qty', header: 'Qty', accessor: (r) => r.qty, align: 'right' },
];

const bodyNames = () => screen.getAllByRole('row').slice(1).map((tr) => within(tr).getAllByRole('cell')[0].textContent);

describe('DataTable', () => {
  beforeEach(() => localStorage.clear());

  it('filters rows with the search box', () => {
    render(<DataTable storageKey="t1" rows={rows} columns={columns} rowKey={(r) => r.id} />);
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'bub' } });
    expect(bodyNames()).toEqual(['Bubble wrap']);
  });

  it('sorts when a header is clicked, numbers numerically', () => {
    render(<DataTable storageKey="t2" rows={rows} columns={columns} rowKey={(r) => r.id} />);
    fireEvent.click(screen.getByText('Qty'));
    expect(bodyNames()).toEqual(['Bubble wrap', 'Apples', 'Cement']);
    fireEvent.click(screen.getByText('Qty'));
    expect(bodyNames()).toEqual(['Cement', 'Apples', 'Bubble wrap']);
  });

  it('shows bulk actions for selected rows', () => {
    const onBulk = vi.fn();
    render(
      <DataTable
        storageKey="t3"
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        bulkActions={(selected) => <button onClick={() => onBulk(selected.map((s) => s.id))}>Do it</button>}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox', { name: 'Select row' });
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[2]);
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Do it'));
    expect(onBulk).toHaveBeenCalledWith([1, 3]);
  });
});
