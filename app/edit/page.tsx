"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { MapPayload } from "@/src/contracts/data-models";
import { isPathClear } from "@/src/validation/bresenham";
import { MapCanvas } from "@/src/rendering/MapCanvas";
import { screenToGrid } from "@/src/rendering/coordinate-transform";

type Mode = "select" | "wall" | "eraser" | "path" | "room" | "teleporter";
type DrawTool = "free" | "line";
type SelectedMarker = { type: "room" | "teleporter"; key: string } | null;

function handleWall(config: { payload: MapPayload; x: number; y: number; z: number }): MapPayload {
  const { payload, x, y, z } = config;
  const newP = { ...payload, walls: [...payload.walls] };
  if (!newP.walls.some((w) => w[0] === x && w[1] === y && w[2] === z)) {
    newP.walls.push([x, y, z]);
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
  const newP = { ...payload, walls: payload.walls.filter((w) => w[0] !== x || w[1] !== y || w[2] !== z) };
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

  const newTeles = { ...newP.teleporters };
  if (newTeles[key]) {
    delete newTeles[key];
  }
  newP.teleporters = newTeles;

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
    return handleWall({ payload, x, y, z });
  }
  if (mode === "eraser") {
    return handleEraser({ payload, x, y, z });
  }
  if (mode === "room") {
    const key = `${x},${y},${z}`;
    if (payload.rooms[key]) {return payload;}
    const newP = { ...payload, rooms: { ...payload.rooms } };
    const id = Object.keys(newP.rooms).length + 300;
    newP.rooms[key] = { id, name: "New Room", anchor_node: key };
    return newP;
  }
  if (mode === "teleporter") {
    const key = `${x},${y},${z}`;
    if (payload.teleporters[key]) {return payload;}
    const newP = { ...payload, teleporters: { ...payload.teleporters } };
    const tId = `T${Object.keys(newP.teleporters).length + 100}`;
    newP.teleporters[key] = { teleporter_id: tId, name: "New Teleporter", type: "stairs", floors: [z], status: "active" };
    return newP;
  }
  return payload;
}

function getLinePoints(start: { x: number; y: number }, end: { x: number; y: number }): [number, number][] {
  const points: [number, number][] = [];
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let err = dx - dy;
  let cx = start.x;
  let cy = start.y;

  while (true) {
    points.push([cx, cy]);
    if (cx === end.x && cy === end.y) { break; }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
  return points;
}

interface LineDrawConfig {
  payload: MapPayload;
  mode: Mode;
  startNode: string;
  endNode: string;
  floor: number;
}

function handleLineDraw(config: LineDrawConfig): MapPayload {
  const { payload, mode, startNode, endNode, floor } = config;
  const p1 = startNode.split(",").map(Number);
  const p2 = endNode.split(",").map(Number);
  const points = getLinePoints({ x: p1[0], y: p1[1] }, { x: p2[0], y: p2[1] });
  let currentPayload = payload;

  for (let i = 0; i < points.length; i++) {
    currentPayload = handleEditorClick({
      mode,
      x: points[i][0],
      y: points[i][1],
      z: floor,
      payload: currentPayload
    });
  }
  return currentPayload;
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
  const wallSet = new Set(payload.walls.map((w) => `${w[0]},${w[1]},${w[2]}`));
  const isWall = (x: number, y: number, z: number): boolean => wallSet.has(`${x},${y},${z}`);

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
          className="bg-zinc-800 p-2 rounded w-full mb-4 text-white"
          placeholder="Admin Name"
          value={name}
          onChange={(e): void => setName(e.target.value)}
        />
        <button className="bg-blue-600 px-4 py-2 rounded w-full text-white" onClick={(): void => onLock(name)}>
          Acquire Lock
        </button>
      </div>
    </div>
  );
}

interface ToolbarProps {
  mode: Mode;
  setMode: (m: Mode) => void;
  drawTool: DrawTool;
  setDrawTool: (t: DrawTool) => void;
  floor: number;
  setFloor: (f: number) => void;
  onSave: () => void;
  failedEdges: string[];
  floors: Record<string, { name: string }>;
}

function EditToolbar(props: ToolbarProps): React.ReactNode {
  const { mode, setMode, drawTool, setDrawTool, floor, setFloor, onSave, failedEdges, floors } = props;
  const sortedFloors = Object.entries(floors).sort((a, b) => Number(a[0]) - Number(b[0]));
  
  return (
    <div className="flex gap-4 mb-4 items-center">
      <select value={mode} onChange={(e): void => setMode(e.target.value as Mode)} className="bg-zinc-800 p-2 rounded text-white border border-zinc-700">
        <option value="select">Select</option>
        <option value="wall">Wall</option>
        <option value="eraser">Eraser</option>
        <option value="path">Path</option>
        <option value="room">Room</option>
        <option value="teleporter">Teleporter</option>
      </select>
      
      <select value={drawTool} onChange={(e): void => setDrawTool(e.target.value as DrawTool)} className="bg-zinc-800 p-2 rounded text-white border border-zinc-700">
        <option value="free">Free Draw</option>
        <option value="line">Line (Ruler)</option>
      </select>

      <div className="flex gap-2 bg-zinc-800 p-1 rounded border border-zinc-700">
        {sortedFloors.map(([z, fl]) => (
          <button 
            key={z} 
            onClick={(): void => setFloor(Number(z))} 
            className={`px-4 py-1 rounded text-white ${floor === Number(z) ? "bg-blue-600" : "hover:bg-zinc-700"}`}
          >
            {fl.name}
          </button>
        ))}
      </div>
      
      <button onClick={onSave} className="bg-emerald-600 px-6 py-2 rounded text-white font-medium hover:bg-emerald-500 transition-colors">
        Save Map
      </button>

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
  const router = useRouter();

  const acquireLock = async (name: string): Promise<void> => {
    const res = await fetch("/api/lock", { method: "POST", body: JSON.stringify({ locked_by: name }) });
    const data = await res.json();
    if (data.success) {
      setIsLocked(true);
      fetch("/api/map").then((r) => r.json()).then((p) => setPayload(p)).catch(() => { });
    } else {
      alert(data.message || "Lock failed");
    }
  };

  const saveMap = async (payload: MapPayload | null): Promise<void> => {
    if (!payload) { return; }
    const res = await fetch("/api/map", { method: "PUT", body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) {
      await fetch("/api/lock", { method: "DELETE" });
      setIsLocked(false);
      router.push("/");
    } else {
      setFailedEdges(data.failed_edges || []);
    }
  };

  return { acquireLock, saveMap, failedEdges };
}

interface MouseConfig {
  payload: MapPayload | null;
  mode: Mode;
  drawTool: DrawTool;
  floor: number;
  startNode: string | null;
  isDragging: boolean;
  setStartNode: (n: string | null) => void;
  setPayload: (p: MapPayload) => void;
  setIsDragging: (d: boolean) => void;
  setCursorPos: (p: { x: number; y: number } | null) => void;
  setSelectedMarker: (s: SelectedMarker) => void;
  zoom: number;
  panX: number;
  panY: number;
}

interface MapMouseHandlers {
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function processMouseDrag(config: MouseConfig, endNode: string): MapPayload | null {
  const { payload, mode, drawTool, floor, startNode } = config;
  if (!payload || !startNode) { return null; }
  
  if (startNode !== endNode) {
    if (mode === "path") {
      return handlePathDrag(payload, startNode, endNode);
    } 
    if (drawTool === "line") {
      return handleLineDraw({ payload, mode, startNode, endNode, floor });
    }
  }
  return null;
}

function getScreenPos(e: React.MouseEvent): { x: number; y: number } {
  const rect = e.currentTarget.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getGridKey(e: React.MouseEvent, config: MouseConfig): string {
  const rect = e.currentTarget.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const grid = screenToGrid({ x: sx, y: sy }, { cellSize: 20, zoom: config.zoom, panX: config.panX, panY: config.panY });
  return `${grid.col},${grid.row},${config.floor}`;
}

function handleMouseSelect(config: MouseConfig, key: string): void {
  const { payload, mode, setSelectedMarker } = config;
  if (!payload) {return;}
  if (["select", "room", "teleporter"].includes(mode)) {
    if (payload.rooms[key]) { setSelectedMarker({ type: "room", key }); }
    else if (payload.teleporters[key]) { setSelectedMarker({ type: "teleporter", key }); }
    else if (mode !== "select") { setSelectedMarker({ type: mode as "room" | "teleporter", key }); }
    else { setSelectedMarker(null); }
  }
}

function useMapMouse(config: MouseConfig): MapMouseHandlers {
  const { payload, mode, drawTool, floor, startNode, isDragging, setStartNode, setPayload, setIsDragging, setCursorPos } = config;

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!payload) { return; }
    const key = getGridKey(e, config);
    setIsDragging(true);

    if (mode === "path" || drawTool === "line") {
      setStartNode(key);
    } 
    
    handleMouseSelect(config, key);

    if (drawTool === "free" && mode !== "path" && mode !== "select") {
      const parts = key.split(",");
      setPayload(handleEditorClick({ mode, x: Number(parts[0]), y: Number(parts[1]), z: floor, payload }));
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!payload || !isDragging) { return; }
    setCursorPos(getScreenPos(e));
    if (drawTool === "free" && mode !== "path" && mode !== "select") {
      const key = getGridKey(e, config);
      const parts = key.split(",");
      setPayload(handleEditorClick({ mode, x: Number(parts[0]), y: Number(parts[1]), z: floor, payload }));
    }
  };

  const onMouseUp = (e: React.MouseEvent<HTMLDivElement>): void => {
    setIsDragging(false);
    setCursorPos(null);
    if (!payload || !startNode) { return; }
    const endNode = getGridKey(e, config);
    const result = processMouseDrag(config, endNode);
    if (result) { setPayload(result); }
    setStartNode(null);
  };
  
  const onMouseLeave = (): void => {
    setIsDragging(false);
    setCursorPos(null);
    setStartNode(null);
  };

  return { onMouseDown, onMouseMove, onMouseUp, onMouseLeave };
}

const CELL_SIZE = 20;

function computeStartNodeScreen(startNode: string | null): { x: number; y: number } | null {
  if (!startNode) { return null; }
  const p = startNode.split(",").map(Number);
  return { x: p[0] * CELL_SIZE + CELL_SIZE / 2, y: p[1] * CELL_SIZE + CELL_SIZE / 2 };
}

interface EditorCanvasProps {
  payload: MapPayload;
  floor: number;
  handlers: MapMouseHandlers;
  isDragging: boolean;
  startNodeScreen: { x: number; y: number } | null;
  cursorPos: { x: number; y: number } | null;
  showPreview: boolean;
}

function EditorCanvas(props: EditorCanvasProps & { zoom: number; panX: number; panY: number }): React.ReactNode {
  const { payload, floor, handlers, isDragging, startNodeScreen, cursorPos, showPreview, zoom, panX, panY } = props;
  
  // startNodeScreen is in grid space (unzoomed). We must transform it if showing preview.
  const previewStart = startNodeScreen ? {
    x: startNodeScreen.x * zoom + panX,
    y: startNodeScreen.y * zoom + panY
  } : null;

  return (
    <div className="relative inline-block border-2 border-zinc-700 bg-white shadow-2xl rounded overflow-hidden select-none">
      <div className="cursor-crosshair w-full h-full" {...handlers}>
        <MapCanvas payload={payload} currentFloor={floor} showEditorGraph zoom={zoom} panX={panX} panY={panY} />
      </div>
      {isDragging && showPreview && previewStart && cursorPos && (
        <svg className="absolute inset-0 pointer-events-none" width="800" height="600" style={{ top: 0, left: 0 }}>
          <line
            x1={previewStart.x} y1={previewStart.y}
            x2={cursorPos.x} y2={cursorPos.y}
            stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.85"
          />
          <circle cx={previewStart.x} cy={previewStart.y} r="4" fill="#ef4444" />
        </svg>
      )}
    </div>
  );
}
function RoomPropertyPanel({ payload, setPayload, keyId }: { payload: MapPayload; setPayload: (p: MapPayload) => void; keyId: string }): React.ReactNode {
  const room = payload.rooms[keyId];
  return (
    <div className="p-4 bg-zinc-900 border border-zinc-700 rounded flex flex-col gap-2">
      <h3 className="font-bold text-blue-400">Room Properties</h3>
      <label className="text-sm">Name</label>
      <input 
        className="bg-zinc-800 p-1 rounded border border-zinc-600" 
        value={room.name}
        onChange={(e): void => {
          const newP = { ...payload, rooms: { ...payload.rooms } };
          newP.rooms[keyId] = { ...room, name: e.target.value };
          setPayload(newP);
        }}
      />
      <div className="text-xs text-zinc-500 mt-2">ID: {room.id} | Pos: {keyId}</div>
    </div>
  );
}

function TeleporterPropertyPanel({ payload, setPayload, keyId }: { payload: MapPayload; setPayload: (p: MapPayload) => void; keyId: string }): React.ReactNode {
  const tel = payload.teleporters[keyId];
  return (
    <div className="p-4 bg-zinc-900 border border-zinc-700 rounded flex flex-col gap-2">
      <h3 className="font-bold text-purple-400">Teleporter Properties</h3>
      <label className="text-sm">Teleporter ID</label>
      <input 
        className="bg-zinc-800 p-1 rounded border border-zinc-600" 
        value={tel.teleporter_id}
        onChange={(e): void => {
          const newP = { ...payload, teleporters: { ...payload.teleporters } };
          newP.teleporters[keyId] = { ...tel, teleporter_id: e.target.value };
          setPayload(newP);
        }}
      />
      <label className="text-sm">Name</label>
      <input 
        className="bg-zinc-800 p-1 rounded border border-zinc-600" 
        value={tel.name}
        onChange={(e): void => {
          const newP = { ...payload, teleporters: { ...payload.teleporters } };
          newP.teleporters[keyId] = { ...tel, name: e.target.value };
          setPayload(newP);
        }}
      />
      <div className="text-xs text-zinc-500 mt-2">Pos: {keyId}</div>
    </div>
  );
}

function PropertyPanel({ payload, setPayload, selectedMarker }: { payload: MapPayload; setPayload: (p: MapPayload) => void; selectedMarker: SelectedMarker }): React.ReactNode {
  if (!selectedMarker) { return <div className="p-4 bg-zinc-900 border border-zinc-700 rounded text-zinc-400">No marker selected.</div>; }
  const { type, key } = selectedMarker;
  if (type === "room" && payload.rooms[key]) { return <RoomPropertyPanel payload={payload} setPayload={setPayload} keyId={key} />; }
  if (type === "teleporter" && payload.teleporters[key]) { return <TeleporterPropertyPanel payload={payload} setPayload={setPayload} keyId={key} />; }
  return null;
}

function FloorRow({ payload, setPayload, z, floor, setFloor, name }: { payload: MapPayload; setPayload: (p: MapPayload) => void; z: string; floor: number; setFloor: (f: number) => void; name: string }): React.ReactNode {
  return (
    <div className="flex gap-2 items-center">
      <span className="w-6 text-center">{z}</span>
      <input 
        className="bg-zinc-800 p-1 rounded border border-zinc-600 flex-1" 
        value={name}
        onChange={(e): void => {
          const newP = { ...payload, floors: { ...payload.floors } };
          newP.floors[z] = { name: e.target.value };
          setPayload(newP);
        }}
      />
      <button 
        className="bg-red-900 text-red-200 px-2 rounded hover:bg-red-800"
        onClick={(): void => {
          if (Object.keys(payload.floors).length <= 1) { return; }
          if (confirm(`Delete floor ${z} and all its data?`)) {
            const newP = { ...payload, floors: { ...payload.floors } };
            delete newP.floors[z];
            newP.walls = newP.walls.filter((w) => w[2] !== Number(z));
            newP.nodes = Object.fromEntries(Object.entries(newP.nodes).filter(([k]) => k.split(",")[2] !== z));
            newP.rooms = Object.fromEntries(Object.entries(newP.rooms).filter(([k]) => k.split(",")[2] !== z));
            newP.teleporters = Object.fromEntries(Object.entries(newP.teleporters).filter(([k]) => k.split(",")[2] !== z));
            setPayload(newP);
            if (floor === Number(z)) { setFloor(Number(Object.keys(newP.floors)[0])); }
          }
        }}
      >X</button>
    </div>
  );
}

function FloorManager({ payload, setPayload, floor, setFloor }: { payload: MapPayload; setPayload: (p: MapPayload) => void; floor: number; setFloor: (f: number) => void }): React.ReactNode {
  const sortedFloors = Object.entries(payload.floors).sort((a, b) => Number(a[0]) - Number(b[0]));
  return (
    <div className="p-4 bg-zinc-900 border border-zinc-700 rounded flex flex-col gap-3 mt-4">
      <h3 className="font-bold">Floor Manager</h3>
      {sortedFloors.map(([z, fl]) => (
        <FloorRow key={z} payload={payload} setPayload={setPayload} z={z} floor={floor} setFloor={setFloor} name={fl.name} />
      ))}
      <button 
        className="bg-zinc-700 px-2 py-1 rounded text-sm hover:bg-zinc-600 mt-2"
        onClick={(): void => {
          const nextZ = Math.max(...Object.keys(payload.floors).map(Number)) + 1;
          const newP = { ...payload, floors: { ...payload.floors } };
          newP.floors[String(nextZ)] = { name: `Floor ${nextZ}` };
          setPayload(newP);
          setFloor(nextZ);
        }}
      >+ Add Floor</button>
    </div>
  );
}

function EditorControls({ setZoom, setPanX, setPanY }: { setZoom: React.Dispatch<React.SetStateAction<number>>; setPanX: React.Dispatch<React.SetStateAction<number>>; setPanY: React.Dispatch<React.SetStateAction<number>> }): React.ReactNode {
  return (
    <div className="flex gap-2 mt-4 justify-center">
      <button onClick={(): void => setZoom((z) => z * 1.2)} className="bg-zinc-800 px-3 py-1 rounded text-sm">Zoom In</button>
      <button onClick={(): void => setZoom((z) => z / 1.2)} className="bg-zinc-800 px-3 py-1 rounded text-sm">Zoom Out</button>
      <button onClick={(): void => setPanX((x) => x - 50)} className="bg-zinc-800 px-3 py-1 rounded text-sm">Left</button>
      <button onClick={(): void => setPanX((x) => x + 50)} className="bg-zinc-800 px-3 py-1 rounded text-sm">Right</button>
      <button onClick={(): void => setPanY((y) => y - 50)} className="bg-zinc-800 px-3 py-1 rounded text-sm">Up</button>
      <button onClick={(): void => setPanY((y) => y + 50)} className="bg-zinc-800 px-3 py-1 rounded text-sm">Down</button>
    </div>
  );
}
function EditorSidebar({ payload, setPayload, selectedMarker, floor, setFloor }: { payload: MapPayload; setPayload: (p: MapPayload) => void; selectedMarker: SelectedMarker; floor: number; setFloor: (f: number) => void }): React.ReactNode {
  return (
    <div className="w-80 flex flex-col gap-4">
      <PropertyPanel payload={payload} setPayload={setPayload} selectedMarker={selectedMarker} />
      <FloorManager payload={payload} setPayload={setPayload} floor={floor} setFloor={setFloor} />
    </div>
  );
}

interface EditorState {
  mode: Mode;
  setMode: (m: Mode) => void;
  drawTool: DrawTool;
  setDrawTool: (t: DrawTool) => void;
  floor: number;
  setFloor: (f: number) => void;
  startNode: string | null;
  setStartNode: (n: string | null) => void;
  isDragging: boolean;
  setIsDragging: (d: boolean) => void;
  cursorPos: { x: number; y: number } | null;
  setCursorPos: (p: { x: number; y: number } | null) => void;
  selectedMarker: SelectedMarker;
  setSelectedMarker: (s: SelectedMarker) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  panX: number;
  setPanX: React.Dispatch<React.SetStateAction<number>>;
  panY: number;
  setPanY: React.Dispatch<React.SetStateAction<number>>;
}

function useEditorState(payload: MapPayload | null, setPayload: (p: MapPayload) => void): EditorState {
  const [mode, setMode] = useState<Mode>("wall");
  const [drawTool, setDrawTool] = useState<DrawTool>("free");
  const [floor, setFloor] = useState(1);
  const [startNode, setStartNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<SelectedMarker>(null);

  const defaultZoom = payload?.meta?.zoomFactor ?? 1;
  const [zoom, setZoomState] = useState(defaultZoom);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const setZoom = (action: React.SetStateAction<number>): void => {
    setZoomState((prev) => {
      const newZoom = typeof action === "function" ? action(prev) : action;
      if (payload && payload.meta.zoomFactor !== newZoom) {
        setPayload({ ...payload, meta: { ...payload.meta, zoomFactor: newZoom } });
      }
      return newZoom;
    });
  };

  return { mode, setMode, drawTool, setDrawTool, floor, setFloor, startNode, setStartNode, isDragging, setIsDragging, cursorPos, setCursorPos, selectedMarker, setSelectedMarker, zoom, setZoom, panX, setPanX, panY, setPanY };
}

export default function EditorPage(): React.ReactNode {
  const [isLocked, setIsLocked] = useState(false);
  const [payload, setPayload] = useState<MapPayload | null>(null);
  const { acquireLock, saveMap, failedEdges } = useEditorApi(setIsLocked, setPayload);
  const state = useEditorState(payload, setPayload);

  const startNodeScreen = computeStartNodeScreen(state.startNode);
  const handlers = useMapMouse({
    payload, setPayload, ...state
  });

  if (!isLocked) { return <LockScreen onLock={acquireLock} />; }
  if (!payload) { return <div className="p-8 text-white">Loading Map...</div>; }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white p-6">
      <EditToolbar
        mode={state.mode} setMode={state.setMode} drawTool={state.drawTool} setDrawTool={state.setDrawTool}
        floor={state.floor} setFloor={state.setFloor} onSave={(): void => { saveMap(payload).catch(() => { }); }}
        failedEdges={failedEdges} floors={payload.floors ?? {}}
      />
      
      <div className="flex gap-6 items-start">
        <div className="flex-1 flex flex-col items-center">
          <EditorCanvas
            payload={payload} floor={state.floor} handlers={handlers} isDragging={state.isDragging}
            startNodeScreen={startNodeScreen} cursorPos={state.cursorPos}
            showPreview={state.drawTool === "line" || state.mode === "path"}
            zoom={state.zoom} panX={state.panX} panY={state.panY}
          />
          <EditorControls setZoom={state.setZoom} setPanX={state.setPanX} setPanY={state.setPanY} />
        </div>
        
        <EditorSidebar payload={payload} setPayload={setPayload} selectedMarker={state.selectedMarker} floor={state.floor} setFloor={state.setFloor} />
      </div>
    </div>
  );
}
