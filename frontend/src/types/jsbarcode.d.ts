declare module 'jsbarcode' {
  const JsBarcode: (
    target: SVGElement | HTMLCanvasElement | string,
    value: string,
    options?: Record<string, unknown>
  ) => void;
  export default JsBarcode;
}
