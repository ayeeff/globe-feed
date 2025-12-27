// types/global.d.ts - Global type definitions for window objects

import * as THREE from 'three';
import { Viewer } from 'cesium';

declare global {
  interface Window {
    // Three.js
    THREE: typeof THREE;
    
    // Globe.GL
    Globe: any;
    globeInstance: any;
    GlobeVizInit?: () => void;
    
    // Cesium
    Cesium: any;
    cesiumViewer: Viewer | null;
    CESIUM_BASE_URL: string;
    
    // Leaflet
    L: any;
    leafletMap: any;
    
    // D3
    d3: any;
    
    // Post configuration
    currentPostConfig: any;
    
    // Supabase storage (if needed)
    storage?: {
      get: (key: string, shared?: boolean) => Promise<any>;
      set: (key: string, value: any, shared?: boolean) => Promise<any>;
      delete: (key: string, shared?: boolean) => Promise<any>;
      list: (prefix?: string, shared?: boolean) => Promise<any>;
    };
  }
}

export {};
