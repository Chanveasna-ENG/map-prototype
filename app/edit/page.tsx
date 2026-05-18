"use client";

import React, { useState } from "react";
import type { MapPayload } from "@/src/contracts/data-models";
import { isPathClear } from "@/src/validation/bresenham";
import { MapCanvas } from "@/src/rendering/MapCanvas";
import { screenToGrid } from "@/src/rendering/coordinate-transform";

type Mode = "wall" | "eraser" | "path" | "room";

function handleWall(payload: MapPayload, x: number, y: number): MapPayload {
  const newP = { ...payload, walls: [...payload.walls] };
  if (!newP.walls.some((w) => w[0] === x && w[1] === y)) {
    newP.walls.push([x, y]);
  }
  return newP;
}

interface EraserConfig {
  payload: MapPayload;
  x: number;
  y: number;
  z: number;
}

function handleEraser(config: EraserConfig): MapPayload {
  const { payload, x, y, z } = config;
  const newP = { ...payload, walls: payload.walls.filter((w) => w[0] !== x || w[1] !== y) };
  const key = `${x},${y},${z}`;
  
  if (newP.nodes[key]) {
    const newNodes = { ...newP.nodes };
    delete newNodes[key];
    newP.nodes = newNodes;
  }
  
  const newRooms = { ...newP.rooms };
  Object.keys(newRooms).forEach((k) => {
    if (newRooms[k].anchor_node === key) {
      delete newRooms[k];
    }
  });
  newP.rooms = newRooms;

  return newP;
}

interface ActionConfig {
  mode: Mode;
  x: number;
  y: number;
  z: number;
  payload: MapPayload;
}

function handleEditorClick(config: ActionConfig): MapPayload {
  const { mode, x, y, z, payload } = config;
  if (mode === "wall") {
    return handleWall(payload, x, y);
  }
  if (mode === "eraser") {
    return handleEraser({ payload, x, y, z });
  }
  if (mode === "room") {
    const key = `${x},${y},${z}`;
    const newP = { ...payload, rooms: { ...payload.rooms } };
    const id = Object.keys(newP.rooms).length + 300;
    newP.rooms[key] = { id, name: "New Room", anchor_node: key };
    return newP;
  }
  return payload;
}

function addEdge(payload: MapPayload, start: string, end: string): MapPayload {
  const newP = { ...payload, nodes: { ...payload.nodes } };
  
  if (!newP.nodes[start]) { newP.nodes[start] = { edges: {} }; }
  else { newP.nodes[start] = { edges: { ...newP.nodes[start].edges } }; }
  
  if (!newP.nodes[end]) { newP.nodes[end] = { edges: {} }; }
  else { newP.nodes[end] = { edges: { ...newP.nodes[end].edges } }; }

  const p1 = start.split(",").map(Number);
  const p2 = end.split(",").map(Number);
  let cost = Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
  if (p1[2] !== p2[2]) { cost += 10; }

  newP.nodes[start].edges[end] = cost;
  newP.nodes[end].edges[start] = cost;
  return newP;
}

function handlePathDrag(payload: MapPayload, start: string, end: string): MapPayload {
  const wallSet = new Set(payload.walls.map((w) => `${w[0]},${w[1]}`));
  const isWall = (x: number, y: number, _z: number): boolean => wallSet.has(`${x},${y}`);

  const p1 = start.split(",").map(Number);
  const p2 = end.split(",").map(Number);
  const pos1 = { x: p1[0], y: p1[1], z: p1[2] };
  const pos2 = { x: p2[0], y: p2[1], z: p2[2] };

  if (isPathClear(pos1, pos2, isWall)) {
    return addEdge(payload, start, end);
  }
  return payload;
}

function LockScreen({ onLock }: { onLock: (name: string) => void }): React.ReactNode {
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white">
      <div className="bg-zinc-900 p-8 rounded border border-zinc-800">
        <h2 className="text-xl font-bold mb-4">Admin Edit Lock</h2>
        <input 
          className="bg-zinc-800 p-2 rounded w-full mb-4" 
          placeholder="Admin Name" 
          value={name} 
          onChange={(e): void => setName(e.target.value)} 
        />
        <button className="bg-blue-600 px-4 py-2 rounded w-full" onClick={(): void => onLock(name)}>
          Acquire Lock
        </button>
      </div>
    </div>
  );
}

interface ToolbarProps {
  mode: Mode;
  setMode: (m: Mode) => void;
  floor: number;
  setFloor: (f: number) => void;
  onSave: () => void;
  failedEdges: string[];
}

function EditToolbar(props: ToolbarProps): React.ReactNode {
  const { mode, setMode, floor, setFloor, onSave, failedEdges } = props;
  return (
    <div className="flex gap-4 mb-4 items-center">
      <select value={mode} onChange={(e): void => setMode(e.target.value as Mode)} className="bg-zinc-800 p-2 rounded text-white">
        <option value="wall">Wall</option>
        <option value="eraser">Eraser</option>
        <option value="path">Path</option>
        <option value="room">Room Marker</option>
      </select>
      <button onClick={(): void => setFloor(1)} className={`p-2 rounded ${floor === 1 ? "bg-blue-600" : "bg-zinc-800"}`}>F1</button>
      <button onClick={(): void => setFloor(2)} className={`p-2 rounded ${floor === 2 ? "bg-blue-600" : "bg-zinc-800"}`}>F2</button>
      <button onClick={onSave} className="bg-emerald-600 px-4 py-2 rounded">Save Map</button>
      
      {failedEdges.length > 0 && (
        <span className="text-red-500 font-bold bg-red-900/30 px-3 py-1 rounded">
          Failed Edges: {failedEdges.length}
        </span>
      )}
    </div>
  );
}

interface EditorApi {
  acquireLock: (name: string) => Promise<void>;
  saveMap: (payload: MapPayload | null) => Promise<void>;
  failedEdges: string[];
}

function useEditorApi(setIsLocked: (l: boolean) => void, setPayload: (p: MapPayload) => void): EditorApi {
  const [failedEdges, setFailedEdges] = useState<string[]>([]);
  
  const acquireLock = async (name: string): Promise<void> => {
    const res = await fetch("/api/lock", { method: "POST", body: JSON.stringify({ locked_by: name }) });
    const data = await res.json();
    if (data.success) {
      setIsLocked(true);
      fetch("/api/map").then((r) => r.json()).then((p) => setPayload(p)).catch(() => {});
    } else {
      alert(data.message || "Lock failed");
    }
  };

  const saveMap = async (payload: MapPayload | null): Promise<void> => {
    if (!payload) { return; }
    const res = await fetch("/api/map", { method: "PUT", body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) {
      setFailedEdges([]);
      alert("Saved successfully");
    } else {
      setFailedEdges(data.failed_edges || []);
    }
  };

  return { acquireLock, saveMap, failedEdges };
}

interface MouseConfig {
  payload: MapPayload | null;
  mode: Mode;
  floor: number;
  startNode: string | null;
  setStartNode: (n: string | null) => void;
  setPayload: (p: MapPayload) => void;
}

interface MapMouseHandlers {
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function useMapMouse(config: MouseConfig): MapMouseHandlers {
  const { payload, mode, floor, startNode, setStartNode, setPayload } = config;

  const getGridKey = (e: React.MouseEvent): string => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const grid = screenToGrid({ x: sx, y: sy }, { cellSize: 20, zoom: 1, panX: 0, panY: 0 });
    return `${grid.col},${grid.row},${floor}`;
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!payload) { return; }
    const key = getGridKey(e);
    if (mode === "path") {
      setStartNode(key);
    } else {
      const parts = key.split(",");
      setPayload(handleEditorClick({ mode, x: Number(parts[0]), y: Number(parts[1]), z: floor, payload }));
    }
  };

  const onMouseUp = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!payload || mode !== "path" || !startNode) { return; }
    const endNode = getGridKey(e);
    if (startNode !== endNode) {
      setPayload(handlePathDrag(payload, startNode, endNode));
    }
    setStartNode(null);
  };

  return { onMouseDown, onMouseUp };
}

export default function EditorPage(): React.ReactNode {
  const [isLocked, setIsLocked] = useState(false);
  const [payload, setPayload] = useState<MapPayload | null>(null);
  const { acquireLock, saveMap, failedEdges } = useEditorApi(setIsLocked, setPayload);
  
  const [mode, setMode] = useState<Mode>("wall");
  const [floor, setFloor] = useState(1);
  const [startNode, setStartNode] = useState<string | null>(null);

  const { onMouseDown, onMouseUp } = useMapMouse({
    payload, mode, floor, startNode, setStartNode, setPayload
  });

  if (!isLocked) { return <LockScreen onLock={acquireLock} />; }
  if (!payload) { return <div className="p-8 text-white">Loading Map...</div>; }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white p-6">
      <EditToolbar 
        mode={mode} setMode={setMode} 
        floor={floor} setFloor={setFloor} 
        onSave={(): void => { saveMap(payload).catch(() => {}); }} 
        failedEdges={failedEdges} 
      />
      <div 
        className="relative border border-zinc-800 cursor-crosshair inline-block bg-black" 
        onMouseDown={onMouseDown} 
        onMouseUp={onMouseUp}
      >
        <MapCanvas payload={payload} currentFloor={floor} />
      </div>
    </div>
  );
}
