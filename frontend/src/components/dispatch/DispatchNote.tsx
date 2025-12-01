
import ExportButton from '../export/ExportButton';

interface DispatchNoteProps {
  dispatch: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerAddress: string;
    items: Array<{
      name: string;
      quantity: number;
      unit: string;
    }>;
    driverName: string;
    vehicleNumber: string;
    scheduledDate: string;
    notes?: string;
  };
}

export default function DispatchNote({ dispatch }: DispatchNoteProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Dispatch Note</h3>
        <div className="flex gap-2">
          <ExportButton
            elementId="dispatch-note"
            filename={`dispatch-${dispatch.id}`}
            type="pdf"
          />
          <ExportButton
            elementId="dispatch-note"
            filename={`dispatch-${dispatch.id}`}
            type="print"
          />
        </div>
      </div>

      <div id="dispatch-note" className="bg-white p-6 border rounded-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">WareTrack Pro</h1>
          <h2 className="text-lg font-semibold text-gray-700">Dispatch Note</h2>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Dispatch Details</h3>
            <p><strong>Dispatch ID:</strong> {dispatch.id}</p>
            <p><strong>Order Number:</strong> {dispatch.orderNumber}</p>
            <p><strong>Scheduled Date:</strong> {new Date(dispatch.scheduledDate).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Customer Information</h3>
            <p><strong>Name:</strong> {dispatch.customerName}</p>
            <p><strong>Address:</strong> {dispatch.customerAddress}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Items to Deliver</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">Item Name</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Quantity</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Unit</th>
              </tr>
            </thead>
            <tbody>
              {dispatch.items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2">{item.name}</td>
                  <td className="border border-gray-300 px-4 py-2">{item.quantity}</td>
                  <td className="border border-gray-300 px-4 py-2">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Driver Information</h3>
            <p><strong>Driver:</strong> {dispatch.driverName}</p>
            <p><strong>Vehicle:</strong> {dispatch.vehicleNumber}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Signatures</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Driver Signature:</p>
                <div className="border-b border-gray-300 h-8"></div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Customer Signature:</p>
                <div className="border-b border-gray-300 h-8"></div>
              </div>
            </div>
          </div>
        </div>

        {dispatch.notes && (
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Special Instructions</h3>
            <p className="text-gray-700">{dispatch.notes}</p>
          </div>
        )}

        <div className="text-center text-sm text-gray-500 mt-8">
          Generated on {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}