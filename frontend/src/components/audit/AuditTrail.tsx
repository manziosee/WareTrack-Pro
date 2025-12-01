import { Clock, User, Package, Truck, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
  type: 'order' | 'inventory' | 'dispatch' | 'delivery' | 'user';
}

interface AuditTrailProps {
  entries: AuditEntry[];
  title?: string;
}

export default function AuditTrail({ entries, title = "Activity Timeline" }: AuditTrailProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'order': return CheckCircle;
      case 'inventory': return Package;
      case 'dispatch': return Truck;
      case 'delivery': return CheckCircle;
      case 'user': return User;
      default: return Clock;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'order': return 'text-blue-600 bg-blue-100';
      case 'inventory': return 'text-green-600 bg-green-100';
      case 'dispatch': return 'text-yellow-600 bg-yellow-100';
      case 'delivery': return 'text-purple-600 bg-purple-100';
      case 'user': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4">
        {entries.map((entry, index) => {
          const Icon = getIcon(entry.type);
          const colorClass = getColor(entry.type);
          
          return (
            <div key={entry.id} className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                  <Badge variant="gray" size="sm">{entry.type}</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">{entry.details}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  <span>{entry.user}</span>
                  <Clock className="w-3 h-3 ml-2" />
                  <span>{entry.timestamp}</span>
                </div>
              </div>
              {index < entries.length - 1 && (
                <div className="absolute left-6 mt-8 w-px h-6 bg-gray-200" />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}