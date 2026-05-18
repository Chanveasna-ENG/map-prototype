import React, { useEffect, useRef } from "react";
import type { MapPayload } from "../contracts/data-models";
import { gridToScreen, type ViewportTransform } from "./coordinate-transform";

export interface MapCanvasProps {
  payload: MapPayload;
  currentFloor: number;
  drawnPath?: string[];
  zoom?: number;
  panX?: number;
  panY?: number;
  cellSize?: number;
  width?: number;
  height?: number;
}

interface DrawConfig {
  ctx: CanvasRenderingContext2D;
  payload: MapPayload;
  currentFloor: number;
  transform: ViewportTransform;
}

function drawWalls(config: DrawConfig): void {
  const { ctx, payload, transform } = config;
  ctx.fillStyle = "#000000";
  const size = transform.cellSize * transform.zoom;
  for (let i = 0; i < payload.walls.length; i++) {
    const [x, y] = payload.walls[i];
    const pos = gridToScreen({ col: x, row: y }, transform);
    ctx.fillRect(pos.x, pos.y, size, size);
  }
}

function drawRooms(config: DrawConfig): void {
  const { ctx, payload, currentFloor, transform } = config;
  const size = transform.cellSize * transform.zoom;
  const entries = Object.entries(payload.rooms);
  
  for (let i = 0; i < entries.length; i++) {
    const [, room] = entries[i];
    const parts = room.anchor_node.split(",");
    const z = Number(parts[2]);
    if (z === currentFloor) {
      const pos = gridToScreen({ col: Number(parts[0]), row: Number(parts[1]) }, transform);
      ctx.fillStyle = "rgba(0, 0, 255, 0.2)";
      ctx.fillRect(pos.x, pos.y, size, size);
      ctx.strokeStyle = "#0000ff";
      ctx.strokeRect(pos.x, pos.y, size, size);
      ctx.fillStyle = "#0000ff";
      ctx.font = `${12 * transform.zoom}px sans-serif`;
      ctx.fillText(room.name, pos.x, pos.y - 2);
    }
  }
}

function drawTeleporters(config: DrawConfig): void {
  const { ctx, payload, currentFloor, transform } = config;
  const size = transform.cellSize * transform.zoom;
  const entries = Object.entries(payload.teleporters);
  
  for (let i = 0; i < entries.length; i++) {
    const [key, teleporter] = entries[i];
    if (teleporter.floors.includes(currentFloor)) {
      const parts = key.split(",");
      const pos = gridToScreen({ col: Number(parts[0]), row: Number(parts[1]) }, transform);
      ctx.fillStyle = "#8a2be2";
      ctx.fillRect(pos.x, pos.y, size, size);
      ctx.fillStyle = "#ffffff";
      ctx.font = `${10 * transform.zoom}px sans-serif`;
      ctx.fillText("T", pos.x + size / 4, pos.y + size / 1.5);
    }
  }
}

interface PathConfig {
  ctx: CanvasRenderingContext2D;
  drawnPath: string[];
  currentFloor: number;
  transform: ViewportTransform;
}

function drawPath(config: PathConfig): void {
  const { ctx, drawnPath, currentFloor, transform } = config;
  if (drawnPath.length === 0) {
    return;
  }
  ctx.strokeStyle = "#ff0000";
  ctx.lineWidth = 3 * transform.zoom;
  ctx.beginPath();
  
  let isFirst = true;
  for (let i = 0; i < drawnPath.length; i++) {
    const key = drawnPath[i];
    const parts = key.split(",");
    const z = Number(parts[2]);
    if (z === currentFloor) {
      const pos = gridToScreen({ col: Number(parts[0]), row: Number(parts[1]) }, transform);
      const half = (transform.cellSize * transform.zoom) / 2;
      const cx = pos.x + half;
      const cy = pos.y + half;
      if (isFirst) {
        ctx.moveTo(cx, cy);
        isFirst = false;
      } else {
        ctx.lineTo(cx, cy);
      }
    } else {
      isFirst = true;
    }
  }
  ctx.stroke();
}

export function MapCanvas({
  payload,
  currentFloor,
  drawnPath = [],
  zoom = 1,
  panX = 0,
  panY = 0,
  cellSize = 20,
  width = 800,
  height = 600,
}: MapCanvasProps): React.ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) { return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) { return; }

    const transform: ViewportTransform = { cellSize, zoom, panX, panY };
    let animationFrameId: number;

    const render = (): void => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const drawConfig: DrawConfig = { ctx, payload, currentFloor, transform };
      drawWalls(drawConfig);
      drawRooms(drawConfig);
      drawTeleporters(drawConfig);
      drawPath({ ctx, drawnPath, currentFloor, transform });
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return (): void => { cancelAnimationFrame(animationFrameId); };
  }, [payload, currentFloor, drawnPath, zoom, panX, panY, cellSize]);

  return <canvas ref={canvasRef} width={width} height={height} className="border border-zinc-200" />;
}
