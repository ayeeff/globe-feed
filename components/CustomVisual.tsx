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
    // Prevent double-running
    if (scriptRan.current) return;

    const loadScript = (src: string, id: string) => {
      return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
          resolve(true); // Already loaded
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.id = id;
        script.async = false; // Force synchronous-like execution order
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
      });
    };

    const init = async () => {
      try {
        setStatus("Loading 3D Engine...");

        // 1. Load Three.js (Version r129 - Stable Standard)
        if (!(window as any).THREE) {
          await loadScript("//unpkg.com/three@0.129.0/build/three.min.js", "three-lib");
        }
        
        // 2. Explicitly ensure THREE is global (Fixes 'undefined' errors)
        if ((window as any).THREE) {
            console.log("✅ THREE Version:", (window as any).THREE.REVISION);
        } else {
            throw new Error("Three.js loaded but object is missing");
        }

        // 3. Load Globe.gl (Version 2.23.4 - Matches Three r129)
        setStatus("Loading Globe Library...");
        if (!(window as any).Globe) {
          await loadScript("//unpkg.com/globe.gl@2.23.4/dist/globe.gl.min.js", "globe-lib");
        }

        // 4. Verify & Run
        setStatus("Starting Visualization...");
        setTimeout(() => {
           if ((window as any).Globe) {
              console.log("✅ Globe Ready. Executing User Script...");
              
              // Wrap user script in a closure to protect variables
              const runVisual = new Function(scriptContent);
              runVisual();
              
              scriptRan.current = true;
              setStatus(""); 
           } else {
              setStatus("Error: Globe library failed to initialize.");
           }
        }, 500); // Small buffer for parsing

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
        <div className="fixed top-20 left-4 z-50 bg-gray-900 text-white px-4 py-2 rounded shadow-lg text-xs font-mono border border-gray-700">
          STATUS: {status}
        </div>
      )}

      {/* Styles */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Container */}
      <div 
        id="globe-container" // Giving it an ID helps scripts find it
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    </>
  );
};

export default CustomVisual;
