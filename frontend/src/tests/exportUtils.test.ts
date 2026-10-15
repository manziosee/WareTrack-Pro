import { exportToPDF } from '@/utils/exportUtils';

describe('PDF export', () => {
  it('escapes HTML in cell values', async () => {
    let html = '';
    vi.spyOn(window, 'open').mockReturnValue({ document: { write: (h: string) => { html = h; }, close: () => undefined } } as any);
    await exportToPDF([{ Name: '<script>alert(1)</script>', Status: 'DELIVERED', 'Unit Price': 1500 }], 'x', 'Test <Report>');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Test &lt;Report&gt;');
    expect(html).toContain('RWF 1,500');
  });
});
