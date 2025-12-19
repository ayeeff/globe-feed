"use client";
import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";

// Declare global token
declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}

if (typeof window !== 'undefined') {
    Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_TOKEN || '';
    window.CESIUM_BASE_URL = '/cesium'; 
}

interface CleanCesiumProps {
  config: {
    tilesetUrl?: string;
    camera?: {
      lng: number;
      lat: number;
      height: number;
      heading?: number;
      pitch?: number;
    };
    [key: string]: any;
  };
}

const CleanCesium: React.FC<CleanCesiumProps> = ({ config }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let isDestroyed = false; // Flag to prevent setting state if component unmounts

    const initCesium = async () => {
      if (containerRef.current && !viewerRef.current) {
        console.log('🌍 Booting Cesium Context...');

        // 1. Initialize Viewer without terrain first
        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          vrButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          creditContainer: document.createElement("div"),
        });

        viewerRef.current = viewer;

        // 2. Load World Terrain Asynchronously
        try {
          // FIX: Use the new Async method
          const terrainProvider = await Cesium.createWorldTerrainAsync();
          if (!isDestroyed && viewerRef.current) {
             viewerRef.current.terrainProvider = terrainProvider;
          }
        } catch (error) {
          console.error("Failed to load terrain:", error);
        }

        // 3. Load 3D Tiles or Camera Config
        if (config.tilesetUrl) {
           Cesium.Cesium3DTileset.fromUrl(config.tilesetUrl).then(tileset => {
               if (!isDestroyed && viewerRef.current) {
                   viewerRef.current.scene.primitives.add(tileset);
                   viewerRef.current.zoomTo(tileset);
               }
           });
        } else if (config.camera) {
          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(
              config.camera.lng, 
              config.camera.lat, 
              config.camera.height
            ),
            orientation: {
              heading: Cesium.Math.toRadians(config.camera.heading || 0),
              pitch: Cesium.Math.toRadians(config.camera.pitch || -90),
              roll: 0.0
            }
          });
        }
      }
    };

    initCesium();

    return () => {
      isDestroyed = true;
      console.log('🔥 Destroying Cesium Context...');
      if (viewerRef.current) {
        viewerRef.current.destroy(); 
        viewerRef.current = null;
      }
    };
  }, [config]);

  if (!mounted) return null;

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full bg-black"
    />
  );
};

export default CleanCesium;