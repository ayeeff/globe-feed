"use client";
import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface CustomVisualProps {
  css: string;
  html: string;
  scriptContent: string;
}

const CustomVisual: React.FC<CustomVisualProps> = ({ css, html, scriptContent }) => {
  const scriptRan = useRef(false);
  const [debugMsg, setDebugMsg] = useState<string>("Initializing...");

  useEffect(() => {
    if (scriptRan.current) return;

    setDebugMsg("Waiting for Globe.gl to load...");

    // Timer to check if the library is ready
    const checkLibs = setInterval(() => {
      // We ONLY check for Globe. The library bundles its own ThreeJS.
      if ((window as any).Globe) {
        clearInterval(checkLibs);
        setDebugMsg("Library found. Starting visualization...");
        
        try {
          // Execute the code from Supabase
          const dynamicFunction = new Function(scriptContent);
          dynamicFunction();
          
          scriptRan.current = true;
          setDebugMsg(""); // Clear debug message on success
        } catch (err: any) {
          console.error("Script Error:", err);
          setDebugMsg("Error: " + err.message);
        }
      }
    }, 500); // Check every 0.5s

    // Timeout after 10 seconds to stop checking
    const timeout = setTimeout(() => {
      clearInterval(checkLibs);
      if (!scriptRan.current) setDebugMsg("Error: Timed out waiting for Globe.gl");
    }, 10000);

    return () => {
      clearInterval(checkLibs);
      clearTimeout(timeout);
    };
  }, [scriptContent]);

  return (
    <>
      {/* FIX: LOAD ONLY GLOBE.GL
         We removed the explicit 'three.js' script because globe.gl includes it.
         strategy="lazyOnload" fixes the 'preloaded but not used' warning.
      */}
      <Script 
        src="//unpkg.com/globe.gl" 
        strategy="lazyOnload" 
        onLoad={() => console.log("✅ Globe.gl Loaded")}
      />

      {/* Debug Overlay: Only visible if something goes wrong or is loading */}
      {debugMsg && (
        <div className="fixed top-4 left-4 z-50 bg-red-900/90 text-white px-4 py-2 rounded shadow-lg text-sm font-mono border border-red-500">
          Status: {debugMsg}
        </div>
      )}

      {/* Inject CSS */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Inject HTML Structure */}
      <div 
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    </>
  );
};

export default CustomVisual;
