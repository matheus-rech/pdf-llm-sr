import React from 'react';
import { Quote, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Answer {
  question: string;
  answer: string;
  source_quote: string;
  page_number: number;
  timestamp: string;
}

interface AnswerDisplayProps {
  currentAnswer: Answer | null;
  onGoToPage: (page: number) => void;
}

export const AnswerDisplay: React.FC<AnswerDisplayProps> = ({
  currentAnswer,
  onGoToPage
}) => {
  if (!currentAnswer) {
    return null;
  }

  const handleGoToSource = () => {
    if (currentAnswer.page_number > 0) {
      onGoToPage(currentAnswer.page_number);
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Answer</h2>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-gray-800">
            {currentAnswer.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Response:</h4>
            <p className="text-gray-700 leading-relaxed">
              {currentAnswer.answer}
            </p>
          </div>
          
          {currentAnswer.source_quote && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <Quote className="h-4 w-4 mr-1" />
                Source Quote:
              </h4>
              <blockquote className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r">
                <p className="text-gray-700 italic">
                  "{currentAnswer.source_quote}"
                </p>
                {currentAnswer.page_number > 0 && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGoToSource}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Go to Page {currentAnswer.page_number}
                    </Button>
                  </div>
                )}
              </blockquote>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            Asked at {new Date(currentAnswer.timestamp).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
