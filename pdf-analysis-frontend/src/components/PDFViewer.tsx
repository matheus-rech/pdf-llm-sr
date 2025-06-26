import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PDFViewerProps {
  pdfData: {
    filename: string;
    total_pages: number;
    page_texts: Record<string, string>;
  } | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  highlights: Array<{
    page: number;
    text: string;
  }>;
  pdfFile?: File | null;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfData,
  currentPage,
  onPageChange,
  highlights,
  pdfFile
}) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pageTextContents, setPageTextContents] = useState<any[]>([]);
  const [pageRendering, setPageRendering] = useState(false);

  useEffect(() => {
    if (pdfFile) {
      loadAndParsePdf();
    }
  }, [pdfFile]);

  useEffect(() => {
    if (pdfDoc && currentPage && !pageRendering) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, highlights]);

  const loadAndParsePdf = async () => {
    if (!pdfFile) return;
    
    setIsLoading(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDocument = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      setPdfDoc(pdfDocument);
      
      await parseAllPages(pdfDocument);
      await renderPage(1, pdfDocument);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      setIsLoading(false);
    }
  };

  const parseAllPages = async (pdfDocument: any) => {
    const textContents: any[] = [];
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      textContents[i] = textContent.items;
    }
    setPageTextContents(textContents);
  };

  const renderPage = async (pageNum: number, pdfDocument?: any) => {
    if (pageRendering) return;
    
    const doc = pdfDocument || pdfDoc;
    if (!doc || !canvasContainerRef.current) return;

    setPageRendering(true);
    
    try {
      canvasContainerRef.current.innerHTML = '';
      
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      canvas.id = 'pdf-canvas';
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.className = 'max-w-full h-auto border';
      
      canvasContainerRef.current.appendChild(canvas);
      
      const context = canvas.getContext('2d');
      if (context) {
        await page.render({ canvasContext: context, viewport: viewport }).promise;
      }
      
      drawHighlights(pageNum);
      
    } catch (error) {
      console.error('Error rendering page:', error);
    } finally {
      setPageRendering(false);
    }
  };

  const drawHighlights = async (pageNum: number) => {
    const pageHighlights = highlights.filter(h => h.page === pageNum);
    if (pageHighlights.length === 0 || !pdfDoc || !canvasContainerRef.current) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const itemsToHighlight = await findQuoteItemsOnPage(pageHighlights[0].text, pageNum);
      
      itemsToHighlight.forEach((item: any) => {
        const [,, , , x, y] = item.transform;
        const highlight = document.createElement('div');
        highlight.className = 'absolute bg-yellow-300 bg-opacity-50 border-l-4 border-orange-500 pointer-events-none';
        highlight.style.left = `${x}px`;
        highlight.style.top = `${viewport.height - y}px`;
        highlight.style.width = `${item.width}px`;
        highlight.style.height = `${item.height}px`;
        highlight.style.transform = `translateY(-100%)`;
        
        if (canvasContainerRef.current) {
          canvasContainerRef.current.appendChild(highlight);
        }
      });
    } catch (error) {
      console.error('Error drawing highlights:', error);
    }
  };

  const findQuoteItemsOnPage = async (quote: string, pageNum: number) => {
    if (!pageTextContents[pageNum] || !quote) return [];
    
    const items = pageTextContents[pageNum];
    const matchingItems: any[] = [];
    
    const quoteWords = quote.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    items.forEach((item: any) => {
      const itemText = item.str.toLowerCase();
      if (quoteWords.some(word => itemText.includes(word))) {
        matchingItems.push(item);
      }
    });
    
    return matchingItems;
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (pdfData && currentPage < pdfData.total_pages) {
      onPageChange(currentPage + 1);
    }
  };

  if (!pdfData && !pdfFile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No PDF uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Document: {pdfData?.filename || pdfFile?.name || 'Unknown'}
      </h2>
      
      <Tabs defaultValue="viewer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="viewer">Viewer</TabsTrigger>
          <TabsTrigger value="text">Plain Text</TabsTrigger>
        </TabsList>
        
        <TabsContent value="viewer" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {pdfData?.total_pages || (pdfDoc?.numPages || 1)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage >= (pdfData?.total_pages || (pdfDoc?.numPages || 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="border rounded-lg p-4 bg-gray-50">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading PDF...</p>
              </div>
            ) : (
              <div className="relative" ref={canvasContainerRef}>
                {!pdfDoc && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Upload a PDF to view it here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="text" className="space-y-4">
          <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
            <h3 className="font-medium mb-2">Page {currentPage}</h3>
            <pre className="whitespace-pre-wrap text-sm text-gray-700">
              {pdfData?.page_texts[currentPage.toString()] || 
               (pageTextContents[currentPage] ? 
                 pageTextContents[currentPage].map((item: any) => item.str).join(' ') : 
                 'No text content available')}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
