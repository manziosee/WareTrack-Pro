import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Button from '../ui/Button';
import SignaturePad from '../signature/SignaturePad';
import { Upload } from 'lucide-react';

const schema = yup.object({
  deliveryCode: yup.string().required('Delivery code is required'),
  customerName: yup.string().required('Customer name is required'),
  notes: yup.string(),
});

interface DeliveryConfirmationFormProps {
  orderId: string;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

export default function DeliveryConfirmationForm({ orderId, onSubmit, onClose }: DeliveryConfirmationFormProps) {
  const [signature, setSignature] = useState<string>('');
  const [proofImage, setProofImage] = useState<string>('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProofImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onFormSubmit = (data: any) => {
    if (!signature) {
      alert('Signature is required');
      return;
    }

    onSubmit({
      ...data,
      signature,
      proofImage,
      orderId,
      deliveredAt: new Date().toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Delivery Code *
        </label>
        <input
          {...register('deliveryCode')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Enter delivery confirmation code"
        />
        {errors.deliveryCode && (
          <p className="text-red-500 text-sm mt-1">{errors.deliveryCode.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Customer Name *
        </label>
        <input
          {...register('customerName')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Confirm customer name"
        />
        {errors.customerName && (
          <p className="text-red-500 text-sm mt-1">{errors.customerName.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Customer Signature *
        </label>
        <SignaturePad 
          onSave={setSignature}
          onClear={() => setSignature('')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Proof of Delivery (Photo)
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          {proofImage ? (
            <div className="text-center">
              <img src={proofImage} alt="Proof of delivery" className="max-h-32 mx-auto mb-2" />
              <Button variant="secondary" onClick={() => setProofImage('')}>
                Remove Image
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="proof-upload"
              />
              <label
                htmlFor="proof-upload"
                className="cursor-pointer text-primary-600 hover:text-primary-700"
              >
                Upload proof of delivery photo
              </label>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Delivery Notes
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Any additional notes about the delivery"
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          Confirm Delivery
        </Button>
      </div>
    </form>
  );
}