# School Map Technical Prototype Specification

This document details the architecture, data structures, validation rules, and physical file layout of the school map prototype. The project is implemented as a lightweight, database-free Next.js web application utilizing HTML5 Canvas for map visualization and editing.

---

## 1. Project Summary

This web application project provides a prototype school map that functions similarly to Google Maps. The application addresses the difficulty parents and new students face when trying to locate specific offices or classrooms in the school. The technical focus of this prototype is validating path traversals, multi-floor rendering, sparse grid storage, map editing, and concurrent editing prevention.

---

## 2. Users & Roles

- **Kiosk Mode (User Mode):** Real-world users (parents, visitors, and new students) who interact with a fixed physical kiosk terminal. Users select their destination by clicking marker pins on the canvas. The starting point is automatically fixed to the kiosk's registered coordinate.
- **Admin Mode (Edit Mode):** School administrators who create, edit, and update the maps. Admins do not need a technical background; they paint walls, place markers, and draw paths using a paint-like canvas interface.

---

## 3. Goals & Success Criteria

- Validate technical flows of map editing, validation, saving, and traversal in a Next.js framework.
- Focus strictly on technical correctness: pathfinding, wall collisions, multi-floor routing, data structures, and simple file-based concurrency.
- Abstract the node graph completely from non-technical admin users under a simple drawing metaphor.

---

## 4. Functional Requirements

### User Mode (Navigation & Kiosk)
- **Start and Destination Selection:** Clicking a marker room or teleporter sets the starting point or destination. The start point can be fixed to the kiosk node's coordinates.
- **A\* Pathfinding:** Running a standard A\* algorithm on the frontend path graph to render the shortest walkable path to the target room.
- **Multi-Floor Path Routing:** Paths that transition across different floors show a clear, interactive visual banner cue (e.g., *"Path continues on Floor 2"*) containing a **"Switch"** button to automatically flip the canvas layout to the next floor.
- **Canvas Panning & Zooming:** Standard viewport navigation buttons (Zoom In, Zoom Out, Left, Right, Up, Down) manipulate the grid viewport.

### Edit Mode (Map Editing)
- **Drawing Modes:**
  - **Select Mode:** Clicking markers (Rooms/Teleporters) opens a sidebar Property Panel to edit properties (name, teleporter ID, type, floors).
  - **Wall Mode:** Paints visual walls on the grid, adding coordinate points to the sparse wall list.
  - **Eraser Mode:** Removes walls, nodes, rooms, or teleporters from the canvas and associated JSON definitions.
  - **Path Mode:** Dragging between two coordinates draws a path segment. Bresenham's algorithm checks for wall intersections. If the path is clear, it instantiates nodes and a bidirectional edge.
  - **Room Mode:** Places room marker objects at grid cells. Generates room IDs in the `300-400` range.
  - **Teleporter Mode:** Places elevator/stair marker objects. Generates teleporter IDs in the `100-200` range (e.g., `T100`).
- **Drawing Tools:**
  - **Free-draw Tool:** Places a single cell element or click-and-drag for continuous drawing (applies to Wall and Eraser modes).
  - **Line Tool (Ruler):** Click-and-drag line previewing that plots straight path segments or walls using Bresenham's line algorithm.
- **Floor Manager GUI:** Admins can dynamically add a new floor (Z-index incremented automatically) and rename or delete existing floors (cascades and purges all walls, nodes, and markers associated with that floor level).

### Concurrency Prevention
- **Lockfile Concurrency Control:** Admins must acquire an edit lock by entering their name on a Lock Screen.
- **Staleness Expiry:** The `edit.lock` file stores the admin name and a timestamp. Locks older than 2 hours are automatically deleted by the backend.
- **Lock Release:** Successful map saving automatically deletes the lockfile. Closing the browser tab retains the lock, relying on social communication to resolve locking issues.

---

## 5. Technical Architecture & Data Structure

### Coordinate System & Viewport Transform
The logical grid cells are the single source of truth. Grid coordinates are scaled to screen coordinates dynamically:
```typescript
screen_x = (col * cell_size * zoom) + pan_x
screen_y = (row * cell_size * zoom) + pan_y

col = Math.floor((screen_x - pan_x) / (cell_size * zoom))
row = Math.floor((screen_y - pan_y) / (cell_size * zoom))
```

### Sparse JSON Grid Storage
To optimize network payloads and memory consumption, the logical grid is stored in a sparse layout. Empty cells (`0`) are omitted from the JSON payload. Only occupied cells (walls, rooms, teleporters) are explicitly defined.

### TypeScript Contracts (`/src/contracts/data-models.ts`)
```typescript
export interface Node {
  edges: Record<string, number>; // Maps adjacent coordinate keys ("x,y,z") to Euclidean distance weights
}

export interface Room {
  id: number;
  name: string;
  anchor_node: string; // Coordinate key "x,y,z"
  disconnected?: boolean;
}

export interface Teleporter {
  teleporter_id: string; // e.g. "T100"
  name: string;
  type: string;          // "stairs" | "elevator"
  floors: number[];      // Accessible floor indices
  status: string;        // "active" | "maintenance"
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
  walls: [number, number, number][]; // Array of [x, y, z] wall coordinates
  nodes: Record<string, Node>;       // Adjacency list of coordinates
  rooms: Record<string, Room>;       // Room marker registry
  teleporters: Record<string, Teleporter>; // Teleporter registry
  floors: Record<string, Floor>;     // Floor registry
}

export interface Lock {
  is_locked: boolean;
  locked_by: string;
  timestamp: number;
}
```

---

## 6. Algorithmic and Validation Logic

### Pathfinding (A* & Teleporters)
Pathfinding traverses a pre-constructed graph:
1. **Teleporter Graph Generation:** On pathfinding invocation, matching teleporters across different floors are virtually linked in the adjacency list. Traveling across floors adds a fixed weight penalty (+20 cost).
2. **Standard A\* Search:** Traverses grid node coordinates. Reconstructs coordinate path arrays.
3. **Canvas Drawing:** Replays coordinate connections and draws a solid blue canvas path segment.

### Bresenham's Collision & Corner Clipping Prevention
When paths are created or updated, Bresenham's line algorithm plots individual cell coordinates between start and target points.
1. **Wall Intersection Verification:** Every step along the line is checked against the active wall set.
2. **Corner Clipping Check:** Diagonal steps prevent corner cutting. If a diagonal step's adjacent horizontal and vertical neighbors are walls, the path is rejected:
   ```typescript
   const xAxisWall = isWall(state.x, state.y - state.stepY, z);
   const yAxisWall = isWall(state.x - state.stepX, state.y, z);
   if (xAxisWall || yAxisWall) {
     return true; // Collision detected
   }
   ```
3. **Save-Time API Re-verification:** On `PUT /api/map`, the Next.js backend re-verifies every edge in the nodes list against the walls list. If any edge intersects a wall, the save fails with HTTP 400 and returns a list of `failed_edges` to highlight in red on the admin screen.

---

## 7. Storage Implementation

Persistence uses native Node.js filesystem API operations within `/data`:
- **`data/school-map.json`**: Active MapPayload storage file.
- **`data/edit.lock`**: Standard JSON file recording current edit lock state.

---

## 8. Physical Directory Structure

```
/data
  school-map.json         # Sparse MapPayload storage file
  edit.lock               # Lockfile payload
/src
  /app
    /api
      /map
        route.ts          # GET /api/map and PUT /api/map endpoints (re-verifies edges)
      /lock
        route.ts          # GET, POST, DELETE edit lock endpoints
    /kiosk
      page.tsx            # Kiosk user page with next-floor cue banners
    /edit
      page.tsx            # Paint-like canvas editor with property panels & floor manager
  /contracts
    data-models.ts        # TypeScript interfaces for entities
    api-schemas.ts        # Request / Response schemas and error envelopes
  /storage
    file-manager.ts       # Filesystem read / write controllers
  /pathfinding
    astar.ts              # Frontend A* graph traversal algorithm
  /validation
    bresenham.ts          # Bresenham line plotting and diagonal clipping checks
  /rendering
    coordinate-transform.ts # Cell-to-pixel coordinate transforms
    MapCanvas.tsx         # React HTML5 canvas map renderer
```
