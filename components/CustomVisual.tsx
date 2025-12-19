"use client";
import React, { useEffect, useRef, useState } from 'react';

interface CustomVisualProps {
  css: string;
  html: string;
  scriptContent: string;
}

const CustomVisual: React.FC<CustomVisualProps> = ({ css, html, scriptContent }) => {
  const scriptRan = useRef(false);
  const [status, setStatus] = useState<string>("Initializing...");

  useEffect(() => {
    if (scriptRan.current) return;

    // Helper to manually load a script and wait for it
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        // If already loaded, skip
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve(true);
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true; 
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
      });
    };

    const init = async () => {
      try {
        setStatus("Loading 3D Engine...");
        
        // 1. Load Three.js (Specific Version r124 - Known stable with globe.gl)
        if (!(window as any).THREE) {
          await loadScript("//unpkg.com/three@0.124.0/build/three.min.js");
        }
        console.log("✅ THREE Ready");

        // 2. Load Globe.gl (Specific Version)
        setStatus("Loading Globe Library...");
        if (!(window as any).Globe) {
          await loadScript("//unpkg.com/globe.gl@2.26.4/dist/globe.gl.min.js");
        }
        console.log("✅ Globe Ready");

        // 3. Execute Your Code
        setStatus("Starting Visualization...");
        
        // Small delay to ensure the library is fully parsed
        setTimeout(() => {
           if ((window as any).Globe) {
              const dynamicFunction = new Function(scriptContent);
              dynamicFunction();
              scriptRan.current = true;
              setStatus(""); // Success
           } else {
              throw new Error("Globe object missing after load");
           }
        }, 100);

      } catch (err: any) {
        console.error(err);
        setStatus("Error: " + err.message);
      }
    };

    init();

  }, [scriptContent]);

  return (
    <>
      {/* Debug Overlay */}
      {status && (
        <div className="fixed top-20 left-4 z-50 bg-black/80 text-yellow-400 px-4 py-2 rounded border border-yellow-800 font-mono text-xs shadow-xl backdrop-blur-md">
          [System]: {status}
        </div>
      )}

      {/* Inject CSS */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Inject HTML */}
      <div 
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    </>
  );
};

export default CustomVisual;
