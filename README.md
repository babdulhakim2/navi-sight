# Navi Sight 👁️

Navi Sight is an AI-powered visual assistance application designed to help visually impaired individuals navigate their environment through real-time scene interpretation and audio feedback.

## Features 🌟

- Real-time video stream processing
- Intelligent scene interpretation using Google's Gemini Vision AI
- Natural text-to-speech using Eleven Labs
- Smart frame comparison to detect significant changes
- Multi-camera support with automatic rear camera detection
- Optimized for mobile devices

## Prerequisites 📋

Before running the application, make sure you have:

- Node.js 18+ installed
- Python 3.8+ installed
- pip (Python package manager)
- A Google Gemini API key
- An Eleven Labs API key

## Installation 🚀

1. Clone the repository:

```bash
git clone <repository-url>
cd navi-sight
```

2. Install Node.js dependencies:

```bash
npm install
# or
yarn install
```

3. Set up Python environment and dependencies:

```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

4. Create a `.env.local` file in the root directory with your API keys:

```env
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

## Running the Application 🏃‍♂️

1. Start the Python server (in the server directory):

```bash
python main.py
```

2. In a new terminal, start the Next.js development server:

```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works 🔍

1. The application captures video frames from your device's camera
2. Each frame is compared with the previous frame using SSIM (Structural Similarity Index)
3. When significant changes are detected, the frame is sent to Google's Gemini Vision AI
4. Gemini analyzes the scene and provides detailed descriptions
5. The description is converted to speech using Eleven Labs' API
6. The audio description is played back to the user

## Usage 📱

1. Grant camera permissions when prompted
2. Select your preferred camera if multiple are available
3. Click "Start Stream" to begin processing
4. Position the camera to capture your surroundings
5. Listen to the audio descriptions of the scene

## Technical Details 🛠️

- Frontend: Next.js 14 with TypeScript
- Backend: Python FastAPI for frame comparison
- AI Services:
  - Google Gemini Vision AI for image interpretation
  - Eleven Labs for text-to-speech conversion
- Frame Comparison: SSIM (Structural Similarity Index) algorithm
- Real-time processing with optimized frame selection

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

[MIT License](LICENSE)
