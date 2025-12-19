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

    // Helper to load script and WAIT for it to finish
    const loadScript = (src: string, id: string) => {
      return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
          resolve(true); 
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.id = id;
        script.async = false; // Force sequential loading
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
      });
    };

    const init = async () => {
      try {
        setStatus("Loading Stable 3D Engine...");

        // 1. Load Three.js r124 (The "Golden Era" version for script tags)
        if (!(window as any).THREE) {
          await loadScript("//unpkg.com/three@0.124.0/build/three.min.js", "three-lib");
        }
        console.log("✅ THREE r124 Ready");

        // 2. Load Globe.gl 2.26 (Compatible Peer Version)
        setStatus("Loading Globe Library...");
        if (!(window as any).Globe) {
          await loadScript("//unpkg.com/globe.gl@2.26.4/dist/globe.gl.min.js", "globe-lib");
        }
        console.log("✅ Globe 2.26 Ready");

        // 3. Executing User Script
        setStatus("Starting Visualization...");
        
        // Give it 200ms to settle
        setTimeout(() => {
           if ((window as any).Globe) {
              
              // Run the code from Supabase
              const runVisual = new Function(scriptContent);
              runVisual();
              
              scriptRan.current = true;
              setStatus(""); 
           } else {
              setStatus("Error: Globe symbol missing.");
           }
        }, 200);

      } catch (err: any) {
        console.error("Loader Error:", err);
        setStatus("Error: " + err.message);
      }
    };

    init();

  }, [scriptContent]);

  return (
    <>
      {/* Debug Overlay */}
      {status && (
        <div className="fixed top-20 left-4 z-50 bg-black/80 text-green-400 px-4 py-2 rounded shadow-lg text-xs font-mono border border-green-700">
          STATUS: {status}
        </div>
      )}

      {/* Styles */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Container */}
      <div 
        id="globe-container" 
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    </>
  );
};

export default CustomVisual;
