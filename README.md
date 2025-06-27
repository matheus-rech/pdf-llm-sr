# PDF Analysis Application

A React-based PDF analysis application that expands upon the existing HTML proof-of-concept for healthcare professionals to analyze PDF documents with AI assistance.

## Features

- **PDF Upload**: Upload PDF documents for analysis
- **Hybrid Text Extraction**: Advanced PDF processing with dual extraction methods:
  - **NanoNets docext**: Enhanced extraction with table preservation, LaTeX equations, image descriptions, and structured formatting
  - **PyPDF2**: Fast, reliable fallback extraction for basic text processing
- **AI-Powered Q&A**: Ask questions about the PDF content using Gemini AI
- **Three-Step AI Process**: 
  1. Find relevant pages containing information
  2. Generate comprehensive answers
  3. Highlight source passages (planned)
- **PICOTT Framework**: Population, Intervention, Comparison, Outcomes, Time frame, Study Types analysis
- **React Frontend**: Modern, responsive user interface
- **FastAPI Backend**: High-performance API with detailed logging

## Architecture

- **Frontend**: React with TypeScript and Tailwind CSS
- **Backend**: FastAPI with Python 3.12+
- **PDF Processing**: Hybrid extraction using NanoNets docext and PyPDF2
- **AI Integration**: Google Gemini API for question answering

## Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd pdf-analysis-backend
```

2. Install dependencies using Poetry:
```bash
poetry install
```

3. Create a `.env` file with your configuration:
```bash
# Required: Gemini API key for AI processing
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: PDF text extraction method
# Set to 'true' to enable enhanced extraction with NanoNets docext (requires VLM server)
# Set to 'false' to use PyPDF2 for basic text extraction (default, recommended)
USE_NANONETS_EXTRACTION=false

# Optional: VLM server configuration (only needed if USE_NANONETS_EXTRACTION=true)
# VLM_MODEL_URL=your_vlm_server_url
# API_KEY=your_vlm_api_key
```

4. Run the FastAPI server:
```bash
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd pdf-analysis-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
VITE_API_URL=http://localhost:8002
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### POST /upload-pdf
Upload a PDF file for processing with hybrid text extraction.

**Request**: Multipart form data with PDF file
**Response**: JSON with extracted text, metadata, and extraction method information
```json
{
  "success": true,
  "pdf_id": "document.pdf",
  "filename": "document.pdf",
  "total_pages": 19,
  "extraction_method": "pypdf2",
  "enhanced_features": [],
  "page_texts": {...}
}
```

### POST /ask-question
Ask a question about the uploaded PDF using AI analysis.

**Request**: JSON with question and PDF ID
**Response**: JSON with AI-generated answer and sources

## Text Extraction Methods

### PyPDF2 (Default)
- **Pros**: Fast, lightweight, no external dependencies
- **Cons**: Basic text extraction, may struggle with complex layouts
- **Use case**: General document processing, quick extraction

### NanoNets docext (Advanced)
- **Pros**: Table preservation, LaTeX equations, image descriptions, structured formatting
- **Cons**: Requires VLM server setup, more complex configuration
- **Use case**: Academic papers, complex documents with tables and equations

The system automatically falls back to PyPDF2 if NanoNets is unavailable or misconfigured.

## Performance

Based on testing with a 735KB academic paper (19 pages):
- **PyPDF2**: ~0.61s extraction time, 1184 KB/s throughput
- **NanoNets**: Performance varies based on VLM server configuration

## Development

### Testing Extraction Performance
```bash
cd pdf-analysis-backend
poetry run python test_extraction_performance.py
```

### Environment Variables
- `GEMINI_API_KEY`: Required for AI question answering
- `USE_NANONETS_EXTRACTION`: Enable/disable advanced extraction (default: false)
- `VLM_MODEL_URL`: VLM server URL for NanoNets extraction
- `API_KEY`: API key for VLM server access

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test both extraction methods
4. Submit a pull request

## License

This project is licensed under the Apache-2.0 License.
