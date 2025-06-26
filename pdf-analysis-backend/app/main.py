from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import PyPDF2
import google.generativeai as genai
import google.api_core.exceptions
from dotenv import load_dotenv
import os
import json
import logging
from typing import Dict, Any, List
import io
import requests

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY environment variable is not set")
    raise ValueError("GEMINI_API_KEY environment variable is required")

genai.configure(api_key=GEMINI_API_KEY)

class QuestionRequest(BaseModel):
    question: str
    pdf_text: Dict[str, str]  # page_number -> page_text

class SummarizeRequest(BaseModel):
    pdf_text: Dict[str, str]  # page_number -> page_text

pdf_storage = {}

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Handle PDF file upload and text extraction"""
    try:
        logger.info(f"Uploading PDF: {file.filename}")
        
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        content = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        
        page_texts = {}
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text = page.extract_text()
            page_texts[str(page_num + 1)] = text  # 1-indexed pages
        
        pdf_id = file.filename
        pdf_storage[pdf_id] = {
            "filename": file.filename,
            "page_texts": page_texts,
            "total_pages": len(pdf_reader.pages)
        }
        
        logger.info(f"Successfully processed PDF: {file.filename} with {len(pdf_reader.pages)} pages")
        
        return {
            "success": True,
            "pdf_id": pdf_id,
            "filename": file.filename,
            "total_pages": len(pdf_reader.pages),
            "page_texts": page_texts
        }
        
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}") from e

async def call_gemini(prompt: str, is_json: bool = False) -> Any:
    """Call Gemini API with proper error handling"""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        generation_config = {}
        if is_json:
            generation_config["response_mime_type"] = "application/json"
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config if generation_config else None
        )
        
        if not response.text:
            raise ValueError("No response from AI model")
        
        if is_json:
            text_response = response.text.replace('```json\n', '').replace('```', '').strip()
            return json.loads(text_response)
        
        return response.text
        
    except google.api_core.exceptions.GoogleAPIError as e:
        logger.error(f"Gemini API error: {str(e)}")
        raise ValueError(f"AI service error: {str(e)}") from e
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error: {str(e)}")
        raise ConnectionError(f"AI service error: {str(e)}") from e
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        raise ValueError(f"Invalid response format from AI service") from e
    except Exception as e:
        logger.error(f"Unexpected error in Gemini API call: {str(e)}")
        raise RuntimeError(f"AI service error: {str(e)}") from e

@app.post("/ask-question")
async def ask_question(request: QuestionRequest):
    """Implement the three-step AI process: Find Page -> Answer -> Highlight"""
    try:
        logger.info(f"Processing question: {request.question}")
        
        full_document_text = ""
        for page_num, page_text in request.pdf_text.items():
            full_document_text += f"\n\n[Page {page_num}]\n{page_text}"
        
        page_finder_prompt = f"""You are a search index. Analyze the document text and identify the single most relevant page number to answer the user's question.

**Full Document Text**:
---
{full_document_text}
---

**User Question**: "{request.question}"

**Instructions**: Respond with only a JSON object containing a single key "page_number". Example: {{"page_number": 12}}. If no page is relevant, return page_number 0."""
        
        logger.info("Step 1: Finding relevant page")
        page_result = await call_gemini(page_finder_prompt, True)
        source_page = page_result.get("page_number", 0)
        
        if not source_page or source_page == 0:
            return {
                "success": True,
                "answer": "I could not find a relevant page in this document to answer the question.",
                "source_quote": "",
                "page_number": 0
            }
        
        page_text = request.pdf_text.get(str(source_page), "")
        if not page_text:
            raise KeyError(f"Page {source_page} not found in document")
        
        generation_prompt = f"""Based *only* on the following Page Text, provide a concise and direct answer to the User Question.

**Page Text**: "{page_text}"

**User Question**: "{request.question}" """
        
        logger.info(f"Step 2: Generating answer from page {source_page}")
        final_answer = await call_gemini(generation_prompt)
        
        quote_finder_prompt = f"""You are a text analysis tool. Find the best, continuous, verbatim quote from the provided Page Text that directly supports the Answer.

**Answer**: "{final_answer}"

**Page Text**: "{page_text}"

**Instructions**: Respond with a JSON object containing a single key "source_quote". Example: {{"source_quote": "The results show a significant increase."}}"""
        
        logger.info("Step 3: Finding source quote")
        quote_result = await call_gemini(quote_finder_prompt, True)
        source_quote = quote_result.get("source_quote", "")
        
        logger.info(f"Successfully processed question. Answer from page {source_page}")
        
        return {
            "success": True,
            "answer": final_answer,
            "source_quote": source_quote,
            "page_number": source_page
        }
        
    except Exception as e:
        logger.error(f"Error processing question: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}") from e

@app.post("/summarize")
async def summarize_document(request: SummarizeRequest):
    """Generate PICOTT framework summary"""
    try:
        logger.info("Generating PICOTT summary")
        
        full_document_text = ""
        for page_num, page_text in request.pdf_text.items():
            full_document_text += f"\n\n[Page {page_num}]\n{page_text}"
        
        picott_prompt = f"""You are a highly specialized assistant for clinical and scientific research analysis. Your task is to extract specific information from the provided document text according to the PICOTT framework and other study criteria.

**Framework Definitions:**
- **P (Population/Problem):** Who are the patients or what is the problem?
- **I (Intervention):** What is the new treatment, test, or factor being considered?
- **C (Comparison):** What is the main alternative to the intervention (e.g., standard therapy, placebo)?
- **O (Outcome):** What is the result or effect being measured?
- **T (Time):** Over what period of time is the outcome being assessed?
- **T (Type of Study):** What is the study design (e.g., Randomized Controlled Trial, Cohort Study)?
- **Inclusion Criteria:** What criteria must subjects meet to be included?
- **Exclusion Criteria:** What criteria would disqualify subjects from the study?

**Full Document Text**:
---
{full_document_text}
---

**Instructions**:
1. Analyze the full document text.
2. For each element in the framework above, find the single best continuous quote that defines it.
3. Identify the page number for each quote based on the [Page X] markers.
4. Your response MUST be a single valid JSON object.
5. The JSON object must have keys: "population", "intervention", "comparison", "outcome", "time", "type_of_study", "inclusion_criteria", "exclusion_criteria".
6. The value for each key must be an object with three string keys: "text" (a concise summary of the finding), "quote" (the verbatim source quote), and "page_number" (the page number as an integer).
7. If you cannot find information for a specific element, the value for "text" and "quote" should be "Not found" and "page_number" should be 0."""
        
        summary_data = await call_gemini(picott_prompt, True)
        
        logger.info("Successfully generated PICOTT summary")
        
        return {
            "success": True,
            "summary": summary_data
        }
        
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}") from e
