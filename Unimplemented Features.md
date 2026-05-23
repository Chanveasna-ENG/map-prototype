# Unimplemented & Vague Map Prototype Features

This document compares and contrasts the initial system specifications against the actual codebase implementation as of May 2026. It highlights features that were described in early design documents but remain unimplemented or were intentionally omitted/adapted during development.

---

## 1. Reachability Validation (Root Node Ping)

### Initial Specification
- A "Root Node" with ID `999` represents the path network itself.
- Every marker object (Room/Teleporter) must "ping" the root node (check reachability using A* or BFS) to prove it is connected to the path network.
- Objects failing to reach the root node are "greyed out" on screen.
- A warning message is triggered during save: *"Are you sure you want to save this map? There are some paths that are not connected. Yes/No"*.
- Disconnected rooms are automatically hidden from User Mode.

### Codebase Status: **Not Implemented**
- **No Root Node (`999`)**: The codebase does not declare, search for, or enforce a root node.
- **No Reachability Validation**: There is no A* or BFS-based reachability check run on marker objects when drawing or saving.
- **No Saving Warning or Filtering**: The `PUT /api/map` handler only verifies physical path segments (edges) against wall collisions. It does not verify if all rooms can navigate to one another or if they are isolated. No confirm dialog for disconnection is shown on save, and no rooms are filtered out of the kiosk view.

---

## 2. Wall Painting & Drawing Constraints

### Initial Specification
- Admins apply four distinct drawing modes: Eraser (0), Wall (1), Path (2), and Object Markers.
- Visual paths can only be drawn on empty space (`0`). Paths cannot be drawn over a wall.
- During path drawing, if the line hits a wall or crosses 3 pixels (preventing corner clipping), the drawing action is cancelled or the line does not appear.

### Codebase Status: **Partially Implemented & Adapted**
- **Wall & Marker Placement**: You can paint walls, rooms, and teleporters. Eraser cleanly removes them.
- **Path/Edge Creation**: Path drawing is handled by dragging between two grid cells in Path Mode. If the line between them has a clear path (verified by Bresenham's `isPathClear` against the wall coordinate set), a bidirectional edge is added.
- **Draw-Time Enforcement**: If the path intersects a wall, the line simply doesn't get created in the graph. However, there is no "3-pixel cross clipping" check. Instead, standard diagonal corner clipping prevention checks are run to ensure diagonal paths do not slice through diagonal wall joints.

---

## 3. Fixed Grid Constraints

### Initial Specification
- Mandated a fixed logical grid size of exactly `1000x1000` cells.

### Codebase Status: **Adapted to Dynamic Grid**
- The system was built to support fully dynamic grid sizes based on `meta.width` and `meta.height` parameters in the JSON payload.
- The default `school-map.json` is configured as a `500x300` grid with a cell size of `20` pixels. Viewport panning and zooming dynamically adapt to any grid dimensions.

---

## 4. Concurrency Warning & Social Pressure UI

### Initial Specification
- The other administrators will see "by whom" the editing is locked on the kiosk or lock screen so they can "scold them".
- A warning message panel inside the admin dashboard shows active broken paths and lock statuses.

### Codebase Status: **Simplified**
- **Lock Acquisition**: Lock file (`edit.lock`) stores `{ is_locked: true, locked_by: name, timestamp: number }`.
- **Lock Screen**: The admin must enter a name to acquire the lock. If locked, the screen displays a plain alert showing whom the editing is locked by. No full admin dashboard or detailed warning panel is implemented (as it was designated out of scope).

---

## 5. Summary Matrix (Implemented vs. Unimplemented)

| Feature Spec | Codebase Implementation | Status |
| :--- | :--- | :--- |
| **Grid Cell Space representation** | Sparse coordinate list stored in JSON (`walls`, `nodes`, `rooms`, `teleporters`). 0s are omitted. | **Implemented** |
| **Bresenham's Line Validation** | Run on frontend at draw-time and backend on `PUT /api/map` to detect wall collisions. | **Implemented** |
| **Multi-Floor Pathfinding** | A* traversals with cross-floor teleporter connections costing +20. | **Implemented** |
| **Lockfile Concurrency** | Text-based `edit.lock` file with automatic 2-hour staleness expiration. | **Implemented** |
| **Root Node Reachability (999)** | A* reachability check to root node on save to grey out rooms. | **Unimplemented** |
| **Floor Manager** | GUI to dynamically add/remove floors and cascade deletes. | **Newly Added Feature** |
| **Kiosk Floor Transition Cue** | Detection of multi-floor paths showing a banner to switch floors. | **Newly Added Feature** |
