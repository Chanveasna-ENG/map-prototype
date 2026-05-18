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
  showEditorGraph?: boolean;
}

interface DrawConfig {
  ctx: CanvasRenderingContext2D;
  payload: MapPayload;
  currentFloor: number;
  transform: ViewportTransform;
}

function drawWalls(config: DrawConfig): void {
  const { ctx, payload, transform, currentFloor } = config;
  ctx.fillStyle = "#000000";
  const size = transform.cellSize * transform.zoom;
  for (let i = 0; i < payload.walls.length; i++) {
    const [x, y, z] = payload.walls[i];
    if (z === currentFloor) {
      const pos = gridToScreen({ col: x, row: y }, transform);
      ctx.fillRect(pos.x, pos.y, size, size);
    }
  }
}

// Draw saved graph edges as light-blue Bresenham lines between nodes
function drawGraphEdges(config: DrawConfig): void {
  const { ctx, payload, currentFloor, transform } = config;
  const half = (transform.cellSize * transform.zoom) / 2;
  const seenEdges = new Set<string>();

  ctx.strokeStyle = "#93c5fd"; // light blue
  ctx.lineWidth = 1.5 * transform.zoom;

  const nodeKeys = Object.keys(payload.nodes);
  for (let i = 0; i < nodeKeys.length; i++) {
    const startKey = nodeKeys[i];
    const startParts = startKey.split(",");
    if (Number(startParts[2]) !== currentFloor) { continue; }

    const startPos = gridToScreen({ col: Number(startParts[0]), row: Number(startParts[1]) }, transform);
    const startCx = startPos.x + half;
    const startCy = startPos.y + half;

    const edgeKeys = Object.keys(payload.nodes[startKey].edges);
    for (let j = 0; j < edgeKeys.length; j++) {
      const endKey = edgeKeys[j];
      const edgeId = [startKey, endKey].sort().join("|");
      if (seenEdges.has(edgeId)) { continue; }
      seenEdges.add(edgeId);

      const endParts = endKey.split(",");
      if (Number(endParts[2]) !== currentFloor) { continue; } // skip cross-floor edges visually

      const endPos = gridToScreen({ col: Number(endParts[0]), row: Number(endParts[1]) }, transform);
      const endCx = endPos.x + half;
      const endCy = endPos.y + half;

      ctx.beginPath();
      ctx.moveTo(startCx, startCy);
      ctx.lineTo(endCx, endCy);
      ctx.stroke();
    }
  }
}

// Draw node dots in deep blue
function drawNodes(config: DrawConfig): void {
  const { ctx, payload, currentFloor, transform } = config;
  const half = (transform.cellSize * transform.zoom) / 2;
  const radius = Math.max(3, half * 0.5);

  ctx.fillStyle = "#1d4ed8"; // deep blue
  const nodeKeys = Object.keys(payload.nodes);
  for (let i = 0; i < nodeKeys.length; i++) {
    const key = nodeKeys[i];
    const parts = key.split(",");
    if (Number(parts[2]) !== currentFloor) { continue; }
    const pos = gridToScreen({ col: Number(parts[0]), row: Number(parts[1]) }, transform);
    const cx = pos.x + half;
    const cy = pos.y + half;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

interface MarkerConfig {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  color: string;
  label: string;
  size: number;
}

function drawMarkerPin(config: MarkerConfig): void {
  const { ctx, x, y, color, label, size } = config;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - size / 2, y - size / 2);
  ctx.lineTo(x, y + size / 4);
  ctx.lineTo(x + size / 2, y - size / 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y - size / 2, size / 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#000000";
  ctx.font = `bold ${size / 2.5}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.substring(0, 2), x, y - size / 2);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
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
      const cx = pos.x + size / 2;
      const cy = pos.y + size / 2;
      drawMarkerPin({ ctx, x: cx, y: cy, color: "#ef4444", label: room.name, size: size * 1.5 });
    }
  }
}

function drawTeleporters(config: DrawConfig): void {
  const { ctx, payload, currentFloor, transform } = config;
  const size = transform.cellSize * transform.zoom;
  const entries = Object.entries(payload.teleporters);

  for (let i = 0; i < entries.length; i++) {
    const [key, teleporter] = entries[i];
    const parts = key.split(",");
    const z = Number(parts[2]);
    if (z === currentFloor) {
      const pos = gridToScreen({ col: Number(parts[0]), row: Number(parts[1]) }, transform);
      const cx = pos.x + size / 2;
      const cy = pos.y + size / 2;
      drawMarkerPin({ ctx, x: cx, y: cy, color: "#8a2be2", label: teleporter.teleporter_id, size: size * 1.5 });
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
  ctx.strokeStyle = "#3b82f6";
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

interface RenderParams {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  payload: MapPayload;
  currentFloor: number;
  drawnPath: string[];
  transform: ViewportTransform;
  showEditorGraph: boolean;
}

function renderFrame(params: RenderParams): void {
  const { ctx, canvas, payload, currentFloor, drawnPath, transform, showEditorGraph } = params;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const drawConfig: DrawConfig = { ctx, payload, currentFloor, transform };
  drawWalls(drawConfig);
  if (showEditorGraph) {
    drawGraphEdges(drawConfig);
    drawNodes(drawConfig);
  }
  drawRooms(drawConfig);
  drawTeleporters(drawConfig);
  drawPath({ ctx, drawnPath, currentFloor, transform });
}

function buildTransform(props: MapCanvasProps): ViewportTransform {
  return {
    cellSize: props.cellSize ?? 20,
    zoom: props.zoom ?? 1,
    panX: props.panX ?? 0,
    panY: props.panY ?? 0,
  };
}

export function MapCanvas(props: MapCanvasProps): React.ReactNode {
  const {
    payload,
    currentFloor,
    drawnPath = [],
    width = 800,
    height = 600,
    showEditorGraph = false,
  } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) { return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) { return; }
    const transform = buildTransform(props);
    let animationFrameId: number;
    const render = (): void => {
      renderFrame({ ctx, canvas, payload, currentFloor, drawnPath, transform, showEditorGraph });
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return (): void => { cancelAnimationFrame(animationFrameId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, currentFloor, drawnPath, props.zoom, props.panX, props.panY, props.cellSize, showEditorGraph]);

  return <canvas ref={canvasRef} width={width} height={height} className="border border-zinc-200 bg-white" />;
}
