import React, { useState } from 'react';
import { EmailService } from '@/services/emailService';

const EmailTestPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const testEmails = [
    { type: 'welcome', label: 'Welcome Email 🎉' },
    { type: 'order_update', label: 'Order Status Update 📦' },
    { type: 'low_stock', label: 'Low Stock Alert ⚠️' },
    { type: 'delivery_assignment', label: 'Delivery Assignment 🚛' },
    { type: 'delivery_confirmation', label: 'Delivery Confirmation ✅' }
  ];

  const handleTestEmail = async (type: string, label: string) => {
    setLoading(true);
    try {
      await EmailService.testEmail(type);
      const message = `✅ ${label} - Sent successfully`;
      setResults(prev => [message, ...prev.slice(0, 9)]);
    } catch (error) {
      const message = `❌ ${label} - Failed to send`;
      setResults(prev => [message, ...prev.slice(0, 9)]);
    }
    setLoading(false);
  };

  const testAllEmails = async () => {
    setLoading(true);
    setResults([]);
    
    for (const email of testEmails) {
      try {
        await EmailService.testEmail(email.type);
        const message = `✅ ${email.label} - Sent successfully`;
        setResults(prev => [message, ...prev]);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between emails
      } catch (error) {
        const message = `❌ ${email.label} - Failed to send`;
        setResults(prev => [message, ...prev]);
      }
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Email Notification Testing</h3>
      
      <div className="space-y-3 mb-6">
        {testEmails.map((email) => (
          <button
            key={email.type}
            onClick={() => handleTestEmail(email.type, email.label)}
            disabled={loading}
            className="w-full text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 disabled:opacity-50"
          >
            {email.label}
          </button>
        ))}
      </div>

      <button
        onClick={testAllEmails}
        disabled={loading}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 mb-4"
      >
        {loading ? 'Testing...' : 'Test All Emails'}
      </button>

      {results.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Test Results:</h4>
          <div className="space-y-1 text-sm">
            {results.map((result, index) => (
              <div key={index} className="font-mono">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTestPanel;