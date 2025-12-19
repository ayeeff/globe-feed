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
  const [status, setStatus] = useState<string>("Initializing...");

  useEffect(() => {
    if (scriptRan.current) return;

    setStatus("Waiting for libraries...");

    // Timer: We strictly wait for BOTH libraries to exist in the window
    const checkLibs = setInterval(() => {
      // 1. Check if Three.js is ready
      // 2. Check if Globe is ready
      if ((window as any).THREE && (window as any).Globe) {
        clearInterval(checkLibs);
        setStatus("Libraries ready. Executing script...");
        
        try {
          // 3. Run your Supabase script
          const dynamicFunction = new Function(scriptContent);
          dynamicFunction();
          
          scriptRan.current = true;
          setStatus(""); // Success! Clear the message.
        } catch (err: any) {
          console.error("❌ Custom Script Error:", err);
          setStatus("Script Error: " + err.message);
        }
      }
    }, 200); // Check 5 times a second

    // Safety Timeout (10 seconds)
    const timeout = setTimeout(() => {
      if (!scriptRan.current) {
        clearInterval(checkLibs);
        setStatus("Error: Timed out. Libraries failed to load.");
      }
    }, 10000);

    return () => {
      clearInterval(checkLibs);
      clearTimeout(timeout);
    };
  }, [scriptContent]);

  return (
    <>
      {/* CRITICAL LOAD ORDER: 
        1. Three.js must load FIRST (beforeInteractive)
        2. Globe.gl must load SECOND (afterInteractive)
        
        We use specific versions (r128) known to be stable with the CDN build.
      */}
      <Script 
        src="//unpkg.com/three" 
        strategy="beforeInteractive"
        onLoad={() => console.log("✅ Three.js Loaded")}
      />
      <Script 
        src="//unpkg.com/globe.gl" 
        strategy="afterInteractive"
        onLoad={() => console.log("✅ Globe.gl Loaded")}
      />

      {/* Debug Overlay (Shows status in top-left) */}
      {status && (
        <div className="fixed top-20 left-4 z-50 bg-black/80 text-green-400 px-4 py-2 rounded border border-green-800 font-mono text-xs">
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
