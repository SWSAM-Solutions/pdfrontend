import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { drawConnectors } from "@mediapipe/drawing_utils";
import { Card } from '@/components/ui/card';
import { Camera, Ruler } from 'lucide-react';
import { toast } from 'sonner';
import * as cam from "@mediapipe/camera_utils";
import "@/assets/css/style.css"
import axios from 'axios';
import DisplayResults from "./DisplayResults";
interface PDResults {
  pd_mm: number;
  confidence: number;
}

interface DisplayResultsProps {
  showResults: boolean;
  pdResults?: { data?: PDResults };
}



const PDMeasurement: React.FC = () => {
  const webcamRef = useRef<Webcam | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceMeshRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const cameraRunningRef = useRef<boolean>(false);
  const [showCanvasState, setShowCanvasState] = useState<boolean>(false);
  const messageRef = useRef<string | null>(null);
  const resultsRef = useRef<any | null>(null);
  const countdownRef = useRef<number>(3);
  const showingCountdownRef = useRef<boolean>(false);
  const positionHistory = useRef<[number, number][]>([]);
  const [stableFrameCount, setStableFrameCount] = useState(0);
  const [measurementInProgress, setMeasurementInProgress] = useState(false);
  const [pdResults, setPdResults] = useState<any>(null);

  const [showGuidance, setShowGuidance] = useState(true);
const [isCountingDown, setIsCountingDown] = useState(false);
const [countdownValue, setCountdownValue] = useState(3);
const [showResults, setShowResults] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);
const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

const [guideMessage, setGuideMessage] = useState<string>("");

  // Constants
  // Replace these constants
const STABILITY_THRESHOLD = 30;
const isMobile = window.innerWidth < 640;
const frameWidth = isMobile ? Math.min(window.innerWidth - 32, 640) : 640;
// Use 3:4 aspect ratio for mobile and 4:3 for desktop
const frameHeight = isMobile ? frameWidth * (3/4) : frameWidth * 0.75;
const faceWidthRatio = isMobile ? 0.4 : 0.35;  // Slightly larger for mobile
const faceHeightRatio = isMobile ? 0.5 : 0.65;  // Smaller height ratio for mobile
const positionTolerance = isMobile ? 0.08 : 0.05;
const sizeTolerance = isMobile ? 0.2 : 0.15;
const LEFT_IRIS = [474, 475, 476, 477];
const RIGHT_IRIS = [469, 470, 471, 472];
const historySize = 5;

  const FACE_MESH_PATH = '/mediapipe/face_mesh';
  const captureImage = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      return imageSrc;
    }
    return null;
  };

  const cleanupCamera = async () => {
    // Cancel any ongoing animation frame
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  
    // Clean up video stream
    if (webcamRef.current && webcamRef.current.video) {
      const stream = webcamRef.current.video.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      webcamRef.current.video.srcObject = null;
    }
  
    // Reset states
    cameraRunningRef.current = false;
    setShowCanvasState(false);
    setShowGuidance(false);
    setIsCountingDown(false);
    setMeasurementInProgress(false);
  
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const drawFaceGuide = (ctx: CanvasRenderingContext2D) => {
    // Save the current context state
    ctx.save();
    // Reset any transformations
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const centerX = frameWidth / 2;
    const centerY = frameHeight / 2;
    const faceWidth = frameWidth * faceWidthRatio;
    const faceHeight = frameHeight * faceHeightRatio;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const topY = centerY - faceHeight/2;
    const bottomY = centerY + faceHeight/2;
    const leftX = centerX - faceWidth/2;
    const rightX = centerX + faceWidth/2;
    
    ctx.moveTo(leftX + faceWidth/6, topY + faceHeight/6);
    ctx.bezierCurveTo(
      leftX + faceWidth/3, topY,
      rightX - faceWidth/3, topY,
      rightX - faceWidth/6, topY + faceHeight/6
    );
    ctx.bezierCurveTo(
      rightX, topY + faceHeight/3,
      rightX, bottomY - faceHeight/3,
      rightX - faceWidth/4, bottomY - faceHeight/8
    );
    ctx.bezierCurveTo(
      rightX - faceWidth/3, bottomY,
      leftX + faceWidth/3, bottomY,
      leftX + faceWidth/4, bottomY - faceHeight/8
    );
    ctx.bezierCurveTo(
      leftX, bottomY - faceHeight/3,
      leftX, topY + faceHeight/3,
      leftX + faceWidth/6, topY + faceHeight/6
    );
    ctx.stroke();
    
    // Restore the context state
    ctx.restore();
  };

  

  const sendMeasurementToAPI = async (landmarks: any[], imageData: string) => {
    try {
      setIsProcessing(true);
      const landmarkData = {};
      landmarks.forEach((landmark, index) => {
        landmarkData[index] = {
          x: landmark.x,
          y: landmark.y,
          z: landmark.z
        };
      });
  
      const response = await axios.post('https://pdcalculator-611846019618.us-central1.run.app/calculate_pd', {
        landmarks: landmarkData,
        image: imageData
      });
  
      if (response.data.status === 'success') {
        // Just show results, keep camera running
        setPdResults(response);
        setShowResults(true);
        setIsCountingDown(false);
        setMeasurementInProgress(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('API Error:', error);
      toast.error('Failed to process measurement');
      setIsCountingDown(false);
      setMeasurementInProgress(false);
      return false;
    }
  };

  const startMeasurementCountdown = (landmarks:any, imageData:any) => {
    if (countdownIntervalRef.current) return; // Prevent multiple timers
    if (countdownIntervalRef.current || isCountingDown) {
      return;
    }

    // Don't stop the camera immediately, wait until countdown finishes
    setIsCountingDown(true);
    setCountdownValue(3);
    
    let count = 3;
    countdownIntervalRef.current = setInterval(async () => {
      if (count > 0) {
        setCountdownValue(count);
        count--;
      } else {
        // Clean up interval
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        
        // Stop camera and process measurement
        stopCamera();
 
        setCountdownValue(3);
        
        // Send to API
     await    sendMeasurementToAPI(landmarks, imageData).then(success => {
          if (!success) {
            cleanupAllStates();
          } else {
            cleanupAllStates();
            setMeasurementInProgress(false);
            setShowResults(true);
            setIsCountingDown(false);
          }
        });
      }
    }, 1000);
  };


  
  const CountdownOverlay = ({ value }) => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
      <div className="text-8xl font-bold text-white bg-black/50 w-32 h-32 rounded-full flex items-center justify-center">
        {value}
      </div>
    </div>
  );
  
  const cleanupAllStates = () => {
    setMeasurementInProgress(false);
    setIsCountingDown(false);
    setCountdownValue(3);
    setShowResults(false);
    setIsProcessing(false);
    setShowGuidance(false);
  
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  





  const drawPupils = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    // Save the current context state
    ctx.save();
    // Reset any transformations
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Validate input
    if (!ctx || !Array.isArray(landmarks) || landmarks.length === 0) {
      ctx.restore();
      return;
    }

    // Safely get iris points with validation
    const getIrisPoints = (indices: number[]) => {
      return indices
        .map(index => landmarks[index])
        .filter(point => point && typeof point.x === 'number' && typeof point.y === 'number')
        .map(point => ({
          x: (1 - point.x) * frameWidth, // Flip x-coordinate
          y: point.y * frameHeight
        }));
    };

    const leftIrisPoints = getIrisPoints(LEFT_IRIS);
    const rightIrisPoints = getIrisPoints(RIGHT_IRIS);

    // Verify we have enough points to draw
    if (leftIrisPoints.length !== 4 || rightIrisPoints.length !== 4) {
      ctx.restore();
      return;
    }

    const leftCenter = {
      x: leftIrisPoints.reduce((sum, point) => sum + point.x, 0) / 4,
      y: leftIrisPoints.reduce((sum, point) => sum + point.y, 0) / 4
    };
    const rightCenter = {
      x: rightIrisPoints.reduce((sum, point) => sum + point.x, 0) / 4,
      y: rightIrisPoints.reduce((sum, point) => sum + point.y, 0) / 4
    };

    // Draw pupils with fill and stroke
    ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.lineWidth = 2;

    // Calculate iris radius (approximate from points)
    const leftRadius = Math.max(
      ...leftIrisPoints.map(point => 
        Math.sqrt(Math.pow(point.x - leftCenter.x, 2) + Math.pow(point.y - leftCenter.y, 2))
      )
    );
    const rightRadius = Math.max(
      ...rightIrisPoints.map(point => 
        Math.sqrt(Math.pow(point.x - rightCenter.x, 2) + Math.pow(point.y - rightCenter.y, 2))
      )
    );

    // Draw left iris
    ctx.beginPath();
    ctx.arc(leftCenter.x, leftCenter.y, leftRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw right iris
    ctx.beginPath();
    ctx.arc(rightCenter.x, rightCenter.y, rightRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw center points
    ctx.fillStyle = 'rgba(0, 255, 0, 1)';
    ctx.beginPath();
    ctx.arc(leftCenter.x, leftCenter.y, 2, 0, 2 * Math.PI);
    ctx.arc(rightCenter.x, rightCenter.y, 2, 0, 2 * Math.PI);
    ctx.fill();

    // Draw connecting line
    ctx.beginPath();
    ctx.moveTo(leftCenter.x, leftCenter.y);
    ctx.lineTo(rightCenter.x, rightCenter.y);
    ctx.stroke();

    // Calculate and store PD
    const pixelDistance = Math.sqrt(
      Math.pow(rightCenter.x - leftCenter.x, 2) + 
      Math.pow(rightCenter.y - leftCenter.y, 2)
    );
    
    // Convert to millimeters (approximate conversion)
    const mmPerPixel = 0.2645833333;
    const pdInMm = pixelDistance * mmPerPixel;
    
    resultsRef.current = {
      pd_mm: pdInMm,
      confidence: 95
    };

    // Restore the context state
    ctx.restore();
  };




  const checkPositionStability = (faceCenter: [number, number]) => {
    if (positionHistory.current.length >= historySize) {
      positionHistory.current.shift();
    }
    positionHistory.current.push(faceCenter);
    
    if (positionHistory.current.length < historySize) return false;
    
    const xCoords = positionHistory.current.map(pos => pos[0]);
    const yCoords = positionHistory.current.map(pos => pos[1]);
    const xVariance = Math.max(...xCoords) - Math.min(...xCoords);
    const yVariance = Math.max(...yCoords) - Math.min(...yCoords);
    
    return xVariance < frameWidth * 0.03 && yVariance < frameHeight * 0.03;
  };

  const getFaceBoundingBox = (landmarks: any[]) => {
    try {
      // Validate landmarks
      if (!Array.isArray(landmarks) || landmarks.length === 0) {
        return null;
      }

      // Filter out invalid landmarks and map to coordinates
      const coords = landmarks
        .filter(landmark => landmark && typeof landmark.x === 'number' && typeof landmark.y === 'number')
        .map(landmark => ({
          x: landmark.x * frameWidth,
          y: landmark.y * frameHeight
        }));

      // Check if we have valid coordinates
      if (coords.length === 0) {
        return null;
      }

      return {
        left: Math.min(...coords.map(c => c.x)),
        right: Math.max(...coords.map(c => c.x)),
        top: Math.min(...coords.map(c => c.y)),
        bottom: Math.max(...coords.map(c => c.y))
      };
    } catch (error) {
      console.error('Error in getFaceBoundingBox:', error);
      return null;
    }
  };

 const checkAlignment = (landmarks: any[]) => {
    if (!Array.isArray(landmarks) || landmarks.length === 0 || 
        !landmarks.every(landmark => landmark?.x !== undefined && landmark?.y !== undefined)) {
      return {
        aligned: false,
        message: "No face detected"
      };
    }

    try {
      const faceBox = getFaceBoundingBox(landmarks);
      
      if (!faceBox || typeof faceBox.left !== 'number' || typeof faceBox.right !== 'number' ||
          typeof faceBox.top !== 'number' || typeof faceBox.bottom !== 'number') {
        return {
          aligned: false,
          message: "Invalid face detection"
        };
      }

      const faceCenter: [number, number] = [
        (faceBox.left + faceBox.right) / 2,
        (faceBox.top + faceBox.bottom) / 2
      ];
      
      const centerX = frameWidth / 2;
      const centerY = frameHeight / 2;
      
      const xOffset = Math.abs(faceCenter[0] - centerX) / frameWidth;
      const yOffset = Math.abs(faceCenter[1] - centerY) / frameHeight;
      
      const faceWidth = faceBox.right - faceBox.left;
      const ovalWidth = frameWidth * faceWidthRatio;
      const widthDiff = Math.abs(faceWidth - ovalWidth) / ovalWidth;
      
      const isAligned = xOffset <= positionTolerance && 
                      yOffset <= positionTolerance && 
                      widthDiff <= sizeTolerance;
                      
      let message = "Center your face";
      
      if (widthDiff > sizeTolerance) {
        message = faceWidth < ovalWidth ? "Move closer" : "Move back";
      } else if (isAligned) {
        message = "Perfect";
      }
      
      return { 
        aligned: isAligned && checkPositionStability(faceCenter),
        message
      };
    } catch (error) {
      console.error('Error in checkAlignment:', error);
      return {
        aligned: false,
        message: "Detection error"
      };
    }
  };


  const onResults = async (results: any) => {
    if (!cameraRunningRef.current || showResults || isCountingDown || measurementInProgress) {
    return;
  }
    if (showResults) return;

        if (showResults || isCountingDown || measurementInProgress) {
          return;
        }


    // Don't process new results during countdown or measurement
    if (isCountingDown || measurementInProgress) return;


    if (isCountingDown || measurementInProgress || showResults) return;
    
    

    if (canvasRef.current && !measurementInProgress) {
      canvasRef.current.width = frameWidth;
      canvasRef.current.height = frameHeight;

      const canvasElement = canvasRef.current;
      const canvasCtx = canvasElement.getContext("2d");
      
      if (canvasCtx) {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, frameWidth, frameHeight);
        
        canvasCtx.scale(-1, 1);
        canvasCtx.translate(-frameWidth, 0);
        canvasCtx.drawImage(results.image, 0, 0, frameWidth, frameHeight);
        
        canvasCtx.restore();
        drawFaceGuide(canvasCtx);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      drawPupils(canvasCtx, landmarks);
      const alignment = checkAlignment(landmarks);
      messageRef.current = alignment.message;
      setShowGuidance(true);
      setGuideMessage(alignment.message);
        
      if (alignment.message === "Perfect" && !isCountingDown && !measurementInProgress) {
        setMeasurementInProgress(true);
        setIsCountingDown(true);
        
        // messageRef.current = alignment.message;
        // Capture image first
        const imageData = captureImage();
        if (imageData) {
          // Start countdown
          // let count = 3;
          // const countdownInterval = setInterval(async () => {
          //   count--;
          //   setCountdownValue(count);
            
          //   if (count === 0) {
          //     clearInterval(countdownInterval);
          //     setIsCountingDown(false);
          //     setCountdownValue(3);
              
          //     // Send to API
          //     const success = await sendMeasurementToAPI(landmarks, imageData);
          //        if (!success) {
          //         cleanupAllStates();
          //       }
                
          //       else {
          //       setMeasurementInProgress(false);
          //       setShowResults(false);
          //     }
          //   }
          // }, 1000);
          setMeasurementInProgress(true);
            setIsCountingDown(true);


                  startMeasurementCountdown(landmarks, imageData);

        } else {
          setMeasurementInProgress(false);
          setIsCountingDown(false);
          toast.error('Failed to capture image');
        }
      }
      
      if (alignment.aligned) {
        setStableFrameCount(prev => prev + 1);
      } else {
        setStableFrameCount(0);
      }
    } else {
      messageRef.current = "No face detected";
      setStableFrameCount(0);
      setShowGuidance(false);
    }

    
      }
    }
  };

  const resetAndStartCamera = async () => {
    try {
      // First ensure we fully stop the camera
      await cleanupCamera();
      
      // Wait a brief moment to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then start fresh
      await startCamera();
    } catch (error) {
      console.error('Error resetting camera:', error);
      toast.error('Failed to restart camera');
      await cleanupCamera();
    }
  };

  const handleCameraToggle = async () => {
    try {
      if (cameraRunningRef.current) {
        await cleanupCamera();
      } else {
        // If we have results showing, use the reset function
        if (showResults) {
          await resetAndStartCamera();
        } else {
          // Normal start for first-time use
          await startCamera();
        }
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
      await cleanupCamera();
      toast.error('Error toggling camera');
    }
  };



  


  const loadMediaPipeScripts = async () => {
    // Load FaceMesh
    await import('@mediapipe/face_mesh');
    // Load Camera Utils
    await import('@mediapipe/camera_utils');
    // Load Drawing Utils
    await import('@mediapipe/drawing_utils');
  };

  

  useEffect(() => {
    // Initialize MediaPipe scripts
    const initMediaPipe = async () => {
      try {
        await loadMediaPipeScripts();
      } catch (error) {
        console.error('Failed to load MediaPipe:', error);
        toast.error('Failed to initialize face detection');
      }
    };

    initMediaPipe();
  }, []);



  // Start FaceMesh camera
  const startCamera = async () => {
    console.log('Starting camera initialization...');
    setIsLoading(true);
    if (showResults) {
      setShowResults(false);
      setPdResults(null);
      await cleanupCamera();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    try {
      console.log('Ensuring cleanup...');
      await cleanupCamera();
      
      console.log('Creating FaceMesh instance...');
      const faceMesh = new window.FaceMesh({
        locateFile: (file: string) => `/${file}`,
      });
  
      faceMesh.setOptions({
        maxNumFaces: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        refineLandmarks: true
      });
  
      faceMeshRef.current = faceMesh;
      
      console.log('Setting up media stream...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: frameWidth,
          height: frameHeight,
          facingMode: 'user',
          aspectRatio: isMobile ? 3/4 : 4/3
        }
      });
  
      console.log('Stream obtained, setting up video element...');
      if (webcamRef.current && webcamRef.current.video) {
        webcamRef.current.video.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (webcamRef.current && webcamRef.current.video) {
            webcamRef.current.video.onloadedmetadata = () => resolve(true);
          }
        });
  
        await webcamRef.current.video.play();
        console.log('Video playing...');
  
        cameraRunningRef.current = true;
        setShowCanvasState(true);
  
        // Set up FaceMesh after video is playing
        faceMesh.onResults(onResults);
  
        const processFrame = async () => {
          if (!cameraRunningRef.current || !faceMeshRef.current) {
            console.log('Camera or FaceMesh not active, stopping frame processing');
            return;
          }
  
          try {
            if (webcamRef.current?.video) {
              await faceMeshRef.current.send({ image: webcamRef.current.video });
              if (cameraRunningRef.current) {
                animationFrameIdRef.current = requestAnimationFrame(processFrame);
              }
            }
          } catch (error) {
            console.error('Error processing frame:', error);
            cleanupCamera();
          }
        };
  
        console.log('Starting frame processing...');
        processFrame();
      }
    } catch (err) {
      console.error("Error starting camera:", err);
      toast.error("Failed to start camera");
      await cleanupCamera();
    } finally {
      setIsLoading(false);
    }
  };


  // Stop the camera
  const stopCamera = () => {
    cleanupCamera();
  };

  const checkcamera = () => {
    if (cameraRunningRef.current) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, []);

  return (
    <Card className="w-full max-w-xl p-8 bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl">
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 rounded-full">
            <Ruler className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">PD Measurement Tool</span>
          </div>
          <h3 className="text-3xl font-bold tracking-tight text-gray-900">
            Get Your Perfect Fit
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Get precise pupillary distance measurements for your perfect eyewear fit
          </p>
        </div>
  
        <div className="space-y-6">
        <button
          onClick={async () => {
            if (showResults) {
              setShowResults(false);
              setPdResults(null);
              stopCamera();
            } else {
              if (cameraRunningRef.current) {
                await cleanupCamera();
              } else {
                await startCamera();
              }
            }
          }}
          className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 rounded-xl flex items-center justify-center gap-3"
        >
          <Camera className="w-5 h-5" />
          <span className="font-medium">
            {cameraRunningRef.current ? "Stop Camera" : "Start Camera Measurement"}
          </span>
        </button>
  
        <div className={`relative h-[60vh] w-full bg-black rounded-xl overflow-hidden shadow-inner`}>
          <Webcam
            ref={webcamRef}
            className="w-full h-full hidden webcam-video"
            playsInline
            mirrored={false}
            videoConstraints={{
              facingMode: "user",
              width: frameWidth,
              height: frameHeight,
              aspectRatio: isMobile ? 3/4 : 4/3
            }}
            onUserMediaError={() => toast.error("Failed to access camera")}
          />
          <canvas
            ref={canvasRef}
            width={frameWidth}
            height={frameHeight}
            className={`w-full sm:w-auto ${showCanvasState && !showResults ? "" : "hidden"}`}
          />
          {guideMessage && !showResults && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
              {guideMessage}
            </div>
          )}
        </div>
  
          {showCanvasState && isCountingDown && countdownIntervalRef.current && (
            <CountdownOverlay value={countdownValue} />
          )}
  
          {showResults && pdResults && <DisplayResults pdResults={pdResults} />}
        </div>
      </div>
    </Card>
  );
};

export default PDMeasurement;