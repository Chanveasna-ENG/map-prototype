export interface GridPosition {
  col: number;
  row: number;
}

export interface ScreenPosition {
  x: number;
  y: number;
}

export interface ViewportTransform {
  cellSize: number;
  zoom: number;
  panX: number;
  panY: number;
}

export function gridToScreen(
  gridPos: GridPosition,
  transform: ViewportTransform
): ScreenPosition {
  return {
    x: gridPos.col * transform.cellSize * transform.zoom + transform.panX,
    y: gridPos.row * transform.cellSize * transform.zoom + transform.panY,
  };
}

export function screenToGrid(
  screenPos: ScreenPosition,
  transform: ViewportTransform
): GridPosition {
  return {
    col: Math.floor((screenPos.x - transform.panX) / (transform.cellSize * transform.zoom)),
    row: Math.floor((screenPos.y - transform.panY) / (transform.cellSize * transform.zoom)),
  };
}
