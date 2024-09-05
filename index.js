// Constants
const PLANE_SIZE = 60;
const PLANE_COLOR_1 = "#000";
const PLANE_COLOR_2 = "#000";
const RESAMPLING_THRESHOLD = 2;
const SMOOTHING_STEPS = 15;

// Canvas setup
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

function setupCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", setupCanvas);
setupCanvas();

// Plane class
class Plane {
  constructor(x, y, size = PLANE_SIZE, color1 = PLANE_COLOR_1, color2 = PLANE_COLOR_2) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.color1 = color1;
    this.color2 = color2;
    this.rotation = 0;
    this.path = null;
    this.pathIndex = 0;
  }

  draw(ctx) {
    this.update();
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    this.drawWing(ctx, -1, this.color1);
    this.drawWing(ctx, 1, this.color2);

    ctx.restore();
  }

  drawWing(ctx, direction, color) {
    const top = -this.size * 0.5;
    const bottom = this.size * 0.3;
    const side = this.size * 0.5 * direction;

    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(0, bottom);
    ctx.lineTo(side, this.size * 0.5);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();
  }

  assignPath(path) {
    this.path = path;
    this.pathIndex = 0;
  }

  update() {
    if (this.path && this.pathIndex < this.path.length - 1) {
      const currentPoint = this.path[this.pathIndex];
      const nextPoint = this.path[this.pathIndex + 1];
      this.x = currentPoint.x;
      this.y = currentPoint.y;
      this.rotation =
        Math.atan2(currentPoint.y - nextPoint.y, currentPoint.x - nextPoint.x) - Math.PI / 2;
      this.pathIndex++;
    }
  }
}

// Drawing class
class Draw {
  static isDrawing = false;
  static currentPath = [];
  static paths = [];
  static planes = [];

  static initialize() {
    canvas.addEventListener("pointerdown", Draw.startDrawing);
    canvas.addEventListener("pointermove", Draw.continueDrawing);
    canvas.addEventListener("pointerup", Draw.endDrawing);
  }

  static startDrawing(ev) {
    Draw.isDrawing = true;
    Draw.currentPath = [{ x: ev.x, y: ev.y }];
  }

  static continueDrawing(ev) {
    if (Draw.isDrawing) {
      Draw.currentPath.push({ x: ev.x, y: ev.y });
    }
  }

  static endDrawing() {
    if (Draw.isDrawing && Draw.currentPath.length > 1) {
      const resampledPath = PathUtils.resamplePath(Draw.currentPath);
      Draw.paths.push(resampledPath);
      const plane = new Plane(Draw.currentPath[0].x, Draw.currentPath[0].y);
      plane.assignPath(resampledPath);
      Draw.planes.push(plane);
    }
    Draw.isDrawing = false;
    Draw.currentPath = [];
  }

  static drawPaths(ctx) {
    PathUtils.drawPath(ctx, Draw.currentPath, "black");
    Draw.paths.forEach((path) => PathUtils.drawPath(ctx, path, "lightgray"));
  }
}

// Path utilities
class PathUtils {
  static drawPath(ctx, path, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    path.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }

  static resamplePath(path) {
    const superSampledPath = PathUtils.superSamplePath(path);
    const newPath = PathUtils.simplifyPath(superSampledPath);
    return PathUtils.smoothPath(newPath);
  }

  static superSamplePath(path) {
    const superSampledPath = [];
    for (let i = 1; i < path.length; i++) {
      const prevPoint = path[i - 1];
      const curPoint = path[i];
      for (let t = 0; t < 1; t += 0.05) {
        superSampledPath.push(PathUtils.lerp2D(prevPoint, curPoint, t));
      }
    }
    return superSampledPath;
  }

  static simplifyPath(path) {
    const newPath = [path[0]];
    for (let i = 1; i < path.length; i++) {
      if (PathUtils.distance(newPath[newPath.length - 1], path[i]) > RESAMPLING_THRESHOLD) {
        newPath.push(path[i]);
      }
    }
    return newPath;
  }

  static smoothPath(path) {
    for (let step = 1; step <= SMOOTHING_STEPS; step++) {
      const smoothPath = [path[0]];
      for (let i = 1; i < path.length; i++) {
        smoothPath.push({
          x: (path[i - 1].x + path[i].x) / 2,
          y: (path[i - 1].y + path[i].y) / 2,
        });
      }
      smoothPath.push(path[path.length - 1]);
      path = smoothPath;
    }
    return path;
  }

  static distance(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  static lerp(a, b, t) {
    return a + (b - a) * t;
  }

  static lerp2D(p1, p2, t) {
    return {
      x: PathUtils.lerp(p1.x, p2.x, t),
      y: PathUtils.lerp(p1.y, p2.y, t),
    };
  }
}

// Animation
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  Draw.drawPaths(ctx);
  Draw.planes.forEach((plane) => plane.draw(ctx));
  requestAnimationFrame(animate);
}

// Initialize and start animation
Draw.initialize();
animate();
