"""
Hybrid PDF Text Extraction Module

This module provides a hybrid approach to PDF text extraction:
1. NanoNets docext: Advanced extraction with table preservation, LaTeX equations, 
   image descriptions, and semantic tagging (requires GPU for optimal performance)
2. PyPDF2: Basic text extraction as fallback (fast, lightweight, no GPU required)

The extraction method is controlled by the USE_NANONETS_EXTRACTION environment variable.
When NanoNets extraction fails, the system gracefully falls back to PyPDF2.

Environment Variables:
- USE_NANONETS_EXTRACTION: Set to 'true' to enable NanoNets, 'false' for PyPDF2 only
"""

import os
import io
import logging
from typing import Dict, Any
import PyPDF2

logger = logging.getLogger(__name__)

USE_NANONETS_EXTRACTION = os.getenv("USE_NANONETS_EXTRACTION", "false").lower() == "true"

try:
    from docext.core.pdf2md.pdf2md import convert_to_markdown
    NANONETS_AVAILABLE = True
    logger.info("NanoNets docext is available for enhanced PDF extraction")
except ImportError as e:
    NANONETS_AVAILABLE = False
    logger.warning(f"NanoNets docext not available: {e}. Will use PyPDF2 only.")

async def extract_with_nanonets(file_content: bytes, filename: str) -> Dict[str, Any]:
    """
    Extract text from PDF using NanoNets docext for enhanced extraction.
    Returns structured text with table preservation and enhanced formatting.
    
    Note: This requires a VLM server setup with VLM_MODEL_URL and API_KEY environment variables.
    """
    try:
        logger.info(f"Starting NanoNets docext extraction for {filename}")
        
        vlm_url = os.getenv("VLM_MODEL_URL", "")
        api_key = os.getenv("API_KEY", "")
        
        if not vlm_url or not api_key:
            raise ValueError("NanoNets docext requires VLM_MODEL_URL and API_KEY environment variables")
        
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            temp_file.write(file_content)
            temp_file.flush()
            temp_file_path = temp_file.name
        
        try:
            markdown_content = convert_to_markdown(
                file_inputs=[temp_file_path],
                model_name="hosted_vllm/default",
                max_img_size=1024,
                concurrency_limit=1,
                max_gen_tokens=8000
            )
            
            page_texts = {
                "1": markdown_content
            }
            
            logger.info(f"NanoNets extraction completed for {filename}")
            return {
                "page_texts": page_texts,
                "extraction_method": "nanonets",
                "total_pages": 1,
                "enhanced_features": ["tables", "equations", "images", "structured_formatting"]
            }
            
        finally:
            import os
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        
    except Exception as e:
        logger.error(f"NanoNets extraction failed for {filename}: {str(e)}")
        return {
            "page_texts": {},
            "extraction_method": "nanonets_failed",
            "total_pages": 0,
            "enhanced_features": []
        }

def extract_with_pypdf2(file_content: bytes) -> Dict[str, Any]:
    """
    Extract text from PDF using PyPDF2 (fallback method).
    Maintains existing page-by-page structure.
    """
    try:
        logger.info("Starting PyPDF2 extraction")
        
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        page_texts = {}
        
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text = page.extract_text()
            page_texts[str(page_num + 1)] = text  # 1-indexed pages
        
        logger.info(f"PyPDF2 extraction completed for {len(pdf_reader.pages)} pages")
        return {
            "page_texts": page_texts,
            "extraction_method": "pypdf2",
            "total_pages": len(pdf_reader.pages),
            "enhanced_features": []
        }
        
    except Exception as e:
        logger.error(f"PyPDF2 extraction failed: {str(e)}")
        return {
            "page_texts": {},
            "extraction_method": "pypdf2_failed",
            "total_pages": 0,
            "enhanced_features": []
        }

async def extract_pdf_text(file_content: bytes, filename: str) -> Dict[str, Any]:
    """
    Main hybrid extraction function with fallback mechanism.
    
    This function implements a robust hybrid approach:
    1. Checks if NanoNets extraction is enabled and available
    2. Attempts NanoNets extraction for enhanced features (tables, equations, images)
    3. Falls back to PyPDF2 if NanoNets fails or is unavailable
    4. Ensures consistent API response format regardless of extraction method
    
    Args:
        file_content: PDF file content as bytes
        filename: Original filename for logging purposes
        
    Returns:
        Dict containing page_texts, extraction_method, total_pages, and enhanced_features
    """
    if USE_NANONETS_EXTRACTION and NANONETS_AVAILABLE:
        logger.info("Attempting NanoNets docext extraction")
        nanonets_result = await extract_with_nanonets(file_content, filename)
        
        # Check if NanoNets extraction was successful
        if nanonets_result["extraction_method"] != "nanonets_failed" and nanonets_result["total_pages"] > 0:
            return nanonets_result
        else:
            logger.warning("NanoNets extraction failed, falling back to PyPDF2")
    elif USE_NANONETS_EXTRACTION and not NANONETS_AVAILABLE:
        logger.warning("NanoNets extraction requested but not available, using PyPDF2")
    
    logger.info("Using PyPDF2 extraction")
    return extract_with_pypdf2(file_content)
