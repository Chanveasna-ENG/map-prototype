"use client";

import React, { useEffect, useState } from "react";
import type { MapPayload } from "@/src/contracts/data-models";
import { astar } from "@/src/pathfinding/astar";
import { MapCanvas } from "@/src/rendering/MapCanvas";
import { screenToGrid } from "@/src/rendering/coordinate-transform";

function useMapPayload(): MapPayload | null {
  const [payload, setPayload] = useState<MapPayload | null>(null);
  useEffect(() => {
    fetch("/api/map")
      .then((res) => res.json())
      .then((data: MapPayload) => setPayload(data))
      .catch(() => {});
  }, []);
  return payload;
}

function useAstarPath(payload: MapPayload | null, startKey: string | null, destKey: string | null): string[] {
  return React.useMemo(() => {
    if (payload && startKey && destKey) {
      return astar(startKey, destKey, payload.nodes);
    }
    return [];
  }, [payload, startKey, destKey]);
}

function getNextFloorCue(drawnPath: string[], currentFloor: number): number | null {
  for (let i = 0; i < drawnPath.length; i++) {
    const parts = drawnPath[i].split(",");
    const z = Number(parts[2]);
    if (z !== currentFloor) {
      return z;
    }
  }
  return null;
}

interface ClickState {
  startKey: string | null;
  destKey: string | null;
  setStartKey: (k: string | null) => void;
  setDestKey: (k: string | null) => void;
}

interface MapClickConfig {
  e: React.MouseEvent<HTMLDivElement>;
  payload: MapPayload;
  currentFloor: number;
  zoom: number;
  panX: number;
  panY: number;
}

function handleMapClick(config: MapClickConfig, state: ClickState): void {
  const { e, payload, currentFloor, zoom, panX, panY } = config;
  const rect = e.currentTarget.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  
  const gridPos = screenToGrid({ x: screenX, y: screenY }, { cellSize: 20, zoom, panX, panY });
  const targetKey = `${gridPos.col},${gridPos.row},${currentFloor}`;

  let matched = false;
  const roomEntries = Object.entries(payload.rooms);
  for (let i = 0; i < roomEntries.length; i++) {
    if (roomEntries[i][1].anchor_node === targetKey) {
      matched = true;
    }
  }

  if (payload.teleporters[targetKey]) {
    matched = true;
  }

  if (matched) {
    if (!state.startKey || (state.startKey && state.destKey)) {
      state.setStartKey(targetKey);
      state.setDestKey(null);
    } else {
      state.setDestKey(targetKey);
    }
  }
}

function KioskControls({
  setZoom, setPanX, setPanY
}: {
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPanX: React.Dispatch<React.SetStateAction<number>>;
  setPanY: React.Dispatch<React.SetStateAction<number>>;
}): React.ReactNode {
  return (
    <div className="mt-4 flex gap-4">
      <button onClick={(): void => setZoom((z) => z * 1.2)} className="bg-zinc-800 px-4 py-2 rounded">Zoom In</button>
      <button onClick={(): void => setZoom((z) => z / 1.2)} className="bg-zinc-800 px-4 py-2 rounded">Zoom Out</button>
      <button onClick={(): void => setPanX((x) => x - 50)} className="bg-zinc-800 px-4 py-2 rounded">Left</button>
      <button onClick={(): void => setPanX((x) => x + 50)} className="bg-zinc-800 px-4 py-2 rounded">Right</button>
      <button onClick={(): void => setPanY((y) => y - 50)} className="bg-zinc-800 px-4 py-2 rounded">Up</button>
      <button onClick={(): void => setPanY((y) => y + 50)} className="bg-zinc-800 px-4 py-2 rounded">Down</button>
    </div>
  );
}

function FloorSelector({ 
  currentFloor, 
  setCurrentFloor 
}: { 
  currentFloor: number; 
  setCurrentFloor: (f: number) => void; 
}): React.ReactNode {
  return (
    <div className="flex gap-4">
      {[1, 2, 3].map((f) => (
        <button 
          key={f}
          onClick={(): void => setCurrentFloor(f)} 
          className={`px-4 py-2 rounded ${currentFloor === f ? "bg-blue-600" : "bg-zinc-800"}`}
        >
          Floor {f}
        </button>
      ))}
    </div>
  );
}

interface HeaderProps {
  currentFloor: number;
  setCurrentFloor: (f: number) => void;
  startKey: string | null;
  destKey: string | null;
  nextFloor: number | null;
}

function KioskHeader(props: HeaderProps): React.ReactNode {
  const { currentFloor, setCurrentFloor, startKey, destKey, nextFloor } = props;
  return (
    <header className="mb-4 flex flex-col gap-2">
      <h1 className="text-3xl font-bold">Campus Kiosk</h1>
      <FloorSelector currentFloor={currentFloor} setCurrentFloor={setCurrentFloor} />
      <div className="text-sm text-zinc-400">
        Start: {startKey || "Select marker"} | Dest: {destKey || "Select marker"}
      </div>
      {nextFloor !== null && (
        <div className="bg-emerald-900/50 p-4 rounded flex justify-between">
          <span>Path continues on Floor {nextFloor}</span>
          <button onClick={(): void => setCurrentFloor(nextFloor)} className="bg-emerald-600 px-3 py-1 rounded">
            Switch
          </button>
        </div>
      )}
    </header>
  );
}

export default function KioskPage(): React.ReactNode {
  const payload = useMapPayload();
  const [currentFloor, setCurrentFloor] = useState<number>(1);
  const [startKey, setStartKey] = useState<string | null>(null);
  const [destKey, setDestKey] = useState<string | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  
  const drawnPath = useAstarPath(payload, startKey, destKey);
  const nextFloor = getNextFloorCue(drawnPath, currentFloor);

  if (!payload) {
    return <div className="p-8 text-white">Loading Map...</div>;
  }

  const clickState: ClickState = { startKey, destKey, setStartKey, setDestKey };
  
  const onCanvasClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    handleMapClick({ e, payload, currentFloor, zoom, panX, panY }, clickState);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white p-6">
      <KioskHeader 
        currentFloor={currentFloor} 
        setCurrentFloor={setCurrentFloor} 
        startKey={startKey} 
        destKey={destKey} 
        nextFloor={nextFloor} 
      />

      <div className="relative border border-zinc-800 cursor-crosshair inline-block" onClick={onCanvasClick}>
        <MapCanvas payload={payload} currentFloor={currentFloor} drawnPath={drawnPath} zoom={zoom} panX={panX} panY={panY} />
      </div>
      
      <KioskControls setZoom={setZoom} setPanX={setPanX} setPanY={setPanY} />
    </div>
  );
}
