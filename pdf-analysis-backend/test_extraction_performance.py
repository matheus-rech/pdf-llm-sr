#!/usr/bin/env python3
"""
Test script to measure PDF extraction performance and logging
"""
import asyncio
import time
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from text_extractors import extract_pdf_text

async def test_extraction_performance():
    """Test extraction performance and logging with the diabetes research PDF"""
    pdf_path = os.getenv('PDF_PATH', os.path.join(os.path.dirname(__file__), 'fixtures', 'jama_kalyani_2025_rv_250015_1750086120.40564.pdf'))
    
    if not os.path.isfile(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        return
    
    with open(pdf_path, 'rb') as f:
        content = f.read()
    
    print("Testing PDF extraction performance...")
    print(f"PDF file size: {len(content)} bytes")
    print("-" * 50)
    
    start_time = time.time()
    result = await extract_pdf_text(content, 'jama_kalyani_2025_rv_250015_1750086120.40564.pdf')
    extraction_time = time.time() - start_time
    
    print(f"Extraction method: {result['extraction_method']}")
    print(f"Extraction time: {extraction_time:.2f}s")
    print(f"Total pages: {result['total_pages']}")
    print(f"Enhanced features: {result['enhanced_features']}")
    print(f"Performance: {len(content) / (1024 * extraction_time):.2f} KB/s")
    
    first_page = result['page_texts'].get('1', '')
    print(f"First page content preview (first 200 chars):")
    print(f"'{first_page[:200]}...'")
    
    print("-" * 50)
    print("Performance test completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_extraction_performance())
