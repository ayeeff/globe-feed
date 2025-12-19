"use client";
import React, { useEffect, useRef } from 'react';
import Script from 'next/script';

interface CustomVisualProps {
  css: string;
  html: string;
  scriptContent: string;
}

const CustomVisual: React.FC<CustomVisualProps> = ({ css, html, scriptContent }) => {
  const scriptRan = useRef(false);

  useEffect(() => {
    // If we've already run this script, stop.
    if (scriptRan.current) return;

    // Timer to check if global libraries are ready
    const checkLibs = setInterval(() => {
      // We look for 'Globe' and 'THREE' on the window object
      if ((window as any).Globe && (window as any).THREE) {
        clearInterval(checkLibs);
        
        try {
          console.log("🚀 Executing Custom Script from Database...");
          // Execute the code safely
          const dynamicFunction = new Function(scriptContent);
          dynamicFunction();
          scriptRan.current = true;
        } catch (err) {
          console.error("❌ Custom Script Error:", err);
        }
      }
    }, 100); // Check every 100ms

    return () => clearInterval(checkLibs);
  }, [scriptContent]);

  return (
    <>
      {/* FIXED CDN LINKS:
        We point to the specific .min.js files to avoid 'exports not defined' errors.
      */}
      <Script 
        src="//unpkg.com/three@0.160.0/build/three.min.js" 
        strategy="beforeInteractive" 
      />
      <Script 
        src="//unpkg.com/globe.gl@2.30.0/dist/globe.gl.min.js" 
        strategy="beforeInteractive" 
        onLoad={() => {
            console.log("✅ Globe.gl Loaded via CDN");
        }}
      />

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
