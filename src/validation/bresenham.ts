export interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface StepState {
  x: number;
  y: number;
  err: number;
  stepX: number;
  stepY: number;
}

interface StepConfig {
  dx: number;
  dy: number;
  sx: number;
  sy: number;
}

function takeStep(state: StepState, config: StepConfig): StepState {
  const e2 = 2 * state.err;
  const nextState: StepState = {
    x: state.x,
    y: state.y,
    err: state.err,
    stepX: 0,
    stepY: 0,
  };

  if (e2 > -config.dy) {
    nextState.err -= config.dy;
    nextState.x += config.sx;
    nextState.stepX = config.sx;
  }
  
  if (e2 < config.dx) {
    nextState.err += config.dx;
    nextState.y += config.sy;
    nextState.stepY = config.sy;
  }
  
  return nextState;
}

function checkCornerClip(
  state: StepState,
  z: number,
  isWall: (x: number, y: number, z: number) => boolean
): boolean {
  if (state.stepX === 0) {
    return false;
  }
  if (state.stepY === 0) {
    return false;
  }
  
  const xAxisWall = isWall(state.x, state.y - state.stepY, z);
  if (xAxisWall) {
    return true;
  }
  
  const yAxisWall = isWall(state.x - state.stepX, state.y, z);
  if (yAxisWall) {
    return true;
  }
  
  return false;
}

interface TraverseConfig {
  end: Point3D;
  z: number;
  config: StepConfig;
}

function traversePath(
  startState: StepState,
  params: TraverseConfig,
  isWall: (x: number, y: number, z: number) => boolean
): boolean {
  let state = startState;
  const maxSteps = params.config.dx + params.config.dy;
  
  for (let i = 0; i < maxSteps; i++) {
    if (state.x === params.end.x) {
      if (state.y === params.end.y) {
        return true;
      }
    }
    
    state = takeStep(state, params.config);

    if (checkCornerClip(state, params.z, isWall)) {
      return false;
    }

    if (isWall(state.x, state.y, params.z)) {
      return false;
    }
  }

  return true;
}

export function isPathClear(
  start: Point3D,
  end: Point3D,
  isWall: (x: number, y: number, z: number) => boolean
): boolean {
  if (start.z !== end.z) {
    return false;
  }

  const z = start.z;
  const state: StepState = { x: start.x, y: start.y, err: 0, stepX: 0, stepY: 0 };

  if (isWall(state.x, state.y, z)) {
    return false;
  }

  const config: StepConfig = {
    dx: Math.abs(end.x - state.x),
    dy: Math.abs(end.y - state.y),
    sx: Math.sign(end.x - state.x),
    sy: Math.sign(end.y - state.y),
  };
  state.err = config.dx - config.dy;

  const params: TraverseConfig = { end, z, config };
  return traversePath(state, params, isWall);
}
