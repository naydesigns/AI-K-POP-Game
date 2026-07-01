const GROUPS = [
  { name: 'NOVA',   color: '#FF4D7A', key: 'd' },
  { name: 'STELLA', color: '#00D4A6', key: 'f' },
  { name: 'ECHO',   color: '#9B59F5', key: 'j' },
  { name: 'LYRA',   color: '#C1C8FE', key: 'k' },
];

const TIMING = { PERFECT: 55, GOOD: 130 };
const SCORES = { PERFECT: 100, GOOD: 60 };
const HEALTH_DRAIN = 12;
const SCROLL_TIME = 1800;
const COUNTDOWN_MS = 3000;

// ---- Game ----

class FandomSort {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.chart = null;
    this.dpr = window.devicePixelRatio || 1;
    this.reset();
    this.setupInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  reset() {
    this.state = 'idle';
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.multiplier = 1;
    this.health = 100;
    this.consecutiveMisses = 0;
    this.stats = { perfect: 0, good: 0, miss: 0 };
    this.tiles = [];
    this.feedbacks = [];
    this.laneFlashes = [0, 0, 0, 0];
    this.laneDown = [false, false, false, false];
    this.activeHolds = [null, null, null, null];
    this.seekOffset = 0;
    this.startTime = 0;
    this.animFrame = null;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.laneW = w / 4;
    this.hitY = h * 0.82;
    this.tileH = Math.max(44, Math.min(60, h * 0.07));
    this.isMobile = ('ontouchstart' in window) || window.innerWidth <= 600;
    this.fontSize = this.isMobile ? Math.max(7, w * 0.022) : 10;
  }

  // ---- Input ----

  setupInput() {
    const keyMap = { d: 0, f: 1, j: 2, k: 3 };

    document.addEventListener('keydown', (e) => {
      const lane = keyMap[e.key.toLowerCase()];
      if (lane !== undefined && !e.repeat) this.handlePress(lane);
    });

    document.addEventListener('keyup', (e) => {
      const lane = keyMap[e.key.toLowerCase()];
      if (lane !== undefined) this.handleRelease(lane);
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const lane = this.laneFromX(t.clientX);
        if (lane !== null) this.handlePress(lane);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const lane = this.laneFromX(t.clientX);
        if (lane !== null) this.handleRelease(lane);
      }
    }, { passive: false });

    this.canvas.addEventListener('mousedown', (e) => {
      const lane = this.laneFromX(e.clientX);
      if (lane !== null) {
        this.mouseLane = lane;
        this.handlePress(lane);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.mouseLane !== null && this.mouseLane !== undefined) {
        this.handleRelease(this.mouseLane);
        this.mouseLane = null;
      }
    });

    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  laneFromX(clientX) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const lane = Math.floor(x / (rect.width / 4));
    return (lane >= 0 && lane < 4) ? lane : null;
  }

  getElapsed() {
    if (this.music && !this.music.paused && this.music.currentTime > 0) {
      return this.music.currentTime * 1000;
    }
    const raw = performance.now() - this.startTime;
    return raw < 0 ? raw : raw + this.seekOffset;
  }

  handlePress(lane) {
    if (this.state !== 'playing' || this.laneDown[lane]) return;
    this.laneDown[lane] = true;
    const elapsed = this.getElapsed();

    let closest = null;
    let closestDiff = Infinity;

    for (const tile of this.tiles) {
      if (tile.hit || tile.missed || tile.holding || tile.lane !== lane) continue;
      const diff = Math.abs(elapsed - tile.time_ms);
      if (diff < closestDiff) {
        closest = tile;
        closestDiff = diff;
      }
    }

    if (!closest || closestDiff > TIMING.GOOD + 30) return;

    const rating = closestDiff <= TIMING.PERFECT ? 'PERFECT' : (closestDiff <= TIMING.GOOD ? 'GOOD' : null);
    if (!rating) return;

    this.laneFlashes[lane] = performance.now();

    if (closest.type === 'hold') {
      this.startHold(closest, rating);
    } else {
      this.registerHit(closest, rating);
    }
  }

  handleRelease(lane) {
    this.laneDown[lane] = false;
    const tile = this.activeHolds[lane];
    if (!tile) return;

    if (this.getElapsed() >= tile.endTime - TIMING.GOOD) {
      this.completeHold(tile);
    } else {
      this.breakHold(tile);
    }
  }

  pushFeedback(lane, text, color) {
    this.feedbacks.push({
      text,
      x: lane * this.laneW + this.laneW / 2,
      y: this.hitY,
      time: performance.now(),
      color,
    });
  }

  registerHit(tile, rating) {
    tile.hit = true;
    tile.hitTime = performance.now();
    tile.rating = rating;
    this.consecutiveMisses = 0;

    if (rating === 'PERFECT') {
      this.stats.perfect++;
    } else {
      this.stats.good++;
    }

    this.combo++;
    this.score += SCORES[rating] * this.multiplier;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.multiplier = Math.min(8, 1 + Math.floor(this.combo / 10));

    this.pushFeedback(tile.lane, rating, rating === 'PERFECT' ? '#FFD700' : '#00FF88');
  }

  startHold(tile, rating) {
    tile.holding = true;
    tile.headRating = rating;
    this.consecutiveMisses = 0;

    if (rating === 'PERFECT') {
      this.stats.perfect++;
    } else {
      this.stats.good++;
    }

    this.combo++;
    this.score += SCORES[rating] * this.multiplier;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.multiplier = Math.min(8, 1 + Math.floor(this.combo / 10));

    this.activeHolds[tile.lane] = tile;
    this.pushFeedback(tile.lane, rating, rating === 'PERFECT' ? '#FFD700' : '#00FF88');
  }

  completeHold(tile) {
    tile.hit = true;
    tile.holding = false;
    tile.hitTime = performance.now();
    this.activeHolds[tile.lane] = null;
    this.score += Math.round(SCORES[tile.headRating] * 0.5) * this.multiplier;
    this.pushFeedback(tile.lane, 'HOLD!', '#00D4FF');
  }

  breakHold(tile) {
    tile.holding = false;
    tile.missed = true;
    this.activeHolds[tile.lane] = null;
    this.stats.miss++;
    this.combo = 0;
    this.multiplier = 1;
    this.consecutiveMisses++;
    this.health = Math.max(0, this.health - HEALTH_DRAIN);
    this.pushFeedback(tile.lane, 'MISS', '#FF4444');

    if (this.consecutiveMisses >= 3 || this.health <= 0) {
      this.endGame('failed');
    }
  }

  registerMiss(tile) {
    tile.missed = true;
    this.stats.miss++;
    this.combo = 0;
    this.multiplier = 1;
    this.consecutiveMisses++;
    this.health = Math.max(0, this.health - HEALTH_DRAIN);

    this.pushFeedback(tile.lane, 'MISS', '#FF4444');

    if (this.consecutiveMisses >= 3 || this.health <= 0) {
      this.endGame('failed');
    }
  }

  // ---- Game flow ----

  async loadChart(url) {
    const res = await fetch(url);
    this.chart = await res.json();
    if (this.chart.audio) {
      this.music = new Audio(this.chart.audio);
      this.music.preload = 'auto';
      await new Promise((resolve) => {
        this.music.addEventListener('canplaythrough', resolve, { once: true });
        this.music.load();
      });
    }
  }

  getSeekParam() {
    const val = Number(new URLSearchParams(window.location.search).get('seek'));
    return Number.isFinite(val) && val > 0 ? val : 0;
  }

  start() {
    this.reset();
    this.tiles = this.chart.notes.map((n, i) => ({
      ...n, id: i, hit: false, missed: false, hitTime: null, rating: null,
      holding: false, headRating: null,
      endTime: n.type === 'hold' ? n.time_ms + (n.duration_ms || 0) : n.time_ms,
    }));

    const seekMs = this.getSeekParam();
    this.seekOffset = seekMs;
    if (seekMs > 0) {
      for (const tile of this.tiles) {
        if (tile.endTime < seekMs) tile.hit = true;
      }
    }

    this.state = 'playing';
    this.showScreen('game');
    this.startTime = performance.now() + COUNTDOWN_MS;
    if (this.music) {
      this.music.currentTime = seekMs / 1000;
      setTimeout(() => {
        if (this.state === 'playing') this.music.play();
      }, COUNTDOWN_MS);
    }
    this.loop();
  }

  loop() {
    if (this.state !== 'playing') return;
    this.update();
    this.render();
    this.animFrame = requestAnimationFrame(() => this.loop());
  }

  update() {
    const elapsed = this.getElapsed();

    for (const tile of this.tiles) {
      if (tile.hit || tile.missed || tile.holding) continue;
      if (elapsed > tile.time_ms + TIMING.GOOD + 30) {
        this.registerMiss(tile);
        if (this.state !== 'playing') return;
      }
    }

    for (const tile of this.tiles) {
      if (tile.type === 'hold' && tile.holding && elapsed >= tile.endTime) {
        this.completeHold(tile);
      }
    }

    const now = performance.now();
    this.feedbacks = this.feedbacks.filter(f => now - f.time < 700);

    const allDone = this.tiles.every(t => t.hit || t.missed);
    if (allDone && elapsed > this.chart.duration_ms) {
      this.endGame('results');
    }
  }

  endGame(screen) {
    this.state = screen;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.music) {
      this.music.pause();
      this.music.currentTime = 0;
    }
    setTimeout(() => this.showScreen(screen), 300);
  }

  // ---- Rendering ----

  render() {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const elapsed = this.getElapsed();

    ctx.clearRect(0, 0, w, h);

    this.drawBackground(ctx, w, h);
    this.drawLanes(ctx, w, h);
    this.drawHitZone(ctx, w);
    this.drawTiles(ctx, elapsed);
    this.drawHitEffects(ctx);
    this.drawFeedback(ctx);
    this.drawHUD(ctx, w);
    this.drawCountdown(ctx, w, h, elapsed);
  }

  drawBackground(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(5, 5, 15, 0.65)';
    ctx.fillRect(0, 0, w, h);
  }

  drawLanes(ctx, w, h) {
    const now = performance.now();
    for (let i = 0; i < 4; i++) {
      const x = i * this.laneW;
      const color = GROUPS[i].color;

      const g = ctx.createLinearGradient(x, 0, x + this.laneW, 0);
      g.addColorStop(0, 'transparent');
      g.addColorStop(0.5, color + '0A');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, this.laneW, h);

      const flashAge = now - (this.laneFlashes[i] || 0);
      if (flashAge < 200) {
        const alpha = Math.round((1 - flashAge / 200) * 40);
        const hex = alpha.toString(16).padStart(2, '0');
        ctx.fillStyle = color + hex;
        ctx.fillRect(x, 0, this.laneW, h);
      }

      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
    }
  }

  drawHitZone(ctx, w) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, this.hitY - 2, w, 4);

    for (let i = 0; i < 4; i++) {
      const x = i * this.laneW;
      const color = GROUPS[i].color;

      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color + '55';
      roundRect(ctx, x + 6, this.hitY - 3, this.laneW - 12, 6, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (!this.isMobile) {
      const keySize = 32;
      const keyFont = 14;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 4; i++) {
        const kx = i * this.laneW + this.laneW / 2;
        const ky = this.hitY + 30;
        const color = GROUPS[i].color;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        roundRect(ctx, kx - keySize / 2, ky - keySize / 2, keySize, keySize, 6);
        ctx.fill();

        ctx.strokeStyle = color + 'AA';
        ctx.lineWidth = 2;
        roundRect(ctx, kx - keySize / 2, ky - keySize / 2, keySize, keySize, 6);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + keyFont + 'px "Press Start 2P", monospace';
        ctx.fillText(GROUPS[i].key.toUpperCase(), kx, ky + 1);
      }
      ctx.textBaseline = 'alphabetic';
    }
  }

  drawTiles(ctx, elapsed) {
    for (const tile of this.tiles) {
      if (tile.hit || tile.missed) continue;
      if (tile.type === 'hold') {
        this.drawHoldTile(ctx, tile, elapsed);
      } else {
        this.drawTapTile(ctx, tile, elapsed);
      }
    }
  }

  drawTapTile(ctx, tile, elapsed) {
    const timeToHit = tile.time_ms - elapsed;
    const progress = 1 - timeToHit / SCROLL_TIME;
    const y = progress * this.hitY - this.tileH / 2;

    if (y < -this.tileH || y > this.h) return;

    const x = tile.lane * this.laneW;
    const color = GROUPS[tile.lane].color;
    const margin = 5;
    const tw = this.laneW - margin * 2;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, x + margin + 3, y + 3, tw, this.tileH, 10);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    roundRect(ctx, x + margin, y, tw, this.tileH, 10);
    ctx.fill();
    ctx.shadowBlur = 0;

    const hlGrad = ctx.createLinearGradient(0, y, 0, y + this.tileH);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
    hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    hlGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = hlGrad;
    roundRect(ctx, x + margin + 2, y + 2, tw - 4, this.tileH - 4, 8);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦', x + this.laneW / 2, y + this.tileH / 2 + 6);
  }

  drawHoldTile(ctx, tile, elapsed) {
    const headProgress = 1 - (tile.time_ms - elapsed) / SCROLL_TIME;
    const tailProgress = 1 - (tile.endTime - elapsed) / SCROLL_TIME;
    const headY = tile.holding ? this.hitY : headProgress * this.hitY;
    const tailY = tailProgress * this.hitY;

    const topY = Math.min(headY, tailY) - this.tileH / 2;
    const bottomY = Math.max(headY, tailY) + this.tileH / 2;

    if (bottomY < -this.tileH || topY > this.h) return;

    const x = tile.lane * this.laneW;
    const color = GROUPS[tile.lane].color;
    const margin = 5;
    const tw = this.laneW - margin * 2;
    const barH = bottomY - topY;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, x + margin + 3, topY + 3, tw, barH, 10);
    ctx.fill();

    ctx.fillStyle = tile.holding ? color : color + 'CC';
    ctx.shadowColor = color;
    ctx.shadowBlur = tile.holding ? 16 : 8;
    roundRect(ctx, x + margin, topY, tw, barH, 10);
    ctx.fill();
    ctx.shadowBlur = 0;

    const hlGrad = ctx.createLinearGradient(0, topY, 0, bottomY);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = hlGrad;
    roundRect(ctx, x + margin + 2, topY + 2, tw - 4, barH - 4, 8);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦', x + this.laneW / 2, topY + this.tileH / 2 + 6);
  }

  drawHitEffects(ctx) {
    const now = performance.now();
    for (const tile of this.tiles) {
      if (!tile.hit) continue;
      const age = now - tile.hitTime;
      if (age > 250) continue;

      const x = tile.lane * this.laneW;
      const alpha = 1 - age / 250;
      const expand = age / 250 * 10;
      const color = GROUPS[tile.lane].color;

      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = color;
      roundRect(ctx, x + 5 - expand, this.hitY - this.tileH / 2 - expand,
        this.laneW - 10 + expand * 2, this.tileH + expand * 2, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawFeedback(ctx) {
    const now = performance.now();
    for (const fb of this.feedbacks) {
      const age = now - fb.time;
      const alpha = 1 - age / 700;
      const yOff = -age * 0.12;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = fb.color;
      ctx.font = 'bold ' + (this.fontSize + 2) + 'px "Press Start 2P", monospace';
      ctx.textAlign = 'center';

      ctx.shadowColor = fb.color;
      ctx.shadowBlur = 10;
      ctx.fillText(fb.text, fb.x, fb.y + yOff - 30);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  drawHUD(ctx, w) {
    const fs = this.fontSize;
    const hudH = Math.max(60, this.h * 0.09);
    const grad = ctx.createLinearGradient(0, 0, 0, hudH);
    grad.addColorStop(0, 'rgba(0,0,0,0.7)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, hudH);

    const pad = Math.max(8, w * 0.025);

    ctx.fillStyle = '#fff';
    ctx.font = (fs - 1) + 'px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(this.chart.title, pad, hudH * 0.28);

    ctx.fillStyle = '#888';
    ctx.font = (fs - 3) + 'px "Press Start 2P", monospace';
    ctx.fillText(this.chart.artist, pad, hudH * 0.48);

    ctx.fillStyle = '#FFD700';
    ctx.font = (fs + 1) + 'px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(this.score.toLocaleString(), w - pad, hudH * 0.28);

    if (this.combo > 1) {
      ctx.fillStyle = '#fff';
      ctx.font = (fs - 1) + 'px "Press Start 2P", monospace';
      ctx.fillText(this.combo + ' COMBO', w - pad, hudH * 0.48);
    }
    if (this.multiplier > 1) {
      ctx.fillStyle = '#00FF88';
      ctx.font = (fs - 2) + 'px "Press Start 2P", monospace';
      ctx.fillText('×' + this.multiplier, w - pad, hudH * 0.65);
    }

    const hx = pad, hy = hudH * 0.8, hw = w - pad * 2, hh = Math.max(6, hudH * 0.12);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, hx, hy, hw, hh, 4);
    ctx.fill();

    const hcol = this.health > 50 ? '#00D4A6' : this.health > 25 ? '#FFD700' : '#FF4444';
    ctx.fillStyle = hcol;
    ctx.shadowColor = hcol;
    ctx.shadowBlur = 6;
    const barW = Math.max(0, hw * this.health / 100);
    if (barW > 0) {
      roundRect(ctx, hx, hy, barW, hh, 4);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  drawCountdown(ctx, w, h, elapsed) {
    if (elapsed >= 0) return;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);

    const count = Math.ceil(-elapsed / 1000);
    const frac = (-elapsed / 1000) % 1;
    const scale = 1 + frac * 0.3;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.globalAlpha = 0.5 + frac * 0.5;
    ctx.fillStyle = '#FFD700';
    ctx.font = Math.min(48, w * 0.12) + 'px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count.toString(), 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#C1C8FE';
    ctx.font = this.fontSize + 'px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GET READY', w / 2, h / 2 + 50);
  }

  // ---- Screens ----

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    if (id === 'game') {
      document.getElementById('game-screen').classList.add('active');
    } else if (id === 'results') {
      const el = document.getElementById('results-screen');
      el.classList.add('active');
      const total = this.stats.perfect + this.stats.good + this.stats.miss;
      const acc = total > 0 ? Math.round((this.stats.perfect + this.stats.good) / total * 100) : 0;
      document.getElementById('result-song-name').textContent = this.chart.title + ' — ' + this.chart.artist;
      document.getElementById('result-score').textContent = this.score.toLocaleString();
      document.getElementById('result-perfect').textContent = this.stats.perfect;
      document.getElementById('result-accuracy').textContent = acc + '%';
      document.getElementById('result-combo').textContent = this.maxCombo;
    } else if (id === 'failed') {
      const el = document.getElementById('fail-screen');
      el.classList.add('active');
      document.getElementById('fail-score-val').textContent = this.score.toLocaleString();
    } else {
      document.getElementById('home-screen').classList.add('active');
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ---- Firebase & Leaderboard ----

// Firebase initialized via module script in index.html → window.fbDB

var cachedScores = null;
try {
  var stored = localStorage.getItem('glowrush_lb');
  if (stored) cachedScores = JSON.parse(stored);
} catch (e) {}

function saveCache(scores) {
  try { localStorage.setItem('glowrush_lb', JSON.stringify(scores)); } catch (e) {}
}

function prefetchLeaderboard() {
  var fb = window.fbDB;
  if (!fb) { setTimeout(prefetchLeaderboard, 500); return; }
  var q = fb.query(fb.collection(fb.db, 'leaderboard'), fb.orderBy('score', 'desc'), fb.limit(20));
  fb.getDocs(q)
    .then(function(snap) {
      cachedScores = snap.docs.map(function(d) { return d.data(); });
      saveCache(cachedScores);
      console.log('[Firebase] Prefetched', cachedScores.length, 'scores');
    })
    .catch(function(e) { console.warn('[Firebase] Prefetch failed:', e.message); });
}

prefetchLeaderboard();

const Leaderboard = {
  getPlayerName() {
    return localStorage.getItem('glowrush_name') || '';
  },

  setPlayerName(name) {
    localStorage.setItem('glowrush_name', name);
  },

  async submitScore(score, accuracy, maxCombo) {
    var fb = window.fbDB;
    if (!fb) { console.error('[Firebase] Cannot save: fbDB not loaded'); return; }
    var name = this.getPlayerName();
    if (!name) { console.error('[Firebase] Cannot save: no name'); return; }
    console.log('[Firebase] Writing score:', name, score);
    var doc = await fb.addDoc(fb.collection(fb.db, 'leaderboard'), {
      name: name,
      score: score,
      accuracy: accuracy,
      maxCombo: maxCombo,
      savedAt: new Date().toISOString()
    });
    console.log('[Firebase] Write SUCCESS, doc ID:', doc.id);
  },

  async fetchTop(count) {
    count = count || 20;
    var fb = window.fbDB;
    if (!fb) return [];
    var q = fb.query(fb.collection(fb.db, 'leaderboard'), fb.orderBy('score', 'desc'), fb.limit(count));
    var snap = await fb.getDocs(q);
    return snap.docs.map(function(d) { return d.data(); });
  },

  renderList(scores) {
    const el = document.getElementById('leaderboard-list');
    if (!scores.length) {
      el.innerHTML = '<p class="lb-empty">NO SCORES YET. BE THE FIRST!</p>';
      return;
    }
    const medals = ['👑', '⭐', '✦'];
    el.innerHTML = scores.map((s, i) => {
      const rankClass = i < 3 ? ` top-${i + 1}` : '';
      const rank = i < 3 ? medals[i] : `${i + 1}`;
      return `<div class="lb-row${rankClass}">
        <span class="lb-rank">${rank}</span>
        <span class="lb-name">${s.name}</span>
        <span class="lb-score">${s.score.toLocaleString()}</span>
      </div>`;
    }).join('');
  }
};

// ---- Profanity Filter ----

var BLOCKED_WORDS = [
  'FUCK','SHIT','ASS','DICK','BITCH','CUNT','DAMN','HELL',
  'COCK','PUSSY','SLUT','WHORE','NIGGER','NIGGA','FAGGOT',
  'FAG','RETARD','RAPE','PORN','SEX','NAZI','KILL','DIE'
];

function containsProfanity(name) {
  var upper = name.toUpperCase().replace(/[^A-Z]/g, '');
  return BLOCKED_WORDS.some(function(w) { return upper.includes(w); });
}

// ---- Post-Game Screen ----

var PostGame = {
  pendingScore: null,
  expanded: false,

  init: function() {
    var input = document.getElementById('ne-input');
    var field = document.getElementById('ne-field');

    input.addEventListener('input', function() { PostGame.updateDisplay(); });
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') PostGame.save();
    });
    field.addEventListener('click', function() { input.focus(); });
    document.getElementById('btn-save').addEventListener('click', function() { PostGame.save(); });
    document.getElementById('pg-lb-expand').addEventListener('click', function() { PostGame.toggleExpand(); });
  },

  show: async function(outcome, scoreData) {
    this.pendingScore = scoreData;
    this.expanded = false;

    var title = document.getElementById('pg-title');
    if (outcome === 'results') {
      title.textContent = 'WAVE COMPLETE';
    } else {
      title.textContent = 'TRY AGAIN!';
    }

    document.getElementById('pg-song').textContent = scoreData.songTitle + ' — ' + scoreData.songArtist;
    document.getElementById('pg-score').textContent = scoreData.score.toLocaleString();
    document.getElementById('pg-accuracy').textContent = scoreData.accuracy + '%';
    document.getElementById('pg-combo').textContent = scoreData.maxCombo;

    var input = document.getElementById('ne-input');
    var saved = Leaderboard.getPlayerName();
    input.value = (saved && saved !== 'GUEST') ? saved : '';
    this.updateDisplay();

    var saveBtn = document.getElementById('btn-save');
    saveBtn.disabled = false;
    saveBtn.textContent = 'SAVE';

    this.loadLeaderboard();
    setTimeout(function() { input.focus(); }, 100);
  },

  updateDisplay: function() {
    var input = document.getElementById('ne-input');
    var clean = input.value.toUpperCase().replace(/[^A-Z0-9 _-]/g, '').slice(0, 8);
    input.value = clean;

    var count = clean.length;
    var hasName = clean.trim().length > 0;

    document.getElementById('ne-display').textContent = clean || ' ';
    document.getElementById('ne-counter').textContent = count + '/8 characters';
    document.getElementById('ne-counter').classList.toggle('warn', count >= 7);
    document.getElementById('ne-caret').classList.toggle('hidden', count >= 8);

    var saveBtn = document.getElementById('btn-save');
    saveBtn.classList.toggle('active', hasName);

  },

  save: async function() {
    var input = document.getElementById('ne-input');
    var name = input.value.trim();
    if (!name) {
      var field = document.getElementById('ne-field');
      field.classList.add('shake');
      setTimeout(function() { field.classList.remove('shake'); }, 450);
      input.focus();
      return;
    }
    if (containsProfanity(name)) {
      var field2 = document.getElementById('ne-field');
      field2.classList.add('shake');
      setTimeout(function() { field2.classList.remove('shake'); }, 450);
      return;
    }

    var saveBtn = document.getElementById('btn-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'SAVED';

    Leaderboard.setPlayerName(name);

    if (this.pendingScore) {
      var newEntry = { name: name, score: this.pendingScore.score, accuracy: this.pendingScore.accuracy, maxCombo: this.pendingScore.maxCombo };
      var list = cachedScores ? cachedScores.slice() : [];
      list.push(newEntry);
      list.sort(function(a, b) { return b.score - a.score; });
      if (list.length > 20) list = list.slice(0, 20);
      cachedScores = list;
      saveCache(cachedScores);
      this.renderLeaderboard(cachedScores);

      var pending = this.pendingScore;
      this.pendingScore = null;
      Leaderboard.submitScore(pending.score, pending.accuracy, pending.maxCombo)
        .then(function() { console.log('[Firebase] Background sync complete'); prefetchLeaderboard(); })
        .catch(function(err) { console.error('[Firebase] Background save FAILED:', err.message || err); });
    }
  },

  loadLeaderboard: function() {
    var list = document.getElementById('pg-lb-list');
    var expandBtn = document.getElementById('pg-lb-expand');

    if (cachedScores && cachedScores.length) {
      this.renderLeaderboard(cachedScores);
    } else {
      list.innerHTML = '<p class="pg-lb-empty">NO SCORES YET. BE THE FIRST!</p>';
      expandBtn.style.display = 'none';
    }

    var self = this;
    Leaderboard.fetchTop().then(function(scores) {
      if (scores.length) {
        cachedScores = scores;
        saveCache(scores);
        self.renderLeaderboard(scores);
      }
    }).catch(function() {});
  },

  renderLeaderboard: function(scores) {
    var list = document.getElementById('pg-lb-list');
    var expandBtn = document.getElementById('pg-lb-expand');

    if (!scores.length) {
      list.innerHTML = '<p class="pg-lb-empty">NO SCORES YET. BE THE FIRST!</p>';
      expandBtn.style.display = 'none';
      return;
    }

    var currentName = Leaderboard.getPlayerName();
    var rows = '';
    for (var i = 0; i < scores.length; i++) {
      var s = scores[i];
      var rankClass = i === 0 ? ' top-1' : '';
      var youClass = s.name === currentName ? ' is-you' : '';
      var hiddenClass = i >= 5 ? ' pg-lb-hidden' : '';
      var rank = i === 0 ? '\u{1F451}' : (i + 1);
      rows += '<div class="pg-lb-row' + rankClass + youClass + hiddenClass + '" data-lb-extra="' + (i >= 5 ? '1' : '0') + '">'
        + '<span class="pg-lb-rank">' + rank + '</span>'
        + '<span class="pg-lb-name">' + s.name + '</span>'
        + '<span class="pg-lb-score">' + s.score.toLocaleString() + '</span>'
        + '</div>';
    }

    list.innerHTML = rows;
    PostGame.expanded = false;
    expandBtn.textContent = 'EXPAND TO VIEW FULL LIST ▼';
    expandBtn.style.display = scores.length > 5 ? 'block' : 'none';
  },

  toggleExpand: function() {
    this.expanded = !this.expanded;
    var extras = document.querySelectorAll('[data-lb-extra="1"]');
    var btn = document.getElementById('pg-lb-expand');
    var expanded = this.expanded;
    extras.forEach(function(el) { el.classList.toggle('pg-lb-hidden', !expanded); });
    btn.textContent = this.expanded ? 'COLLAPSE ▲' : 'EXPAND TO VIEW FULL LIST ▼';
  }
};

// ---- Init ----

document.addEventListener('DOMContentLoaded', async function() {
  var game = new FandomSort();
  await game.loadChart('charts/neon-frequency.json');

  PostGame.init();

  document.getElementById('btn-play').addEventListener('click', function() { game.start(); });
  document.getElementById('btn-replay').addEventListener('click', function() { game.start(); });

  var origShowScreen = game.showScreen.bind(game);
  game.showScreen = function(id) {
    if (id === 'results' || id === 'failed') {
      var total = game.stats.perfect + game.stats.good + game.stats.miss;
      var acc = total > 0 ? Math.round((game.stats.perfect + game.stats.good) / total * 100) : 0;
      var scoreData = { score: game.score, accuracy: acc, maxCombo: game.maxCombo, songTitle: game.chart.title, songArtist: game.chart.artist };
      document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
      document.getElementById('postgame-screen').classList.add('active');
      PostGame.show(id, scoreData);
    } else {
      origShowScreen(id);
    }
  };

  game.showScreen('home');
});
