import { Html5Qrcode } from 'html5-qrcode';

export type QrScanner = Html5Qrcode;

/** Detect browser/platform problems before asking the QR library to open a device. */
export function cameraAccessError(): string | null {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Camera access requires HTTPS. Open the deployed HTTPS app, or use localhost for local development.';
  }
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'This browser does not provide camera access. Update the browser or use a USB scanner.';
  }
  return null;
}

/** Open the back camera when available, while retaining desktop/front camera fallback. */
export async function startQrScanner(
  scanner: Html5Qrcode,
  onCode: (code: string) => void,
) {
  const unavailable = cameraAccessError();
  if (unavailable) throw new Error(unavailable);

  let camera: string | { facingMode: { ideal: string } } = { facingMode: { ideal: 'environment' } };
  try {
    const cameras = await Html5Qrcode.getCameras();
    const preferred = cameras.find((device) => /back|rear|environment|traseira|arrière/i.test(device.label)) || cameras[0];
    if (preferred) camera = preferred.id;
  } catch {
    // Labels/device listing can be unavailable before the user grants permission.
    // Let getUserMedia request the environment-facing camera directly.
  }

  await scanner.start(
    camera,
    { fps: 10, qrbox: { width: 240, height: 160 } },
    onCode,
    () => undefined,
  );
}

export function cameraErrorMessage(error: unknown): string {
  const unavailable = cameraAccessError();
  if (unavailable) return unavailable;
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission is blocked. Allow camera access for this site in your browser settings, then try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found. Connect or enable a camera, or use a USB barcode scanner.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is being used by another app. Close other camera apps or tabs, then try again.';
  }
  if (name === 'OverconstrainedError') {
    return 'The requested camera is unavailable. Check camera permissions or select another device.';
  }
  return error instanceof Error && error.message
    ? error.message
    : 'Could not open the camera. Check site permissions or use a USB barcode scanner.';
}
