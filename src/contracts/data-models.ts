export interface Node {
  edges: Record<string, number>;
}

export interface Room {
  id: number;
  name: string;
  anchor_node: string;
  disconnected?: boolean;
}

export interface Teleporter {
  teleporter_id: string;
  name: string;
  type: string;
  floors: number[];
  status: string;
}

export interface Floor {
  name: string;
}

export interface MapPayload {
  meta: {
    width: number;
    height: number;
    zoomFactor?: number;
  };
  walls: [number, number, number][];
  nodes: Record<string, Node>;
  rooms: Record<string, Room>;
  teleporters: Record<string, Teleporter>;
  floors: Record<string, Floor>;
}

export interface Lock {
  is_locked: boolean;
  locked_by: string;
  timestamp: number;
}
