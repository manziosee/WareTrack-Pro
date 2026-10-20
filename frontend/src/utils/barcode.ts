import JsBarcode from 'jsbarcode';

/** Build a scannable Code 128 image for a product identifier. */
export function barcodeSvgDataUrl(value: string) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, value, { format: 'CODE128', width: 1.6, height: 48, displayValue: false, margin: 2, lineColor: '#172B3C' });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
}
