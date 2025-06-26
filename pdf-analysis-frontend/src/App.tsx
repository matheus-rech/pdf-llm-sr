import { useState, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from './components/ui/button';
import { PDFUpload } from './components/PDFUpload';
import { PDFViewer } from './components/PDFViewer';
import { QuestionForm } from './components/QuestionForm';
import { AnswerDisplay } from './components/AnswerDisplay';
import { History } from './components/History';
import { ErrorBoundary } from './components/ErrorBoundary';

interface PDFData {
  filename: string;
  total_pages: number;
  page_texts: Record<string, string>;
}

interface Answer {
  question: string;
  answer: string;
  source_quote: string;
  page_number: number;
  timestamp: string;
}

interface HistoryItem extends Answer {
  id: string;
  pageSnapshot?: string;
  pdfName?: string;
}

interface Summary {
  population: { text: string; quote: string; page_number: number };
  intervention: { text: string; quote: string; page_number: number };
  comparison: { text: string; quote: string; page_number: number };
  outcome: { text: string; quote: string; page_number: number };
  time: { text: string; quote: string; page_number: number };
  type_of_study: { text: string; quote: string; page_number: number };
  inclusion_criteria: { text: string; quote: string; page_number: number };
  exclusion_criteria: { text: string; quote: string; page_number: number };
}

function App() {
  const [pdfData, setPdfData] = useState<PDFData | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentAnswer, setCurrentAnswer] = useState<Answer | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const savedHistory = localStorage.getItem('pdf_qa_history');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error('Error loading history from localStorage:', error);
      return [];
    }
  });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const saveHistoryToStorage = useCallback((historyItems: HistoryItem[]) => {
    try {
      localStorage.setItem('pdf_qa_history', JSON.stringify(historyItems));
    } catch (error) {
      console.error('Error saving history to localStorage:', error);
    }
  }, []);

  const capturePageSnapshot = useCallback(async (): Promise<string> => {
    try {
      const canvas = document.getElementById('pdf-canvas') as HTMLCanvasElement;
      if (canvas) {
        return canvas.toDataURL('image/jpeg', 0.8);
      }
    } catch (error) {
      console.error('Error capturing page snapshot:', error);
    }
    return '';
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/upload-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setPdfData({
          filename: data.filename,
          total_pages: data.total_pages,
          page_texts: data.page_texts,
        });
        setPdfFile(file);
        setCurrentPage(1);
        setCurrentAnswer(null);
        setSummary(null);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      alert(`Error uploading PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  }, [API_URL]);

  const handleSubmitQuestion = useCallback(async (question: string) => {
    if (!pdfData) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`${API_URL}/ask-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          pdf_text: pdfData.page_texts,
        }),
      });

      if (!response.ok) {
        throw new Error(`Question processing failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        const answer: Answer = {
          question,
          answer: data.answer,
          source_quote: data.source_quote,
          page_number: data.page_number,
          timestamp: new Date().toISOString(),
        };

        setCurrentAnswer(answer);

        const pageSnapshot = await capturePageSnapshot();
        const historyItem: HistoryItem = {
          ...answer,
          id: Date.now().toString(),
          pageSnapshot,
          pdfName: pdfData.filename,
        };
        const newHistory = [historyItem, ...history];
        setHistory(newHistory);
        saveHistoryToStorage(newHistory);

        if (data.page_number > 0) {
          setCurrentPage(data.page_number);
        }
      } else {
        throw new Error('Question processing failed');
      }
    } catch (error) {
      console.error('Error processing question:', error);
      alert(`Error processing question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [pdfData, API_URL]);

  const handleSummarize = useCallback(async () => {
    if (!pdfData) return;

    setIsSummarizing(true);
    try {
      const response = await fetch(`${API_URL}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_text: pdfData.page_texts,
        }),
      });

      if (!response.ok) {
        throw new Error(`Summarization failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setSummary(data.summary);
      } else {
        throw new Error('Summarization failed');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      alert(`Error generating summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSummarizing(false);
    }
  }, [pdfData, API_URL]);

  const handleSelectHistoryItem = useCallback((item: HistoryItem) => {
    if (item.pdfName && pdfData && item.pdfName !== pdfData.filename) {
      alert(`Please upload the correct PDF to view this history item: ${item.pdfName}`);
      return;
    }
    
    setCurrentAnswer(item);
    if (item.page_number > 0) {
      setCurrentPage(item.page_number);
    }
  }, [pdfData]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    saveHistoryToStorage([]);
  }, [saveHistoryToStorage]);

  const handleGoToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const highlights = currentAnswer && currentAnswer.source_quote ? [{
    page: currentAnswer.page_number,
    text: currentAnswer.source_quote,
  }] : [];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Advanced Document Q&A</h1>
            <p className="text-md text-gray-600 mt-2">Using a three-step "Find Page → Answer → Highlight" approach for high accuracy.</p>
          </header>

          <main className="bg-white p-6 rounded-lg shadow-lg">
            <PDFUpload
              onFileUpload={handleFileUpload}
              isUploading={isUploading}
            />

            {pdfData && (
              <>
                <PDFViewer
                  pdfData={pdfData}
                  pdfFile={pdfFile}
                  currentPage={currentPage}
                  onPageChange={handleGoToPage}
                  highlights={highlights}
                />

                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">AI Tools</h2>
                    <Button
                      onClick={handleSummarize}
                      disabled={isSummarizing}
                      variant="outline"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isSummarizing ? 'Generating...' : 'PICOTT Summary'}
                    </Button>
                  </div>

                  <QuestionForm
                    onSubmitQuestion={handleSubmitQuestion}
                    isProcessing={isProcessing}
                    disabled={!pdfData}
                  />

                  {currentAnswer && (
                    <AnswerDisplay
                      currentAnswer={currentAnswer}
                      onGoToPage={handleGoToPage}
                    />
                  )}

                  {summary && (
                    <div className="mb-8">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">PICOTT Framework Summary</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(['population', 'intervention', 'comparison', 'outcome', 'time', 'type_of_study', 'inclusion_criteria', 'exclusion_criteria'] as const).map((key) => {
                          const summaryValue = summary![key];
                          return (
                            <div key={key} className="border rounded-lg p-4">
                              <h3 className="font-medium text-gray-900 mb-2 capitalize">
                                {key.replace('_', ' ')}
                              </h3>
                              <p className="text-sm text-gray-700 mb-2">{summaryValue.text}</p>
                              {summaryValue.quote !== "Not found" && (
                                <blockquote className="text-xs text-gray-600 italic border-l-2 border-gray-300 pl-2">
                                  "{summaryValue.quote}"
                                  {summaryValue.page_number > 0 && (
                                    <span className="block mt-1 not-italic">
                                      - Page {summaryValue.page_number}
                                    </span>
                                  )}
                                </blockquote>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <History
                    history={history}
                    onSelectHistoryItem={handleSelectHistoryItem}
                    onClearHistory={handleClearHistory}
                  />
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
