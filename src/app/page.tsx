"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Camera, Pause, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const VideoProcessor = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previousFrameRef = useRef<string | null>(null);
  const lastInterpretationRef = useRef<string>('');
  const isProcessingRef = useRef<boolean>(false);

  // Get list of available cameras
  const getCameraDevices = async () => {
    try {
      // Request camera permission first
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      if (videoDevices.length === 0) {
        setError('No camera devices found');
        return;
      }
      
      // Try to select rear camera by default on mobile
      const rearCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      );
      setSelectedDevice(rearCamera?.deviceId || videoDevices[0].deviceId);
    } catch (err) {
      console.error('Error getting camera devices:', err);
      setError('Failed to get camera devices. Please grant camera permissions.');
    }
  };

  // Initialize camera list on component mount
  useEffect(() => {
    getCameraDevices();
  }, []);

  // Initialize camera stream
  const startStream = async () => {
    try {
      if (!selectedDevice) {
        throw new Error('No camera device selected');
      }

      const constraints = {
        video: {
          deviceId: { exact: selectedDevice },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Prefer rear camera
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      setError('Failed to access camera. Please ensure you have granted camera permissions.');
      console.error('Error accessing camera:', err);
    }
  };

  // Stop the video stream
  const stopStream = () => {
    if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  // Handle camera device change
  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDevice(deviceId);
    if (isStreaming) {
      stopStream();
      await startStream();
    }
  };

  const playTextToSpeech = async (text: string) => {
    try {
      // Don't try to play empty text
      if (!text.trim()) return;

      // Add retry logic
      let retries = 1;
      let lastError;

      while (retries > 0) {
        try {
          const response = await fetch('/api/eleven-labs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate speech');
          }

          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);

          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            await audioRef.current.play();
          }
          return; // Success, exit the function
        } catch (err) {
          lastError = err;
          retries--;
          if (retries > 0) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, (3 - retries) * 1000));
          }
        }
      }

      // If we get here, all retries failed
      throw lastError;
    } catch (err) {
      console.error('Error playing text-to-speech:', err);
      setError('Failed to play audio. Please try again.');
    }
  };

  // Modify the processFrame function
  const processFrame = async () => {
    if (!isStreaming || !videoRef.current || !canvasRef.current) return;
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) return;
    if (isProcessingRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    const video = videoRef.current;

    // Match canvas size to video
    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // Get current frame as base64
    const currentFrame = canvasRef.current.toDataURL('image/jpeg', 0.8);

    try {
      // Only send previous frame if it exists
      const payload = {
        currentFrame,
        ...(previousFrameRef.current && { previousFrame: previousFrameRef.current })
      };

      // Compare frames using SSIM endpoint
      const ssimResponse = await fetch('/api/ssim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!ssimResponse.ok) {
        throw new Error('Failed to compare frames');
      }

      const { has_changed } = await ssimResponse.json();

      // Only process if frame has changed significantly
      if (has_changed) {
        isProcessingRef.current = true;
        
        try {
          // Send frame to Gemini Vision API with previous interpretation
          const response = await fetch('/api/gemini-vision', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              image: currentFrame,
              previousInterpretation: lastInterpretationRef.current,
              prompt: "What do you see in this image? If you see any text, please read it out loud. If you see any objects that might be obstacles, please describe their location. Please return plain text only without any markdown or HTML."
            })
          });

          if (!response.ok) throw new Error('Gemini Vision API request failed');

          const data = await response.json();
          
          // Only update and speak if interpretation is different
          if (data.interpretation !== lastInterpretationRef.current) {
            setInterpretation(data.interpretation);
            lastInterpretationRef.current = data.interpretation;
            await playTextToSpeech(data.interpretation);
          }
        } catch (err) {
          console.error('Error processing frame with Gemini Vision:', err);
          setInterpretation('Failed to analyze frame');
        } finally {
          isProcessingRef.current = false;
        }

        // Update previous frame only after successful processing
        previousFrameRef.current = currentFrame;
      }

      // Schedule next frame check
      if (isStreaming) {
        requestAnimationFrame(processFrame);
      }
    } catch (error) {
      console.error('Error in SSIM comparison:', error);
      isProcessingRef.current = false;
      requestAnimationFrame(processFrame);
    }
  };

  // Start processing frames when streaming begins
  useEffect(() => {
    if (isStreaming) {
      // Add initial delay to ensure video is ready
      setTimeout(() => {
        processFrame();
      }, 5000); // Wait 1 second before starting
    }
  }, [isStreaming]);

  // Update cleanup
  useEffect(() => {
    return () => {
      stopStream();
      previousFrameRef.current = null;
      lastInterpretationRef.current = '';
      isProcessingRef.current = false;
    };
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-6 h-6" />
          Navi Sight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {devices.length > 1 && (
          <Select value={selectedDevice} onValueChange={handleDeviceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${devices.indexOf(device) + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />
        </div>

        <div className="flex justify-center gap-2">
          {!isStreaming ? (
            <Button onClick={startStream} className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Start Stream
            </Button>
          ) : (
            <Button onClick={stopStream} variant="destructive" className="flex items-center gap-2">
              <Pause className="w-4 h-4" />
              Stop Stream
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {interpretation && (
          <div className="p-4 bg-slate-100 rounded-lg">
            <h3 className="font-semibold mb-2">Interpretation:</h3>
            <p>{interpretation}</p>
          </div>
        )}

        <audio ref={audioRef} className="hidden" />
      </CardContent>
    </Card>
  );
};

export default VideoProcessor;