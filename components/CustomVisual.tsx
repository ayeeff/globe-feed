// components/CustomVisual.tsx - SYNCED WITH PAGE.TSX CLEANUP
"use client";
import { useEffect, useRef } from 'react';

interface CustomVisualProps {
  id: string; // Added ID for unique container selection
  type?: string;
  css?: string;
  html?: string;
  scriptContent?: string;
  isActive: boolean;
}

export default function CustomVisual({ 
  id,
  type = 'custom', 
  css, 
  html, 
  scriptContent, 
  isActive 
}: CustomVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const instanceId = id.replace(/[^a-zA-Z0-9]/g, ''); // Sanitize for ID use
    console.log(`🎨 Initializing ${type} visualization [${instanceId}]...`);

    const cleanup = () => {
      console.log(`🧹 Cleaning up ${type} visualization...`);
      
      // 1. Remove script and styles
      if (scriptRef.current) { scriptRef.current.remove(); scriptRef.current = null; }
      if (styleRef.current) { styleRef.current.remove(); styleRef.current = null; }

      // 2. Comprehensive WebGL/THREE.js Cleanup
      // @ts-ignore
      if (window.globeInstance) {
        try {
          // @ts-ignore
          const renderer = window.globeInstance.renderer();
          // @ts-ignore
          const scene = window.globeInstance.scene();
          
          if (renderer) {
            renderer.setAnimationLoop(null);
            renderer.dispose();
            if (renderer.domElement && renderer.domElement.parentElement) {
              renderer.domElement.parentElement.removeChild(renderer.domElement);
            }
          }

          if (scene) {
            scene.traverse((object: any) => {
              if (object.geometry) object.geometry.dispose();
              if (object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                materials.forEach((mat: any) => {
                  if (mat.map) mat.map.dispose();
                  mat.dispose();
                });
              }
            });
          }
          // @ts-ignore
          window.globeInstance = null;
        } catch (err) { console.error('Globe GC error:', err); }
      }

      // 3. Library specific cleanup
      // @ts-ignore
      if (window.cesiumViewer) {
        try { window.cesiumViewer.destroy(); window.cesiumViewer = null; } catch (e) {}
      }
      // @ts-ignore
      if (window.leafletMap) {
        try { window.leafletMap.remove(); window.leafletMap = null; } catch (e) {}
      }

      // 4. Clear DOM
      if (container) container.innerHTML = '';
    };

    // Inject content
    if (html) container.innerHTML = html;

    if (css) {
      const style = document.createElement('style');
      style.textContent = css;
      container.appendChild(style);
      styleRef.current = style;
    }

    if (scriptContent) {
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          try {
            const container = document.getElementById('viz-container-${instanceId}');
            ${scriptContent}
          } catch (err) {
            console.error("❌ Visual Error:", err);
            const container = document.getElementById('viz-container-${instanceId}');
            if (container) container.innerHTML = '<div style="color:white; padding:20px;">Error: ' + err.message + '</div>';
          }
        })();
      `;
      container.appendChild(script);
      scriptRef.current = script;
    }

    return cleanup;
  }, [id, type, css, html, scriptContent, isActive]);

  return (
    <div 
      ref={containerRef} 
      id={`viz-container-${id.replace(/[^a-zA-Z0-9]/g, '')}`}
      className="w-full h-full relative"
      style={{ isolation: 'isolate', background: 'transparent' }} 
    />
  );
}
