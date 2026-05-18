## **1\. Project Summary**

This is a web app project prototype of a school map, functioning similarly to Google Maps. The problem it solves is that parents and new students often struggle to locate specific offices in the school. The intended outcome is to build the prototype and test the technical flow of map traversal, rendering, data flow, map editing, updating, deleting, and generating a new map.

## **2\. Users & Roles**

* **Parents and new students (User Mode):** Real users who will use a kiosk at some location in the school to find paths.  
* **School Admin (Edit Mode):** Users who create and edit the maps. They do not need to have a technical background.

## **3\. Goals & Success Criteria**

* Build the prototype and test the flow of user and admin editing, updating, deleting, and generating a new map as a web app.  
* The prototype only focuses on map traversal, rendering, data flow, and map editing (Technical Stuff).  
* The UX for User Mode and search functionalities will be handled in another step.

## **4\. Functional Requirements**

**User Mode (Navigation & Kiosk)**

* Users can pick their starting point and destination. However, they cannot start from anywhere; they can only start at a specific location/object on the map (the fixed kiosk is registered as one of the marker objects connected to the path).  
* Users can only click on existing marker objects for now (no search function is implemented yet).  
* The map runs A\* (frontend) on the node graph to render the visual path to reach the destination.  
* For multi-floor routing, the UI will have a cue or a watermark on the screen (e.g., "floor 2") to show the user the floor is located elsewhere.  
* If the user clicks on the 2nd floor or clicks the teleporter marker object, the UI will show that exact floor (using its z location) and show the path again from the connecting teleporter.

**Edit Mode (Map Editing)**

Editing Canvas: Works like Microsoft Paint or an image editor. Admins can freely zoom and pan the map as if it is an image.

Admins can select between four distinct Drawing Modes:

* Eraser Mode (0): Removes anything it touches on the canvas, returning the grid cell to empty walkable space.  
* Wall Mode (1): Draws walls directly on the canvas. When saved, the frontend converts these visual dots into a list of exact (x,y) coordinates for the backend.  
* Path Mode (2): Draws paths connecting destinations. Paths can ONLY be drawn on empty space (0). You cannot draw a path over a wall.  
* Object Marker Mode: Marks specific objects, rooms, and reachable destinations on the map. This stores the ID on the map itself. A delete button will delete markers.

Admins apply these modes using specific Drawing Tools:

* Free-draw Tool: Allows admins to click to place a single dot, or click-and-drag for free-form drawing. This tool can ONLY be used with Eraser, Wall, and Path modes. Object Markers cannot be click-and-dragged; they must be created one by one, click by click.  
* Line Tool: Uses Bresenham's line algorithm to draw perfectly straight lines between two points. This is typically used with Path Mode to cleanly connect special objects to the main path.  
* **Teleporters:** For multi-floor connections, admins do not physically connect paths across screens. They draw a path to a teleporter marker on one floor, move to the stack of another floor's render, and connect the main path to a teleporter with the same ID.  
* If a teleporter with the same ID on another floor is connected to the main path, the teleporter will light up (not grey out).

**Validation & Rendering Logic**

* **Root Node Ping:** A root node (ID 999\) represents the path itself. Every node looks for number 2 around it and calculates edge costs. Objects must "ping" the root node to prove connection.  
* **Disconnection Handling:** Objects that cannot ping the root node will grey out. When saving, the system provides a warning message asking: "Are you sure you want to save this map? there are some paths are not connected. Yes/No". Disconnected items are hidden from User Mode.  
* **Wall Collision (Draw-Time):** Because paths can only be drawn on empty space (0), the system checks if drawn paths (using either the Free-draw or Line tool) hit a wall or cross 3 pixels (preventing corner clipping) using the Bresenham's line algorithm.  
* **Edge Metadata:** The system stores only intersection/corner metadata as pre-validated segments (`validated: true`).  
* **Map Updates:** On every floorplan save/update, the backend re-runs Bresenham's on all stored edges against the new map. If a newly placed wall intersects an existing path, the save will fail. The UI will highlight the broken edge/nodes in red, forcing the admin to delete the current fail path and draw a new one.  
* **Path Rendering:** Reconstructs the visual path by replaying Bresenham's on each pre-validated edge to generate intermediate cells on-the-fly for display only.

**Data & Graph Structure**

* **Coordinates:** Uses grid cell coordinates as the one source of truth. Zoom/pan is just a viewport transform:  
  * `screen_x = (col * cell_size * zoom) + pan_x`  
  * `screen_y = (row * cell_size * zoom) + pan_y`  
  * `col = floor((screen_x - pan_x) / (cell_size * zoom))`  
  * `row = floor((screen_y - pan_y) / (cell_size * zoom))`  
* Nodes are created based on marker objects, paths, and teleporters/stairs.  
* Nodes contain x, y, z coordinates (z represents the floor).  
* Edge costs use Euclidean distance. Crossing each floor adds another 10 units of cost to travel.  
* **JSON Format Example:** `"nodes": { "1,1,0": { "edges": { "1,2,0": 1, "2,2,0": 1.414 } } }` `"rooms": { "301": { "name": "math classroom", "anchor_node": "3,3,0" } }`  
* **Corner Clipping Prevention Math Mentioned:** `x_axis_is_wall = self.building[node.z][node.y][node.x + dx] == 1` `y_axis_is_wall = self.building[node.z][node.y + dy][node.x] == 1` `if dx != 0 and dy != 0: return not (x_axis_is_wall or y_axis_is_wall)`

**Concurrency Management**

* No real-time collaboration. The system uses a lockfile ("LOCK the edit function if one person is current editing").  
* If a user saves, they exit editing mode and the lock releases.  
* If they just close the browser tab, the editing remains locked, and "the other admin will see the editing is locked by whom and they scold them lol."

## **5\. Non-Functional Requirements**

* **Tech Stack:** NextJS latest version, npm, React/NextJS canvas for rendering (easier than using div).  
* **Lightweight Storage/Compression:** Uses text-based compression within the JSON payload. Instead of passing massive 2D arrays, it stores only exact `(x,y)` coordinates of walls (1s), paths (2), teleporters (100-200), and rooms (300-400). Omitted coordinates are automatically assumed to be empty walkable space (0).  
* **Performance:** Uses a `Set` for O(1) wall lookup during Bresenham's validation to avoid rebuilding the full grid. Frontend A\* is fast because it only searches the pre-drawn path small node graph rather than the whole school graph.

## **6\. Known Constraints & Boundaries**

* This is strictly a technical prototype.  
* Mobile handoff / real-time smartphone tracking via session scan is out of scope for this prototype (future implementation).  
* An admin dashboard and warning message panel inside the admin dashboard are out of scope for this prototype.  
* Search function in User Mode is out of scope for this prototype.  
* No database will be used (lockfile only).  
* No WebSockets, no tree, no git, no conflict resolution for map editing.  
* Logical grid size recommendation is a fixed 1000x1000 cells (where 1 cell \= e.g., 10cm or 1 tile).

## **7\. Open Questions & Conflicts And Resolution**

* **\[CONFLICT: Data Format\]** User stated earlier: "we will store it as binary data. with data range. 0 \= space, 1 \= wall..." but later stated: "Instead of a raw 2D array of 1 million integers, you can store only the exact (x, y) coordinates of the walls (1s)... text-based compression within your JSON payload". Needs resolution on whether the final implementation is binary arrays or sparse coordinate lists in JSON.  
  * Answer: Do not use Binary Data. Use Text Based Compression with JSON payload.  
* **\[Not specified\]** The exact UI/UX for displaying a continuous path that transitions across multiple floors to a kiosk user. User noted: "honestly i don't know... just show them floor 2nd on the screen or sth. it will work. i think."  
  * The path will be drawn, the screen only show one floor at a time, so the user can click to another floor to see another half of the path.  
* **\[Not specified\]** Timeout duration or override mechanism for the lockfile if an admin closes their browser tab without saving, other than social pressure ("they scold them").  
  * Either we will delete the lock file manually or wait 2 hours for the system delete the lockfile

### **1\. Entity List**

* **MapPayload** — from "Non-Functional Requirements: Lightweight Storage/Compression" and "Data & Graph Structure: JSON Format Example"  
* **Node** — from "Data & Graph Structure"  
* **Edge** — from "Data & Graph Structure" and "Validation & Rendering Logic"  
* **Room (Marker Object)** — from "Data & Graph Structure: JSON Format Example"  
* **Teleporter (Stair/Elevator)** — from "Edit Mode (Map Editing)" and "Non-Functional Requirements"  
* **Lock** — from "Concurrency Management"

---

### **2\. Entity Definitions**

**\[MapPayload\]**

* **Source:** "Data & Graph Structure", "Non-Functional Requirements"  
* **Fields:**  
  * `meta.width`: Integer | not nullable | Defines logical grid size (e.g., 1000\)  
  * `meta.height`: Integer | not nullable | Defines logical grid size (e.g., 1000\)  
  * `walls`: Array of coordinate arrays `[x,y]` | nullable | "store only the exact (x, y) coordinates of the walls (1s)" to keep payload small.  
* **Relationships:**  
  * Contains many `Nodes` | one-to-many | "nodes" object in JSON sample  
  * Contains many `Rooms` | one-to-many | "rooms" object in JSON sample  
  * Contains many `Teleporters` | one-to-many | \[NEEDS CLARIFICATION: Document says teleporters are stored, but doesn't show exact JSON object mapping\]

**\[Node\]**

* **Source:** "Data & Graph Structure"  
* **Fields:**  
  * `coordinate_key`: String ("x,y,z") | not nullable | Acts as the identifier/key in the JSON payload (e.g., "1,1,0"). `z` represents the floor.  
* **Relationships:**  
  * Has many `Edges` | one-to-many | Nested "edges" object inside the node in JSON sample.

**\[Edge\]**

* **Source:** "Data & Graph Structure", "Validation & Rendering Logic"  
* **Fields:**  
  * `target_coordinate_key`: String ("x,y,z") | not nullable | The destination node key in the JSON object (e.g., "1,2,0").  
  * `cost`: Float | not nullable | Edge cost using Euclidean distance (e.g., `1`, `1.414`). Cross-floor crossing adds 10 units.  
  * `validated`: Boolean | not nullable | Pre-validated segment metadata indicating Bresenham's confirmed it is wall-free at draw-time.  
* **Relationships:**  
  * Connects `Node` to `Node` | many-to-many | Implicit in adjacency list structure.

**\[Room\] (Marker Object)**

* **Source:** "Data & Graph Structure: JSON Format Example"  
* **Fields:**  
  * `id`: Integer | not nullable | "range 300-400" (e.g., "301").  
  * `name`: String | not nullable | e.g., "math classroom".  
  * `anchor_node`: String | not nullable | The "x,y,z" coordinate connecting it to the graph (e.g., "3,3,0").  
  * \[NEEDS CLARIFICATION: Disconnected Status\] Does the JSON store if a room is disconnected/greyed out, or is this calculated purely on the fly by pinging the root node?

**\[Teleporter\] (Stair/Elevator)**

* **Source:** "Edit Mode (Map Editing)", "Non-Functional Requirements"  
* **Fields:**  
  * `id`: Integer | not nullable | "range 100-200". Used to connect the same teleporter across different floors.  
  * `location`: \[TYPE UNKNOWN — not specified\] | Document states they have coordinates but doesn't show the JSON schema for them like it did for rooms.  
* **Relationships:**  
  * Connected to other `Teleporters` | one-to-many | "if the teleporter with the same id in another floor is connected"

**\[Lock\]**

* **Source:** "Concurrency Management"  
* **Fields:**  
  * `locked_by`: String | not nullable | "the other admin will see the editing is locked by whom".  
  * \[NEEDS CLARIFICATION: Lock Identification\] Are we storing an admin username, IP address, or session token to determine "whom"?

---

### **3\. Storage Recommendation**

**Recommendation:** Local JSON File and File-system Lockfile. **Constraint driving this:** The Scribe document explicitly mandates: "We don't use database for this prototype so we only need a lockfile sth like that" and "we use json data (package)". The backend will natively parse standard JavaScript objects.

---

### **4\. One-Way Door Flags**

1. **File-based Storage vs Database**

   * *The Decision:* Using a single massive JSON file (compressed via coordinate omissions) and a lockfile instead of a database.  
   * *Why it's hard to undo:* Transitioning to a DB later will require a complete rewrite of the concurrency model, map saving logic, and pathfinding memory-build logic.  
   * *Information to change:* Will this prototype evolve directly into production with multiple concurrent admin users, rendering social-pressure lockfiles unusable?  
     1. Using json for this map edges… because We are planning to have it for offline mode.   
2. **Using `Z` coordinate for mathematical floor scaling**

   * *The Decision:* Storing floor simply as a sequential integer (`z`) to add "10 units of cost" for Euclidean multi-floor travel.  
   * *Why it's hard to undo:* If the school has non-sequential floors (e.g., "Basement", "1A", "Mezzanine"), a numeric Z-coordinate will break the edge cost math.  
   * *Information to change:* Are the school's floors strictly sequentially numbered without architectural exceptions?  
     1. Answer: This is just the information layer, as long as the building is stack on top of each other like any building, then it's okay. Z is just a representation layer. 

---

### **5\. Open Questions & Gaps**

1. **\[NEEDS CLARIFICATION: Path and Root Node Storage\]** Blocks map payload validation. The doc mentions "path is saved in ID number 2" and "Root node represent in id 999". Are these IDs stored as a specific object in the JSON, or just treated as arbitrary nodes in the `nodes` object?  
   1. This path is just a node object with edges to navigate.  
2. **\[NEEDS CLARIFICATION: Disconnected Status\]** Blocks the `Room` entity. When an object "cannot ping the root node" and becomes "greyed out", is this state saved in the JSON payload, or re-calculated dynamically every time the map loads?  
   1. The state should be stored inside the JSON.   
3. **\[NEEDS CLARIFICATION: Lockfile Schema\]** Blocks the `Lock` entity. What exact string/data represents "whom" (the admin holding the lock) in the lockfile?  
   1. Answer: admin name inputted. No need auth. Just type random its a prototype.  
4. **\[NEEDS CLARIFICATION: Data Format Conflict\]** Blocks final payload architecture. The doc mentions storing as "binary data. with data range. 0 \= space..." but later pivots to "text-based compression within your JSON payload... standard JavaScript objects". This model assumes JSON based on the latter, but the contradiction needs addressing.  
   1. No binary data, text-based compression with the JSON payload.

## **1\. Contract Index**

1. **Get Map Payload** — from "When the frontend or backend loads the JSON, it assumes..." and "inside the json package there will be map of the school"  
2. **Update Map** — from "the backend will handle map update. and check and verify if it is okay it will update the map and save the new version of that json file"  
3. **Get Lock Status** — from "the other admin will see the editing is locked by whom"  
4. **Acquire Edit Lock** — from "LOCK the edit function if one person is current editing"  
5. **Release Edit Lock** — from "if they save, they will exit the editing mode and the lock will release"

---

## **2\. Contract Definitions**

**\[Get Map Payload\]**

* Source: Scribe "Non-Functional Requirements" \+ Data Model `MapPayload`  
* Method & Path: `GET /api/map`  
* Auth required: \[UNKNOWN — not specified\]  
* Request schema: None  
* Response schema (success):  
  * `meta`: Object | source: Data Model (logical grid size)  
    * `width`: Integer | required  
    * `height`: Integer | required  
  * `walls`: Array of `[Integer, Integer]` | optional | source: "exact (x, y) coordinates of the walls (1s)"  
  * `nodes`: Dictionary/Object | optional | source: Graph structure containing coordinate keys  
    * `[coordinate_key]`: Object  
      * `edges`: Dictionary of `target_coordinate_key` to `cost` (Float)  
  * `rooms`: Dictionary/Object | optional | source: Room registry  
    * `[id]`: Object  
      * `name`: String | required  
      * `anchor_node`: String | required  
  * `teleporters:` Dictionary/Object | required | source: Teleporter registry  
  * `[id]`: Object  
    * `name`: String | required  
    * `type`: String | required | source: "Type of transit (e.g., elevator, stairs)"  
    * `floors`: Array of \[Integer\] | required | source: "List of accessible floor levels"  
    * `status`: String | required | source: "Current operational status"  
* Response schema (error envelope):  
  * `error_code`: String  
  * `message`: String  
  * Known error cases: None specified for read.  
* Async or sync: Sync  
* Rate limit risk: None mentioned.

**\[Update Map\]**

* Source: Scribe "Validation & Rendering Logic" \+ Data Model `MapPayload`  
* Method & Path: `PUT /api/map`  
* Auth required: \[UNKNOWN — not specified\]  
* Request schema:  
  * (Exact same as **Get Map Payload** response schema, representing the full updated map JSON).  
* Response schema (success):  
  * `success`: Boolean | source: Implied by successful save  
* Response schema (error envelope):  
  * `error_code`: String  
  * `message`: String  
  * `failed_edges`: Array of Strings (node coordinates) | optional | source: "highlight red on the user on those two node or the red edge to show that the edge is not working"  
  * Known error cases for this contract:  
    * Validation Failed: Source \- "On every floorplan save/update, re-run Bresenham's... yes, the save will fail and ask the admin to draw new path."  
* Async or sync: Sync (backend verification on save).  
* Rate limit risk: None mentioned.

**\[Get Lock Status\]**

* Source: Scribe "Concurrency Management" \+ Data Model `Lock`  
* Method & Path: `GET /api/lock`  
* Auth required: \[UNKNOWN — not specified\]  
* Request schema: None  
* Response schema (success):  
  * `is_locked`: Boolean | source: Lockfile status  
  * `locked_by`: String | optional | source: "the other admin will see the editing is locked by whom"  
* Response schema (error envelope):  
  * `error_code`: String  
  * `message`: String  
  * Known error cases: None specified.  
* Async or sync: Sync

**\[Acquire Edit Lock\]**

* Source: Scribe "Concurrency Management" \+ Data Model `Lock`  
* Method & Path: `POST /api/lock`  
* Auth required: \[UNKNOWN — not specified\]  
* Request schema:  
  * `locked_by`: String | required | source: Needed to write to the lockfile so others know "whom" locked it.  
* Response schema (success):  
  * `success`: Boolean | source: Lock acquired  
* Response schema (error envelope):  
  * `error_code`: String  
  * `message`: String  
  * Known error cases for this contract:  
    * Already Locked: Source \- System locks out other administrators if lockfile exists.  
* Async or sync: Sync

**\[Release Edit Lock\]**

* Source: Scribe "Concurrency Management"  
* Method & Path: `DELETE /api/lock`  
* Auth required: \[UNKNOWN — not specified\]  
* Request schema: None  
* Response schema (success):  
  * `success`: Boolean | source: Lock released  
* Response schema (error envelope):  
  * `error_code`: String  
  * `message`: String  
* Async or sync: Sync

---

## **3\. Contracts Intentionally Omitted**

* **Calculate Path / Find Route (`GET /route`)**: Intentionally omitted. The Scribe document explicitly states "the map will run astar (frontend) to render the path" and "map traversal is in frontend". Pathfinding requires no backend interaction.  
* **CRUD for Nodes/Edges/Rooms/Teleporters (`POST /rooms`, `DELETE /nodes`, etc.)**: Intentionally omitted. The backend does not manage these entities individually. The spec states the backend will "update the map and save the new version of that json file", meaning all structural changes are handled via a single monolithic `PUT /api/map` payload update.  
* **Get Disconnected Nodes**: Intentionally omitted. The Scribe document indicates "node can see the root node by 'ping' the root node" natively in the graph, requiring no separate API call to determine greyed-out status.

---

## **4\. Open Questions & Gaps**

1. **\[NOT IN SPEC: Auth\]** Blocks all contracts. The Scribe document does not specify how Users (parents/students) vs Admins are authenticated. Since Admins can overwrite the map and lock the file, how does the API verify the caller has Admin privileges?  
   1. This is just a prototype No need auth. Anyone can just use it.  
2. **\[NEEDS CLARIFICATION: Teleporter Payload Schema\]** Blocks the `Get Map Payload` and `Update Map` contracts. The Data Model flagged that the JSON schema for Teleporters is unknown. We cannot define the API contract for saving the map without knowing how Teleporters are formatted in the JSON body.  
   1. Example

"teleporters": {  
    "100": {  
      "name": "Main Elevator",  
      "type": "elevator",  
      "floors": \[0, 1, 2\],  
      "status": "active"  
    },  
    "101": {  
      "name": "East Stairs",  
      "type": "stairs",  
      "floors": \[0, 1\],  
      "status": "maintenance"  
    }  
  }

3. **\[NEEDS CLARIFICATION: Implicit Lock Release\]** Blocks the `Update Map` and `Release Edit Lock` contracts. The Scribe states "if they save, they will exit the editing mode and the lock will release". Should `PUT /api/map` automatically release the lockfile on the backend, or is the frontend expected to call `DELETE /api/lock` explicitly after a successful save?  
   1. For now, our system will delete the lockfile if it has been created for 2 hours.  
4. **\[NEEDS CLARIFICATION: Lock Identifier\]** Blocks `Acquire Edit Lock`. The contract requires `locked_by` to identify the admin holding the lock. Since there is no database or apparent session management described, what is the frontend actually sending in this field? (e.g., An inputted name? A local storage UUID? An IP address?)  
   1. Admin name inputted name.

I see the tech stack is already defined in your Scribe document as **NextJS latest version and npm**, using **React and canvas**. I will structure this project strictly around Next.js App Router conventions and the specific file-system boundaries dictated by your requirements.

Here is the physical project structure mapped directly from your decisions.

---

### **1\. Structure Map**

/data  
  school-map.json  
  edit.lock  
/src  
  /app  
    /api  
      /map  
        route.ts  
      /lock  
        route.ts  
    /kiosk  
      page.tsx  
    /edit  
      page.tsx  
  /contracts  
    data-models.ts  
    api-schemas.ts  
  /storage  
    file-manager.ts  
  /pathfinding  
    astar.ts  
  /validation  
    bresenham.ts  
  /rendering  
    coordinate-transform.ts  
    MapCanvas.tsx

---

### **2\. File-by-File Rationale**

**/data/school-map.json**

* **Contains:** The literal MapPayload JSON data (nodes, edges, walls, rooms).  
* **Justified by:** Data Model §3 ("Local JSON File") and Scribe Non-Functional Requirements ("text-based compression within your JSON payload").  
* **Changes when:** An admin successfully saves a map.  
* **Coupled to:** `/src/storage/file-manager.ts`

**/data/edit.lock**

* **Contains:** The lock state and owner identifier.  
* **Justified by:** Data Model §2 (Lock Entity) and Scribe Concurrency Management ("we only need a lockfile sth like that").  
* **Changes when:** An admin starts editing or saves their changes.  
* **Coupled to:** `/src/storage/file-manager.ts`

**/src/app/api/map/route.ts**

* **Contains:** Next.js HTTP handlers for `GET` and `PUT` map payload operations.  
* **Justified by:** API Contracts 1 & 2 (`Get Map Payload`, `Update Map`).  
* **Changes when:** Network transport rules or save-time validation orchestration changes.  
* **Coupled to:** `/src/validation/bresenham.ts`, `/src/storage/file-manager.ts`, `/src/contracts/api-schemas.ts`.  
* **\[CONTENTS UNCLEAR — depends on unresolved gap in API Contracts §4.1 regarding Auth\]**

**/src/app/api/lock/route.ts**

* **Contains:** Next.js HTTP handlers for `GET`, `POST`, and `DELETE` lock operations.  
* **Justified by:** API Contracts 3, 4, 5 (`Get Lock Status`, `Acquire Edit Lock`, `Release Edit Lock`).  
* **Changes when:** The concurrency mechanism changes.  
* **Coupled to:** `/src/storage/file-manager.ts`.  
* **\[CONTENTS UNCLEAR — depends on unresolved gap in API Contracts §4.4 regarding Lock Identifier\]**

**/src/app/kiosk/page.tsx**

* **Contains:** User Mode UI, start/destination picking, and floor-switching logic.  
* **Justified by:** Scribe Functional Requirements ("User Mode (Navigation & Kiosk)").  
* **Changes when:** Parent/student kiosk interaction flows change.  
* **Coupled to:** `/src/rendering/MapCanvas.tsx`, `/src/pathfinding/astar.ts`.  
* **\[CONTENTS UNCLEAR — depends on unresolved gap in Scribe §7 regarding multi-floor continuous path UI\]**

**/src/app/edit/page.tsx**

* **Contains:** Edit Mode UI, drawing tools, map state flipper (1 to 0), and teleporter linking.  
* **Justified by:** Scribe Functional Requirements ("Edit Mode (Map Editing)").  
* **Changes when:** Administrator drawing logic or map manipulation flows change.  
* **Coupled to:** `/src/rendering/MapCanvas.tsx`, `/src/validation/bresenham.ts`.

**/src/contracts/data-models.ts**

* **Contains:** TypeScript types/interfaces for `MapPayload`, `Node`, `Edge`, `Room`, `Teleporter`, and `Lock`.  
* **Justified by:** Data Model §2.  
* **Changes when:** The shape of the grid or map entities changes.  
* **Coupled to:** Everything passing map data.  
* **\[CONTENTS UNCLEAR — depends on unresolved gap in Data Model §5.1 regarding Teleporter Schema\]**

**/src/contracts/api-schemas.ts**

* **Contains:** Request and response schemas (including error envelopes).  
* **Justified by:** API Contracts §2.  
* **Changes when:** Payload success/error reporting shapes change.  
* **Coupled to:** API routes and frontend fetch logic.

**/src/storage/file-manager.ts**

* **Contains:** Node.js file system (`fs`) logic to natively read and write standard JS objects to the `/data` directory.  
* **Justified by:** Scribe Non-Functional Requirements ("Next.js backend to parse the data natively") and Data Model storage constraints.  
* **Changes when:** The persistence layer migrates from local files to a database.  
* **Coupled to:** API routes.

**/src/pathfinding/astar.ts**

* **Contains:** The frontend node graph traversal algorithm.  
* **Justified by:** Scribe Functional Requirements ("map will run astar (frontend)").  
* **Changes when:** Heuristics or multi-floor pathfinding logic is updated.  
* **Coupled to:** `/src/app/kiosk/page.tsx`.

**/src/validation/bresenham.ts**

* **Contains:** The line algorithm for corner-clipping prevention and wall collision.  
* **Justified by:** Scribe Functional Requirements ("Validation & Rendering Logic").  
* **Changes when:** The mathematical rules for what constitutes a "broken path" change.  
* **Coupled to:** `/src/app/edit/page.tsx` (for immediate draw-time check) and `/src/app/api/map/route.ts` (for backend save-time re-verification).

**/src/rendering/coordinate-transform.ts**

* **Contains:** The mathematical logic mapping physical grid cells to screen pixels (`screen_x = (col * cell_size * zoom) + pan_x`).  
* **Justified by:** Scribe Data & Graph Structure ("One source of truth: grid coordinates").  
* **Changes when:** Scaling, zooming, or panning math changes.  
* **Coupled to:** `/src/rendering/MapCanvas.tsx`.

**/src/rendering/MapCanvas.tsx**

* **Contains:** The shared React canvas component that consumes coordinate math and visualizes the floor map.  
* **Justified by:** Scribe Non-Functional Requirements ("we will use nextjs / react and the canvas").  
* **Changes when:** The visual representation of the map itself needs updating.  
* **Coupled to:** Kiosk and Edit pages.

---

### **3\. Co-location Decisions**

* **GET and PUT map in the same route file:** Co-located in `/src/app/api/map/route.ts` because Next.js App Router enforces placing HTTP methods for the same resource path in a single file.  
* **Canvas Rendering shared across roles:** `MapCanvas.tsx` is placed centrally in `/src/rendering` rather than inside `/edit` or `/kiosk`. Justification: The Scribe mandates both roles operate on the exact same "viewport transform" visual system; they just have different interaction layers on top of it.

### **4\. Separation Decisions**

* **`astar.ts` separated from `bresenham.ts`:** Justified because A\* is strictly executed on the frontend (User Mode), while Bresenham's is required by *both* the frontend (draw-time) and backend (save-time API validation). Separating them prevents the Next.js backend from accidentally bundling unneeded UI traversal logic.  
* **`file-manager.ts` separated from API routes:** Justified because both Map operations and Lockfile operations require direct file system access, and keeping `fs` out of the HTTP handlers isolates the I/O logic in case you ever switch to a database later (Data Model §4.1).

### **5\. Files Intentionally Excluded**

* **No generic `/components` folder:** Excluded because React components here are domain-specific (`MapCanvas` lives in `/rendering`). No general UI components were mandated by the spec.  
* **No `/lib`, `/utils`, or `/helpers`:** Excluded because every standalone function in the requirements has a strict domain name (`astar`, `bresenham`, `coordinate-transform`, `file-manager`).  
* **No Database Config (`db.ts`, `/prisma`):** Excluded because the Scribe explicitly states "We don't use database for this prototype".  
* **No User Search Component:** Excluded because the Scribe strictly specifies "search function is not implement now".  
* **No Admin Dashboard/Warning Panel:** Excluded because the Scribe states "admin dashboard is not include in this prototype".

