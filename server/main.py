import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import base64
from io import BytesIO
from PIL import Image
from skimage.metrics import structural_similarity as ssim
import cv2

app = FastAPI()

class FrameCompareRequest(BaseModel):
    current_frame: str  # base64 encoded image
    previous_frame: str | None = None  # base64 encoded image, optional

def base64_to_numpy(base64_string: str) -> np.ndarray:
    """Convert base64 image to numpy array."""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
            
        # Decode base64 to image
        img_data = base64.b64decode(base64_string)
        img = Image.open(BytesIO(img_data))
        
        # Convert to grayscale for SSIM comparison
        img_gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
        return img_gray
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

@app.post("/compare-frames")
async def compare_frames(request: FrameCompareRequest):
    try:
        current_frame = base64_to_numpy(request.current_frame)
        
        # First frame case
        if not request.previous_frame:
            return {
                "has_changed": True,
                "similarity_score": 0.2
            }
        
        previous_frame = base64_to_numpy(request.previous_frame)
        
        # Resize if dimensions don't match
        if current_frame.shape != previous_frame.shape:
            current_frame = cv2.resize(current_frame, (previous_frame.shape[1], previous_frame.shape[0]))
        
        # Calculate similarity
        similarity_score = ssim(current_frame, previous_frame)
        
        # Convert numpy types to Python native types
        similarity_score_float = float(similarity_score)
        threshold = 0.6
        has_changed_bool = similarity_score_float < threshold
        
        # Return Python native types
        return {
            "has_changed": has_changed_bool,
            "similarity_score": similarity_score_float
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error comparing frames: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

