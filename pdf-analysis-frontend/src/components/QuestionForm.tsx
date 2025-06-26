import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface QuestionFormProps {
  onSubmitQuestion: (question: string) => void;
  isProcessing: boolean;
  disabled: boolean;
}

export const QuestionForm: React.FC<QuestionFormProps> = ({
  onSubmitQuestion,
  isProcessing,
  disabled
}) => {
  const [question, setQuestion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isProcessing && !disabled) {
      onSubmitQuestion(question.trim());
      setQuestion('');
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Ask a Question</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question about the document..."
            className="min-h-[100px] resize-none"
            disabled={disabled || isProcessing}
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!question.trim() || disabled || isProcessing}
            className="min-w-[120px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Ask Question
              </>
            )}
          </Button>
        </div>
      </form>
      
      {disabled && (
        <p className="text-sm text-gray-500 mt-2">
          Please upload a PDF document first to ask questions.
        </p>
      )}
    </div>
  );
};
