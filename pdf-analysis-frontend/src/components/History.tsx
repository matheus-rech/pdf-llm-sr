import React from 'react';
import { Clock, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistoryItem {
  id: string;
  question: string;
  answer: string;
  source_quote: string;
  page_number: number;
  timestamp: string;
}

interface HistoryProps {
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
}

export const History: React.FC<HistoryProps> = ({
  history,
  onSelectHistoryItem,
  onClearHistory
}) => {
  if (history.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">History</h2>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No questions asked yet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">History</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearHistory}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear History
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Previous Questions ({history.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onSelectHistoryItem(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm mb-1">
                        {item.question}
                      </p>
                      <p className="text-gray-600 text-xs line-clamp-2">
                        {item.answer}
                      </p>
                      {item.source_quote && (
                        <div className="mt-2 flex items-center text-xs text-blue-600">
                          <FileText className="h-3 w-3 mr-1" />
                          Page {item.page_number}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 ml-2">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
