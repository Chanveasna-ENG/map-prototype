import { NextResponse } from "next/server";
import { readMapPayload, writeMapPayload } from "@/src/storage/file-manager";
import { isPathClear } from "@/src/validation/bresenham";
import type { Point3D } from "@/src/validation/bresenham";
import type { 
  UpdateMapRequest, 
  UpdateMapResponse, 
  ErrorEnvelope,
  GetMapPayloadResponse
} from "@/src/contracts/api-schemas";

export const dynamic = "force-dynamic";

function parseKey(key: string): Point3D {
  const parts = key.split(",");
  return {
    x: Number(parts[0]),
    y: Number(parts[1]),
    z: Number(parts[2]),
  };
}

export async function GET(): Promise<NextResponse<GetMapPayloadResponse>> {
  const payload = await readMapPayload();
  return NextResponse.json(payload);
}

function validateEdges(body: UpdateMapRequest): string[] {
  const wallSet = new Set<string>();
  for (let i = 0; i < body.walls.length; i++) {
    const [x, y] = body.walls[i];
    wallSet.add(`${x},${y}`);
  }

  const isWall = (x: number, y: number, _z: number): boolean => {
    return wallSet.has(`${x},${y}`);
  };

  const failedEdges: string[] = [];
  const nodeKeys = Object.keys(body.nodes);
  
  for (let i = 0; i < nodeKeys.length; i++) {
    const startKey = nodeKeys[i];
    const node = body.nodes[startKey];
    const startPos = parseKey(startKey);
    
    const edges = Object.keys(node.edges);
    for (let j = 0; j < edges.length; j++) {
      const endKey = edges[j];
      const endPos = parseKey(endKey);
      
      if (!isPathClear(startPos, endPos, isWall)) {
        failedEdges.push(`${startKey}->${endKey}`);
      }
    }
  }
  return failedEdges;
}

export async function PUT(req: Request): Promise<NextResponse<UpdateMapResponse | ErrorEnvelope>> {
  try {
    const body = (await req.json()) as UpdateMapRequest;
    const failedEdges = validateEdges(body);

    if (failedEdges.length > 0) {
      return NextResponse.json(
        { success: false, failed_edges: failedEdges },
        { status: 400 }
      );
    }

    await writeMapPayload(body);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error_code: "INTERNAL_ERROR", message: "Failed to update map" },
      { status: 500 }
    );
  }
}
