import React, { useEffect } from 'react';

interface ScriptLoaderProps {
  onLoad: () => void;
}

const MEDIAPIPE_SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js'
];

const ScriptLoader: React.FC<ScriptLoaderProps> = ({ onLoad }) => {
  useEffect(() => {
    let loadedScripts = 0;

    const handleScriptLoad = () => {
      loadedScripts++;
      if (loadedScripts === MEDIAPIPE_SCRIPTS.length) {
        onLoad();
      }
    };

    MEDIAPIPE_SCRIPTS.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.onload = handleScriptLoad;
      document.body.appendChild(script);
    });

    return () => {
      // Cleanup scripts on unmount
      document.querySelectorAll('script').forEach(script => {
        if (MEDIAPIPE_SCRIPTS.includes(script.src)) {
          document.body.removeChild(script);
        }
      });
    };
  }, [onLoad]);

  return null;
};

export default ScriptLoader;