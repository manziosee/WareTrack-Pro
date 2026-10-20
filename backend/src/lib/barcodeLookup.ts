/** Accept current system barcodes, preserved supplier barcodes, and product codes. */
export function barcodeLookupOr(code: string): any {
  return [
    { barcode: code },
    { legacyBarcodes: { has: code } },
    { code: { equals: code, mode: 'insensitive' } },
  ];
}
