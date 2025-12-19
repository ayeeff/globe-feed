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
    if (scriptRan.current) return;

    // Check every 100ms if the external libraries are loaded
    const checkLibs = setInterval(() => {
      // Cast window to 'any' to access dynamic properties
      if ((window as any).Globe && (window as any).THREE) {
        clearInterval(checkLibs);
        
        try {
          // Execute the code safely
          const dynamicFunction = new Function(scriptContent);
          dynamicFunction();
          scriptRan.current = true;
        } catch (err) {
          console.error("Script Error:", err);
        }
      }
    }, 100);

    return () => clearInterval(checkLibs);
  }, [scriptContent]);

  return (
    <>
      {/* 1. Load External Libraries */}
      <Script src="//unpkg.com/three" strategy="afterInteractive" />
      <Script src="//unpkg.com/globe.gl" strategy="afterInteractive" />

      {/* 2. Inject CSS */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* 3. Inject HTML Structure */}
      <div 
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    </>
  );
};

export default CustomVisual;