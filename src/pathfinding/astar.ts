import type { Node } from "../contracts/data-models";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface AStarState {
  endKey: string;
  nodes: Record<string, Node>;
  openSet: string[];
  cameFrom: Record<string, string>;
  gScore: Record<string, number>;
  fScore: Record<string, number>;
}

function parseNodeKey(key: string): Point3D {
  const parts = key.split(",");
  return {
    x: Number(parts[0]),
    y: Number(parts[1]),
    z: Number(parts[2]),
  };
}

function calcHeuristic(key1: string, key2: string): number {
  const p1 = parseNodeKey(key1);
  const p2 = parseNodeKey(key2);
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (p1.z !== p2.z) {
    return dist + 10;
  }
  return dist;
}

function reconstructPath(cameFrom: Record<string, string>, current: string): string[] {
  const path = [current];
  let curr = current;
  while (cameFrom[curr] !== undefined) {
    curr = cameFrom[curr];
    path.unshift(curr);
  }
  return path;
}

function getLowestFScore(openSet: string[], fScore: Record<string, number>): string {
  let lowestNode = openSet[0];
  let lowestScore = fScore[lowestNode] ?? Infinity;

  for (let i = 1; i < openSet.length; i++) {
    const node = openSet[i];
    const score = fScore[node] ?? Infinity;
    if (score < lowestScore) {
      lowestScore = score;
      lowestNode = node;
    }
  }
  return lowestNode;
}

function processNeighbors(current: string, state: AStarState): void {
  const node = state.nodes[current];
  if (!node) {
    return;
  }

  const neighbors = Object.keys(node.edges);
  
  for (let i = 0; i < neighbors.length; i++) {
    const neighbor = neighbors[i];
    const baseCost = node.edges[neighbor] as number;
    
    const p1 = parseNodeKey(current);
    const p2 = parseNodeKey(neighbor);
    const stepCost = p1.z !== p2.z ? baseCost + 10 : baseCost;

    const currentG = state.gScore[current] as number;
    const tentativeGScore = currentG + stepCost;
    
    const neighborG = state.gScore[neighbor] ?? Infinity;
    
    if (tentativeGScore < neighborG) {
      state.cameFrom[neighbor] = current;
      state.gScore[neighbor] = tentativeGScore;
      state.fScore[neighbor] = tentativeGScore + calcHeuristic(neighbor, state.endKey);
      
      if (!state.openSet.includes(neighbor)) {
        state.openSet.push(neighbor);
      }
    }
  }
}

export function astar(
  startKey: string,
  endKey: string,
  nodes: Record<string, Node>
): string[] {
  const state: AStarState = {
    endKey,
    nodes,
    openSet: [startKey],
    cameFrom: {},
    gScore: { [startKey]: 0 },
    fScore: { [startKey]: calcHeuristic(startKey, endKey) },
  };

  while (state.openSet.length > 0) {
    const current = getLowestFScore(state.openSet, state.fScore);
    
    if (current === endKey) {
      return reconstructPath(state.cameFrom, current);
    }
    
    const index = state.openSet.indexOf(current);
    state.openSet.splice(index, 1);
    
    processNeighbors(current, state);
  }

  return [];
}
