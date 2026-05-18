I want to build a web app project prototype. 

It is a school map. Using NextJS latest version and npm. 

\# Let me tell you the User flow. 

There are two mode, User Mode and Edit Mode. No auth needed

in the web app, we think of it just like google map. 

here let me explain how.

user mode they can pick their starting point on the map and then they can pick their destination. 

then the map will run astar (frontend) to render the path to reach the destination.

However, they cannot just start from anywhere they can only start at a specific location (object on the map). 

and go to a specific location (object on the map)

\# now let me explain you the logical and dataflow. 

the Edit mode. 

How can we render the data? we use json data (package)

we will have node and graph. and will be using euclidean distance and heuristic for that astar. 

inside the json package there will be map of the school and each floor. 

0 \= space, 1 \= wall, 2 \= walkable, 100-200 \= stair/elevator, 300-400 \= room id

We will think like google map. 

we don't have to build the whole graph for the school and use Astar to search it will be too expensive. 

instead we will draw the path ourselves and the astar will only search through that path to find the rooms. 

for the editor mode, we will allow the user to change the map flip between 1 and 0, like a button that change state. 

then there is a marker for room and reachable destination. we will mark it on the map just put a picker sth like that. it will store that information (ID) on the map itself. 

then there is a registery for that ID. inside the same json file. that contain, id, room name ......

then there is also a delete button that will delete the marker. 

then there is a path editor. we will able to draw a straight blue line 1pixel line like a microsoft paint line drawer. we will draw it from there. each special object (room, destination that created with the marker must connected to the path.) the path will be saved it in id number 2

we will also have a root node in the map somewhere, this root node will be the checker when saving the edited map. If the marker object is created then is not connect to the path, we will know they by running astar to check if that new object can find the root node. root node represent the path itself. 

okay then there is a way to create node and graph in the system. 

it will read the map then creating nodes base on market object and path and teleporter/stair. 

it will create the root node by default. root node represent in id 999\.  
the from that 999 it will look for number 2 round it. and calculate the edge cost using euclidean distance.

the number 2 will connect to other number two as edge and other market object and stair/teleporter. how does the teleporter work? teleporter connect each other using ID meaning on floor 1, teleporter ID 100 is connected to teleporter ID 100 on floor 2 and ID 100 on floor 3\. 

thus it will have a node there. when crossing each floor will add another 10 unit of cost of traveling in the euclidean distance. after creating the node neightbor node edges distance, i think the graph is done. 

I do have some sample. we will have x,y,z , x represent x coordinate on map/screen, y represent y coordinate on map/screen and z represent the floor of the school. the graph will read this file the build it inside the memory to traverse it. map traversal is in frontend.   
"nodes": {  
        "1,1,0": {  
            "edges": {  
                "1,2,0": 1,  
                "2,1,0": 1,  
                "2,2,0": 1.414  
            }  
        },  
        "2,1,0": {  
            "edges": {  
                "2,2,0": 1,  
                "1,1,0": 1,  
                "3,1,0": 1,  
                "1,2,0": 1.414,  
                "3,2,0": 1.414  
            }  
        },  
        "28,20,1": {  
            "edges": {  
                "28,19,2": 1,  
                "27,20,2": 1,  
                "27,19,2": 1.414  
            }  
        }  
}

the backend will handle map update. and check and verify if it is okay it will update the map and save the new version of that json file. that json file contain map in 2d array inside a dictionary-like object like this, nodes and rooms (rooms registry for rendering)  
    "rooms": {  
        "301": {  
            "name": "math classroom",  
            "anchor\_node": "3,3,0"  
        }  
    }

QNA

Q: You have outlined the data structures and pathfinding logic in detail, but you skipped the foundation. What specific problem does this school map actually solve for the people using it?  
A: the real user in user mode are parents. and the real user in edit mode are school admin. parents and new students often struggle to locate specific office of our school.  
Q: If a parent or new student is already lost in the building, how will they accurately identify and select their current starting point in the app?  
A: we will use kiosk. at some location at our school. the kiosk will be register as on of the marker object inside the map and then it must connect to the path.  
Q: If the parent gets the route from a fixed kiosk, how do they follow that route once they walk away from the screen?  
A: well this is just to show the map of the school and path but, future implementation will allow them to use their smart phone to scan the kiosk and get the session for real time tracking. this prototype will not implement that yet.   
Q: If the mobile handoff is out of scope for the prototype, are you assuming the parent will memorize the route, or are you designing the kiosk UI to be easily photographed?  
A: yes photograph is possible too. but again right now we only want to build the prototype of how the map will work.  
Q: If the immediate scope is strictly a technical prototype of the map and pathfinding, what specific test case or condition will determine that this prototype is complete and successful?  
A: after building the prototype and test the flow of user and admin editing and updating delete generate new map as a web app.   
Q: Testing the flow confirms the mechanics work. Are you assuming the school administrators using the Edit Mode will have technical backgrounds, or does the UI need to completely abstract away the underlying node, edge, and JSON concepts?  
A: the admin doesnt need to have technical background, what I visualize the editing process is easily as create a new object name it and then pick its location and use the line drawing tools to draw connect the new object to the main path. that is all. make is as simple as drawing in microsoft paint.   
Q: You mentioned earlier that the system uses A\* to verify the new object connects to the root node. If a non-technical admin draws a line that fails this check—for instance, by drawing through a wall or missing the main path—how exactly does the UI communicate that error to them so they know how to fix it?  
A: after checking with backend it will alert that the path is not allow please draw on empty space. 

better way is to not allowing to draw on wall like when trying to draw the blue line on the wall the blue line will be missing. part of it when the user seee that they will know they have drawn on the wall. which is not allow.   
Q: If the line disappears when dragged over a wall, leaving a gap, the new object remains disconnected. Does the drawing action cancel entirely when they hit a wall, or does the UI allow them to leave a broken path on the screen?  
A: do not allow broken path on the screen. we will check the slop of the line and check if the line is hitting wall or not. when the user commiting to draw that line not when the user just drag it. when the mouse left click is up the line draw function will be call and then will check if hit a wall, the line will not appear and the error message appear. i think this process can be done on frontend too, but backend will also check it when user trying to save the map.   
Q:Since your map data is a 2D array of discrete cells, calculating a continuous line's slope isn't enough to detect collisions. What specific method or algorithm will you use to determine exactly which grid cells the drawn line passes through to check for those 1s?  
A: i think let just calculate if any part of the line is overlap with the wall and also check the by prevent from corner clipping 

    def \_is\_walkable(self, node, dx, dy):  
        \# Prevent corner clipping  
        x\_axis\_is\_wall \= self.building\[node.z\]\[node.y\]\[node.x \+ dx\] \== 1  
        y\_axis\_is\_wall \= self.building\[node.z\]\[node.y \+ dy\]\[node.x\] \== 1  
        if dx \!= 0 and dy \!= 0:   
            return not (x\_axis\_is\_wall or y\_axis\_is\_wall)  
        return True 

bacially the line drawing tool allow you to draw to anywhere, but after the user left click up it will try to create the path but looking at the line if the line is crossing any cell. sth like that. then there should be an algorithm to check if the line cross 3 pixel it will take only 2 by doing the shortest path similar to corner clipping if there is no wall. to obstruct the euclidean walking.  
Q: Your \_is\_walkable function checks adjacent cells for corner clipping, but it requires knowing exactly which cells the line attempts to traverse first. How are you mathematically converting the start and end coordinates of the drawn UI line into a discrete sequence of grid cells to run through this checker?  
A: the classic Bresenham's line algorithm  
Q: If a straight hallway path spans 100 grid cells, making every '2' cell a node forces A\* to process 100 separate 1-unit steps instead of a single edge. What is the technical necessity of instantiating a node for every single cell rather than only at intersections and endpoints?  
A: i see great question because I don't know how could I render without hitting the wall. 

but after some research, i think this would do. 

think of each edge between two nodes as a pre-validated segment. When the admin draws the path, you run Bresenham's on each segment at draw-time and store the result — not every cell, just the segment metadata.

from n1 to n2 validate \= true. 

basically we use our is walkable and bresenham line algorithm to check it before hand and store only the intersection and corner. 

The validated: true flag means Bresenham's already confirmed this segment is wall-free at draw-time. No need to re-check at navigation time.  
Rendering the Path  
When a user navigates from A to B, A\* runs on your small node graph (fast). Then for rendering, you reconstruct the visual path by replaying Bresenham's on each edge in the result — generating the intermediate cells on-the-fly for display only, never storing them. This gives you smooth visual rendering without wall collisions because the segments were pre-validated.  
Guaranteeing No Wall Hits  
The guarantee comes from draw-time, not navigation-time. When the admin draws a segment, you immediately run Bresenham's and check every cell. If any cell is a wall, you reject the segment. Once stored as validated: true, you trust it — the map doesn't change.  
Summary Flow

Admin draws → Bresenham's validates each segment → store only nodes \+ edges  
User navigates → A\* on node graph → replay Bresenham's per edge for rendering only  
No wall hits because invalid segments were rejected at draw-time  
Q: If an administrator later updates the floorplan to add a new physical wall across an existing path, how does the system invalidate or re-verify those previously stored edges?  
A: On every floorplan save/update, re-run Bresenham's on all stored edges against the new map.

because our node and edges is very very small.  
Q: If an edge fails this re-validation because a newly placed wall breaks it, does the system automatically delete the edge, or does it block the save and force the admin to fix the path?  
A: yes, the save will fail and ask the admin to draw new path. or fix the old one.  
Q: If the save fails because a new wall intersects an existing path, how does the UI show the admin exactly which segment out of the entire school map needs to be fixed?  
A: when running Bresenham on all store edges against the new map. we will know exactly which edge is not working and then we will highlight red on the user on those two node or the red edge to show that the edge is not working, then there should be an option to delete the currrent fail path. and allow them to draw another one. if the user doesn't delete the current fail path they won't be able to save.   
Q: If deleting that red edge leaves a room or entire section completely disconnected from the root node, how does the system surface that new isolation to the admin before they attempt to save?  
A: I already said it that the node can see the root node by "ping" the root node. so when we save them after the red edge is deleted the color of the disconnected will be grey out. 

also when editing it is helpful to show which node is connected to which node using a thin line connect to each other.   
Q: If the admin leaves rooms greyed out and clicks 'Save', does the system block the save entirely, or does it allow the save but automatically hide those disconnected rooms from the parent's search menu?  
A: it can be saved, and it is hide from the user mode, but if the admin come back to the edit mode he will see the greyed out. I think saving when grey out is fine, but we should have a warning message inside the admin panel that some path are not connected. but the message panel here is also out of scope for now since admin dashboard is not include in this prototype. 

We can just ask the admin to confirm one more time before saving. like "Are you sure you want to save this map? there are some paths are not connected. Yes/No"  
Q: If a parent comes to the kiosk specifically looking for a room that the admin left disconnected and hidden, what exactly happens when they search for it?  
A: well even the search function is not implement now. in the user mode. they can only click on existing marker object for now.   
Q: You mentioned earlier that parents struggle to locate specific offices. If there is no search function and they must manually hunt through a multi-floor map to find the right marker to click, how does this solve their original problem of not knowing where the office is?  
A: look this prototype only focus on map traversal, rendering, data flow, map editing. Technical Stuff. the search and the UX for user mode will be in another step. this UX now focus on the admin user.   
Q: If the node coordinates in your JSON are tied directly to screen pixels, how will the system prevent the pathfinding graph from breaking when an admin edits the map on a different screen size or zoom level?  
A: so from my perspective the editing will work like microsoft paint or a image editor. you can zoom edit .... in the map as if it is image.   
Q: If the admin can freely zoom and pan the map like an image, how will the system translate a variable screen pixel coordinate back to the exact row and column index of your fixed 2D JSON array?  
A: it's actually well-solved in every image editor. Here's the core idea:  
One source of truth: grid coordinates  
Screen pixels are just a view of the grid. The grid never changes size — only the viewport does.

grid cell (col, row)  ←→  screen pixel (x, y)screen\_x \= (col \* cell\_size \* zoom) \+ pan\_xscreen\_y \= (row \* cell\_size \* zoom) \+ pan\_y// Reverse (mouse click → grid cell)col \= floor((screen\_x \- pan\_x) / (cell\_size \* zoom))row \= floor((screen\_y \- pan\_y) / (cell\_size \* zoom))  
What you store vs what you display

Store: grid\[row\]\[col\] \= 0 or 1 — always in grid coordinates, zoom-independent  
Display: render each cell as a rectangle scaled by cell\_size \* zoom on a canvas  
Edit: on mouse click, convert screen → grid → flip the value → re-render  
Standard size recommendation  
Pick a fixed logical grid size like 1000×1000 cells where each cell represents a real-world unit (e.g. 10cm or 1 tile). Then let admins zoom freely. This way your JSON is always the same shape regardless of screen.  
This is exactly how every image editor works — Photoshop stores pixels at 1:1, and zoom/pan is just a viewport transform. Your grid cells are your pixels.

we will use nextjs / react and the canvas is the perfect solution to this it is easier than using div.   
Q: Since the canvas can only display one 2D floor at a time, how will the administrator physically use the line-drawing tool to connect a path on Floor 1 to a stair or elevator that leads to Floor 2?  
A: that is why we have teleporter, we just need to draw path from the main path to the teleporter then there is like a stack of floor render in the editing mode, the admin just move to another floor and connect the teleporter with the same id as the old one to another marker object . they dont need to physically connect it together the teleporter will be connected to the main path. 

teleporter is also another marker object and it will light up (not grey out) if the teleporter with the same id in another floor is connected to the main path.   
Q: If a single elevator or stairwell spans more than two floors—such as floors 1, 2, and 3 all sharing ID 100—and only floor 2's connection is broken, how will the admin know which specific floor is causing the validation failure?  
A: i don't understand what you mean by that. because one stair/elevator that span multiple floor if the teleporter id 100 in floor 1 connected to the main path and the floor 3 will light up and the floor 2 will light up. meaning that the floor two cannot messed up the connection unless it has different teleporter id. each physically stair that connect to each other must have the same teleporter id,   
Q: If Teleporter 100 automatically lights up as "connected" on Floor 2 simply because Floor 1 is hooked to the root node, how will the system alert the admin if they completely forgot to draw the physical path connecting that elevator to the rest of Floor 2's layout?  
A: like i said the object that cannot ping the root node will be grey out and warnning will be given when saving.  
Q: If two administrators open the Edit Mode at the same time, how will the NextJS backend prevent one person's changes from completely overwriting and destroying the other's modifications?  
A: the update is not in real time, and we will take the map version that is save last.  
Q: If Admin A spends time drawing a complex path, and Admin B saves a minor room tweak one second later, Admin A's work is permanently overwritten. Does this prototype deliberately accept that risk of silent data loss, or do you need a basic version check?  
A: LOCK the edit function if one person is current editing. I also don't want websocket for real time collab either lol. i don't want tree, I don't want git i don't want conflict resolution. We don't use database for this prototype so we only need a lockfile sth like that.  
Q: Without WebSockets or a persistent connection, reliably detecting when a user closes a browser tab or walks away is notoriously difficult. If an administrator makes a quick change and simply closes their tab, are you acceptable with every other administrator being completely locked out of editing for up to two hours until the lock officially becomes stale?  
A: if they save, they will exit the editing mode and the lock will release and if they just close the fucking browser the other admin will see the editing is locked by whom and they scold them lol. sorry the system is design to lock this way. FOR NOW.  
Q: Fair enough—social pressure is an effective low-tech lock manager.  
If you use a 1000×1000 grid as your source of truth, each floor contains 1 million cells. For a multi-floor school, loading and saving a raw 2D array of several million integers inside a single JSON payload will quickly bottleneck both the network traffic and browser memory.

How do you plan to structure or compress the grid data inside the JSON so you aren't passing massive, mostly empty 2D arrays back and forth?

A: If you want to keep the backend lightweight and avoid adding image-decoding dependencies, you can achieve a similar file-size reduction using text-based compression within your JSON payload.

Instead of a raw 2D array of 1 million integers, you can store only the exact `(x, y)` coordinates of the walls (`1`s), path(2), stairs/elevator (teleporter), and rooms. When the frontend or backend loads the JSON, it assumes any coordinate omitted from the file is automatically an empty walkable space (`0`). This keeps the payload incredibly small while allowing both the frontend canvas and the Next.js backend to parse the data natively using standard JavaScript objects.

{ "meta": { "width": 1000, "height": 1000 }, "walls": \[ \[10, 5\], \[10, 6\], \[10, 7\] \], …

**On the backend — reconstruct only when needed and On the frontend — same trick for canvas rendering**

For Bresenham's validation you don't even need to rebuild the full grid. Just use a Set for O(1) wall lookup

Q: When a user runs a pathfinding query that spans multiple levels, how will the routing algorithm transition its graph search from the coordinate dataset of Floor 1 to Floor 2 when it encounters a teleporter node?  
A: teleporter node is like any other node. the UI i have no idea yet, but the implementation is that the it just go because the teleporter node will connect to other floor. if you think in 3d it will be difficult but think of each of the floor just 1 floor and teleporter is a bridge to other floor. just a simple node. with its edges just that the cost is more expensive than moving in the same floor.   
Q: Since the 2D canvas can only render one floor layout at a time, how will the UI display a continuous path that transitions across multiple floors to a user navigating the map?  
A: honestly i don't know. i think we just have a cue that the floor is locate in another floor and then if the user click on the floor 2nd floor it will just show the path again from the connecting teleporter. require user to click on another floor or click on the teleporter marker object to show that floor to the user. with its path.   
Q: If the elevator node connects to five different floors, how will the UI explicitly signal to a user standing at the kiosk exactly which floor they need to switch to next to continue following their path?  
A: most of the time the elevator connect to all floor so if they are on a teleporter they sure will reach the destination floor. just show them floor 2nd on the screen or sth. it will work. i think.   
Q: If the pathfinding algorithm determines the route requires exiting the elevator on Floor 3, how will the UI dynamically extract that specific floor number from the path data to show the user the correct instruction?  
A: the teleporter marker object will linked to another floor then when we click on it, it will show that exact floor and the teleporter object will have that z location.  
Q: If the UI requires a user to click the teleporter node to switch the view, how will they know that a multi-floor path has even been generated if the kiosk screen initially only displays Floor 1?  
A: let say we have a watermark on the screen say floor 2 on the map or just somewhere.
