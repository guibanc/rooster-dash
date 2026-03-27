import { useEffect, useRef, useCallback } from "react";

// ============================================================
// FLAPPY GALO - Jogo estilo Flappy Bird com um Galo pixel art
// ============================================================

// --- Constantes do jogo ---
const GRAVITY = 0.35;
const JUMP_FORCE = -6;
const DIVE_FORCE = 1.5;
const BASE_SPEED = 3;
const PIPE_WIDTH = 52;
const INITIAL_GAP = 160;
const MIN_GAP = 90;
const PIPE_SPACING = 220;
const GALO_SIZE = 36;

// --- Cores pixel art ---
const COLORS = {
  sky: ["#4EC0CA", "#70D0D8", "#A8E8F0"],
  ground: "#8B6914",
  groundDark: "#6B4F10",
  grass: "#5DAA32",
  grassLight: "#7BC850",
  pipe: "#4AA52E",
  pipeDark: "#3B8A22",
  pipeLight: "#6BC850",
  pipeBorder: "#2A6B18",
  cloud: "#F0F8FF",
  cloudShadow: "#D4E8F0",
  // Galo
  body: "#E8C840",
  bodyDark: "#C8A830",
  belly: "#F0E068",
  comb: "#E03030",
  combDark: "#B82020",
  beak: "#F0A020",
  beakDark: "#D08818",
  eye: "#1A1A2E",
  eyeWhite: "#FFFFFF",
  wing: "#D0B030",
  wingDark: "#B89820",
  tail: "#C83030",
  tailDark: "#A02828",
  feet: "#E07020",
};

// --- Audio via Web Audio API ---
class SoundEngine {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  playJump() {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  playScore() {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(900, ctx.currentTime + 0.12);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  playHit() {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }
}

interface Pipe {
  x: number;
  topH: number;
  scored: boolean;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
}

type GameState = "start" | "playing" | "gameover";

// --- Desenhar Galo pixel art ---
function drawGalo(ctx: CanvasRenderingContext2D, x: number, y: number, wingFrame: number, rotation: number) {
  ctx.save();
  ctx.translate(x + GALO_SIZE / 2, y + GALO_SIZE / 2);
  ctx.rotate(rotation);
  ctx.translate(-GALO_SIZE / 2, -GALO_SIZE / 2);

  const s = GALO_SIZE / 9; // pixel size

  // Tail feathers
  ctx.fillStyle = COLORS.tail;
  ctx.fillRect(0, 1 * s, s, 2 * s);
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = COLORS.tailDark;
  ctx.fillRect(s, 1 * s, s, 2 * s);

  // Body
  ctx.fillStyle = COLORS.body;
  ctx.fillRect(2 * s, 2 * s, 4 * s, 4 * s);
  ctx.fillRect(3 * s, 1 * s, 3 * s, s);

  // Belly
  ctx.fillStyle = COLORS.belly;
  ctx.fillRect(3 * s, 4 * s, 3 * s, 2 * s);

  // Wing
  const wingY = wingFrame % 2 === 0 ? 3 * s : 2.5 * s;
  ctx.fillStyle = COLORS.wing;
  ctx.fillRect(2 * s, wingY, 3 * s, 2 * s);
  ctx.fillStyle = COLORS.wingDark;
  ctx.fillRect(2 * s, wingY + s, 3 * s, s);

  // Head
  ctx.fillStyle = COLORS.body;
  ctx.fillRect(5 * s, 0, 3 * s, 3 * s);

  // Comb
  ctx.fillStyle = COLORS.comb;
  ctx.fillRect(5 * s, -1.5 * s, s, 2 * s);
  ctx.fillRect(6 * s, -1 * s, s, 1.5 * s);
  ctx.fillRect(7 * s, -0.5 * s, s, s);
  ctx.fillStyle = COLORS.combDark;
  ctx.fillRect(5 * s, -0.5 * s, 3 * s, s);

  // Eye
  ctx.fillStyle = COLORS.eyeWhite;
  ctx.fillRect(6.5 * s, 0.5 * s, 1.5 * s, 1.5 * s);
  ctx.fillStyle = COLORS.eye;
  ctx.fillRect(7.2 * s, 0.8 * s, 0.8 * s, 0.8 * s);

  // Beak
  ctx.fillStyle = COLORS.beak;
  ctx.fillRect(8 * s, 1.5 * s, 1.5 * s, s);
  ctx.fillStyle = COLORS.beakDark;
  ctx.fillRect(8 * s, 2.5 * s, 1.2 * s, 0.5 * s);

  // Wattle
  ctx.fillStyle = COLORS.comb;
  ctx.fillRect(7 * s, 2.8 * s, s, s);

  // Feet
  ctx.fillStyle = COLORS.feet;
  ctx.fillRect(3 * s, 6 * s, s, 1.5 * s);
  ctx.fillRect(2.5 * s, 7 * s, 2 * s, 0.5 * s);
  ctx.fillRect(5 * s, 6 * s, s, 1.5 * s);
  ctx.fillRect(4.5 * s, 7 * s, 2 * s, 0.5 * s);

  ctx.restore();
}

// --- Desenhar cano rural (cerca/cano de madeira) ---
function drawPipe(ctx: CanvasRenderingContext2D, x: number, topH: number, gap: number, canvasH: number, groundH: number) {
  const bottomY = topH + gap;
  const bottomH = canvasH - groundH - bottomY;

  // Top pipe
  drawWoodPipe(ctx, x, 0, PIPE_WIDTH, topH, true);
  // Bottom pipe
  drawWoodPipe(ctx, x, bottomY, PIPE_WIDTH, bottomH, false);
}

function drawWoodPipe(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, isTop: boolean) {
  if (h <= 0) return;

  // Main body
  ctx.fillStyle = COLORS.pipe;
  ctx.fillRect(x, y, w, h);

  // Dark side
  ctx.fillStyle = COLORS.pipeDark;
  ctx.fillRect(x, y, 4, h);

  // Light side
  ctx.fillStyle = COLORS.pipeLight;
  ctx.fillRect(x + w - 6, y, 6, h);

  // Border
  ctx.fillStyle = COLORS.pipeBorder;
  ctx.fillRect(x - 1, y, 2, h);
  ctx.fillRect(x + w - 1, y, 2, h);

  // Cap (lip)
  const capH = 16;
  const capW = w + 12;
  const capX = x - 6;
  const capY = isTop ? y + h - capH : y;

  ctx.fillStyle = COLORS.pipe;
  ctx.fillRect(capX, capY, capW, capH);
  ctx.fillStyle = COLORS.pipeLight;
  ctx.fillRect(capX + capW - 6, capY, 6, capH);
  ctx.fillStyle = COLORS.pipeDark;
  ctx.fillRect(capX, capY, 4, capH);
  ctx.fillStyle = COLORS.pipeBorder;
  ctx.strokeStyle = COLORS.pipeBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(capX, capY, capW, capH);

  // Wood lines
  ctx.strokeStyle = COLORS.pipeDark;
  ctx.lineWidth = 1;
  for (let i = 0; i < h; i += 18) {
    const ly = y + i;
    ctx.beginPath();
    ctx.moveTo(x + 6, ly);
    ctx.lineTo(x + w - 8, ly);
    ctx.stroke();
  }
}

// ============================================================
// COMPONENTE REACT
// ============================================================
const FlappyGalo = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    state: GameState;
    galoY: number;
    galoVY: number;
    pipes: Pipe[];
    clouds: Cloud[];
    score: number;
    highScore: number;
    speed: number;
    gap: number;
    frameCount: number;
    shakeFrames: number;
    keys: Record<string, boolean>;
    wingFrame: number;
    groundOffset: number;
  }>({
    state: "start",
    galoY: 0,
    galoVY: 0,
    pipes: [],
    clouds: [],
    score: 0,
    highScore: 0,
    speed: BASE_SPEED,
    gap: INITIAL_GAP,
    frameCount: 0,
    shakeFrames: 0,
    keys: {},
    wingFrame: 0,
    groundOffset: 0,
  });
  const soundRef = useRef(new SoundEngine());
  const animRef = useRef<number>(0);

  const GROUND_H = 60;
  const GALO_X = 80;

  const resetGame = useCallback((canvasH: number) => {
    const s = stateRef.current;
    s.galoY = canvasH / 2 - GALO_SIZE / 2;
    s.galoVY = 0;
    s.pipes = [];
    s.score = 0;
    s.speed = BASE_SPEED;
    s.gap = INITIAL_GAP;
    s.frameCount = 0;
    s.shakeFrames = 0;
    s.wingFrame = 0;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const s = stateRef.current;

    // Load high score
    try {
      s.highScore = parseInt(localStorage.getItem("flappyGaloHighScore") || "0", 10);
    } catch { s.highScore = 0; }

    // Resize
    const resize = () => {
      canvas.width = Math.min(window.innerWidth, 480);
      canvas.height = Math.min(window.innerHeight, 800);
      if (s.state === "start") {
        s.galoY = canvas.height / 2 - GALO_SIZE / 2;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    // Init clouds
    s.clouds = Array.from({ length: 5 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height * 0.4),
      w: 40 + Math.random() * 50,
      speed: 0.3 + Math.random() * 0.5,
    }));

    // Input
    const onKeyDown = (e: KeyboardEvent) => {
      s.keys[e.key.toLowerCase()] = true;

      if (s.state === "start") {
        s.state = "playing";
        resetGame(canvas.height);
        return;
      }
      if (s.state === "gameover" && (e.key === " " || e.key.toLowerCase() === "r")) {
        resetGame(canvas.height);
        s.state = "playing";
        return;
      }
      if (s.state === "playing" && e.key.toLowerCase() === "w") {
        s.galoVY = JUMP_FORCE;
        soundRef.current.playJump();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { s.keys[e.key.toLowerCase()] = false; };

    // Touch support
    const onTouchStart = () => {
      if (s.state === "start") { s.state = "playing"; resetGame(canvas.height); return; }
      if (s.state === "gameover") { resetGame(canvas.height); s.state = "playing"; return; }
      if (s.state === "playing") { s.galoVY = JUMP_FORCE; soundRef.current.playJump(); }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("touchstart", onTouchStart);

    // --- GAME LOOP ---
    const loop = () => {
      const W = canvas.width;
      const H = canvas.height;
      const playH = H - GROUND_H;

      // Shake offset
      let shakeX = 0, shakeY = 0;
      if (s.shakeFrames > 0) {
        shakeX = (Math.random() - 0.5) * 8;
        shakeY = (Math.random() - 0.5) * 8;
        s.shakeFrames--;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // --- Draw sky gradient ---
      const grad = ctx.createLinearGradient(0, 0, 0, playH);
      grad.addColorStop(0, COLORS.sky[0]);
      grad.addColorStop(0.5, COLORS.sky[1]);
      grad.addColorStop(1, COLORS.sky[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, playH);

      // --- Clouds ---
      s.clouds.forEach(c => {
        ctx.fillStyle = COLORS.cloudShadow;
        ctx.beginPath();
        ctx.ellipse(c.x + 2, c.y + 2, c.w / 2, c.w / 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.cloud;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w / 2, c.w / 4, 0, 0, Math.PI * 2);
        ctx.fill();
        c.x -= c.speed;
        if (c.x + c.w / 2 < 0) { c.x = W + c.w; c.y = Math.random() * (playH * 0.4); }
      });

      // --- Ground ---
      ctx.fillStyle = COLORS.grass;
      ctx.fillRect(0, playH, W, 8);
      ctx.fillStyle = COLORS.grassLight;
      for (let gx = -s.groundOffset % 16; gx < W; gx += 16) {
        ctx.fillRect(gx, playH, 8, 4);
      }
      ctx.fillStyle = COLORS.ground;
      ctx.fillRect(0, playH + 8, W, GROUND_H - 8);
      ctx.fillStyle = COLORS.groundDark;
      for (let gx = -s.groundOffset % 24; gx < W; gx += 24) {
        ctx.fillRect(gx, playH + 12, 12, 4);
      }

      // --- UPDATE (playing) ---
      if (s.state === "playing") {
        s.frameCount++;
        s.groundOffset += s.speed;

        // Gravity
        s.galoVY += GRAVITY;
        if (s.keys["s"]) s.galoVY += DIVE_FORCE;
        s.galoY += s.galoVY;

        // Wing animation
        s.wingFrame = Math.floor(s.frameCount / 6);

        // Clamp
        if (s.galoY < 0) { s.galoY = 0; s.galoVY = 0; }
        if (s.galoY + GALO_SIZE > playH) {
          // Hit ground
          s.state = "gameover";
          s.shakeFrames = 15;
          soundRef.current.playHit();
          if (s.score > s.highScore) {
            s.highScore = s.score;
            try { localStorage.setItem("flappyGaloHighScore", String(s.highScore)); } catch {}
          }
        }

        // Difficulty
        s.speed = BASE_SPEED + s.score * 0.08;
        s.gap = Math.max(MIN_GAP, INITIAL_GAP - s.score * 3);

        // Spawn pipes
        const lastPipe = s.pipes[s.pipes.length - 1];
        if (!lastPipe || lastPipe.x < W - PIPE_SPACING) {
          const minTop = 40;
          const maxTop = playH - s.gap - 40;
          s.pipes.push({
            x: W + 20,
            topH: minTop + Math.random() * (maxTop - minTop),
            scored: false,
          });
        }

        // Move & check pipes
        for (let i = s.pipes.length - 1; i >= 0; i--) {
          const p = s.pipes[i];
          p.x -= s.speed;

          // Remove off screen
          if (p.x + PIPE_WIDTH < -20) { s.pipes.splice(i, 1); continue; }

          // Score
          if (!p.scored && p.x + PIPE_WIDTH < GALO_X) {
            p.scored = true;
            s.score++;
            soundRef.current.playScore();
          }

          // Collision (AABB)
          const gLeft = GALO_X + 4;
          const gRight = GALO_X + GALO_SIZE - 4;
          const gTop = s.galoY + 4;
          const gBot = s.galoY + GALO_SIZE - 4;

          const pLeft = p.x;
          const pRight = p.x + PIPE_WIDTH;

          if (gRight > pLeft && gLeft < pRight) {
            if (gTop < p.topH || gBot > p.topH + s.gap) {
              s.state = "gameover";
              s.shakeFrames = 15;
              soundRef.current.playHit();
              if (s.score > s.highScore) {
                s.highScore = s.score;
                try { localStorage.setItem("flappyGaloHighScore", String(s.highScore)); } catch {}
              }
            }
          }
        }
      }

      // --- Draw pipes ---
      s.pipes.forEach(p => drawPipe(ctx, p.x, p.topH, s.gap, H, GROUND_H));

      // --- Draw galo ---
      const rot = s.state === "playing" ? Math.min(Math.max(s.galoVY * 0.04, -0.4), 0.6) : 0;
      drawGalo(ctx, GALO_X, s.galoY, s.wingFrame, rot);

      ctx.restore(); // shake

      // --- UI TEXT ---
      ctx.textAlign = "center";

      // Score
      if (s.state === "playing" || s.state === "gameover") {
        // Pixel font style score
        ctx.font = "bold 36px monospace";
        ctx.fillStyle = "#000";
        ctx.fillText(String(s.score), W / 2 + 2, 52);
        ctx.fillStyle = "#FFF";
        ctx.fillText(String(s.score), W / 2, 50);
      }

      // Start screen
      if (s.state === "start") {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0, 0, W, H);

        ctx.font = "bold 32px monospace";
        ctx.fillStyle = "#FFF";
        ctx.fillText("🐓 FLAPPY GALO", W / 2, H / 2 - 60);

        ctx.font = "18px monospace";
        ctx.fillStyle = "#FFE";
        ctx.fillText("W = Subir | S = Descer", W / 2, H / 2);
        ctx.fillText("Toque ou tecla para começar", W / 2, H / 2 + 30);

        if (s.highScore > 0) {
          ctx.font = "16px monospace";
          ctx.fillStyle = "#FFD700";
          ctx.fillText(`🏆 High Score: ${s.highScore}`, W / 2, H / 2 + 70);
        }
      }

      // Game over
      if (s.state === "gameover") {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, W, H);

        ctx.font = "bold 30px monospace";
        ctx.fillStyle = "#E03030";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 50);

        ctx.font = "22px monospace";
        ctx.fillStyle = "#FFF";
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2);

        ctx.font = "18px monospace";
        ctx.fillStyle = "#FFD700";
        ctx.fillText(`🏆 Best: ${s.highScore}`, W / 2, H / 2 + 35);

        ctx.font = "16px monospace";
        ctx.fillStyle = "#DDD";
        ctx.fillText("Espaço ou R para reiniciar", W / 2, H / 2 + 75);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("resize", resize);
    };
  }, [resetGame]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1a1a2e]">
      <canvas
        ref={canvasRef}
        className="block border-4 border-[#2a2a4e] rounded-lg shadow-2xl"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
};

export default FlappyGalo;
