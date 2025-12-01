import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import Button from '../ui/Button';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onClear?: () => void;
}

export default function SignaturePad({ onSave, onClear }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    sigRef.current?.clear();
    onClear?.();
  };

  const handleSave = () => {
    if (sigRef.current?.isEmpty()) {
      alert('Please provide a signature');
      return;
    }
    const signature = sigRef.current?.toDataURL();
    if (signature) {
      onSave(signature);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{
            width: 400,
            height: 200,
            className: 'signature-canvas w-full h-48 border rounded'
          }}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={handleClear}>
          Clear
        </Button>
        <Button onClick={handleSave}>
          Save Signature
        </Button>
      </div>
    </div>
  );
}