// components/CustomVisual.tsx
"use client";
import { useEffect, useRef } from 'react';

// 1. Update the interface to include 'type'
interface CustomVisualProps {
  type?: string; 
  css?: string;
  html?: string;
  scriptContent?: string;
  isActive: boolean;
}

export default function CustomVisual({ 
  type = 'custom', 
  css, 
  html, 
  scriptContent, 
  isActive 
}: CustomVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Cleanup previous content
    const container = containerRef.current;
    container.innerHTML = '';

    // Create a shadow root or standard container depending on your preference.
    // For Cesium/Leaflet, we usually want a standard DOM element, not Shadow DOM,
    // because some plugins struggle with Shadow DOM events.
    // Here we inject directly into the div.
    
    // 1. Inject HTML
    if (html) {
      container.innerHTML = html;
    }

    // 2. Inject CSS
    if (css) {
      const style = document.createElement('style');
      style.textContent = css;
      container.appendChild(style);
    }

    // 3. Inject Script
    if (scriptContent) {
      const script = document.createElement('script');
      // Wrap script in a closure to prevent global scope pollution
      // and provide access to the container element if needed
      script.textContent = `
        (function() {
          try {
            const container = document.getElementById('viz-container-${type}');
            ${scriptContent}
          } catch (err) {
            console.error("Visual Error:", err);
          }
        })();
      `;
      container.appendChild(script);
    }

    // Cleanup function (optional, depending on visual type)
    return () => {
      container.innerHTML = '';
      // If using Cesium/Leaflet, you might want to manually destroy instances here
      // if your script saves them to window or a global var.
    };
  }, [type, css, html, scriptContent, isActive]);

  return (
    <div 
      ref={containerRef} 
      id={`viz-container-${type}`} // Unique ID based on type
      className="w-full h-full relative"
    />
  );
}
