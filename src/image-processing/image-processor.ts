export interface ImageProcessConfig {
  file: File;
  gridWidth: number;
  gridHeight: number;
  floor: number;
  threshold?: number;
}

function imageToCanvas(
  img: HTMLImageElement,
  gridWidth: number,
  gridHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = gridWidth;
  canvas.height = gridHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D canvas context");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, gridWidth, gridHeight);

  let dWidth = gridWidth;
  let dHeight = gridHeight;
  let dx = 0;
  let dy = 0;

  const imgRatio = img.width / img.height;
  const gridRatio = gridWidth / gridHeight;

  if (imgRatio > gridRatio) {
    dHeight = gridWidth / imgRatio;
    dy = Math.floor((gridHeight - dHeight) / 2);
  } else {
    dWidth = gridHeight * imgRatio;
    dx = Math.floor((gridWidth - dWidth) / 2);
  }

  ctx.drawImage(img, dx, dy, dWidth, dHeight);
  return canvas;
}

function extractWallsFromCanvas(
  canvas: HTMLCanvasElement,
  floor: number,
  threshold: number
): [number, number, number][] {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return [];
  }

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const walls: [number, number, number][] = [];

  for (let row = 0; row < canvas.height; row++) {
    for (let col = 0; col < canvas.width; col++) {
      const pixelIdx = (row * canvas.width + col) * 4;
      const r = data[pixelIdx];
      const g = data[pixelIdx + 1];
      const b = data[pixelIdx + 2];
      const a = data[pixelIdx + 3];

      if (a < 50) {
        continue;
      }

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      if (brightness < threshold) {
        walls.push([col, row, floor]);
      }
    }
  }

  return walls;
}

export function processMapImage(config: ImageProcessConfig): Promise<[number, number, number][]> {
  const { file, gridWidth, gridHeight, floor, threshold = 128 } = config;

  return new Promise<[number, number, number][]>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>): void => {
      if (!event.target?.result) {
        reject(new Error("Failed to read file"));
        return;
      }

      const img = new Image();
      img.onload = (): void => {
        try {
          const canvas = imageToCanvas(img, gridWidth, gridHeight);
          const walls = extractWallsFromCanvas(canvas, floor, threshold);
          resolve(walls);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = (): void => {
        reject(new Error("Failed to load image"));
      };

      img.src = event.target.result as string;
    };

    reader.onerror = (): void => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}
