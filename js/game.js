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

// ---- Audio ----

class SFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  play(freq, dur) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  perfect() { this.play(880, 0.08); }
  good()    { this.play(660, 0.08); }
  miss()    { this.play(200, 0.15); }
}

// ---- Game ----

class FandomSort {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.sfx = new SFX();
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
      if (lane !== undefined && this.state === 'playing') {
        this.handleTap(lane);
      }
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const rect = this.canvas.getBoundingClientRect();
        const x = t.clientX - rect.left;
        const lane = Math.floor(x / (rect.width / 4));
        if (lane >= 0 && lane < 4) this.handleTap(lane);
      }
    }, { passive: false });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const lane = Math.floor(x / (rect.width / 4));
      if (lane >= 0 && lane < 4) this.handleTap(lane);
    });

    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  handleTap(lane) {
    if (this.state !== 'playing') return;
    const elapsed = performance.now() - this.startTime;

    let closest = null;
    let closestDiff = Infinity;

    for (const tile of this.tiles) {
      if (tile.hit || tile.missed || tile.lane !== lane) continue;
      const diff = Math.abs(elapsed - tile.time_ms);
      if (diff < closestDiff) {
        closest = tile;
        closestDiff = diff;
      }
    }

    if (!closest || closestDiff > TIMING.GOOD + 30) return;

    this.laneFlashes[lane] = performance.now();

    if (closestDiff <= TIMING.PERFECT) {
      this.registerHit(closest, 'PERFECT');
    } else if (closestDiff <= TIMING.GOOD) {
      this.registerHit(closest, 'GOOD');
    }
  }

  registerHit(tile, rating) {
    tile.hit = true;
    tile.hitTime = performance.now();
    tile.rating = rating;
    this.consecutiveMisses = 0;

    if (rating === 'PERFECT') {
      this.stats.perfect++;
      this.sfx.perfect();
    } else {
      this.stats.good++;
      this.sfx.good();
    }

    this.combo++;
    this.score += SCORES[rating] * this.multiplier;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.multiplier = Math.min(8, 1 + Math.floor(this.combo / 10));

    this.feedbacks.push({
      text: rating,
      x: tile.lane * this.laneW + this.laneW / 2,
      y: this.hitY,
      time: performance.now(),
      color: rating === 'PERFECT' ? '#FFD700' : '#00FF88',
    });
  }

  registerMiss(tile) {
    tile.missed = true;
    this.stats.miss++;
    this.combo = 0;
    this.multiplier = 1;
    this.consecutiveMisses++;
    this.health = Math.max(0, this.health - HEALTH_DRAIN);
    this.sfx.miss();

    this.feedbacks.push({
      text: 'MISS',
      x: tile.lane * this.laneW + this.laneW / 2,
      y: this.hitY,
      time: performance.now(),
      color: '#FF4444',
    });

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

  start() {
    this.reset();
    this.sfx.init();
    this.tiles = this.chart.notes.map((n, i) => ({
      ...n, id: i, hit: false, missed: false, hitTime: null, rating: null,
    }));
    this.state = 'playing';
    this.showScreen('game');
    this.startTime = performance.now() + COUNTDOWN_MS;
    if (this.music) {
      this.music.currentTime = 0;
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
    const elapsed = performance.now() - this.startTime;

    for (const tile of this.tiles) {
      if (tile.hit || tile.missed) continue;
      if (elapsed > tile.time_ms + TIMING.GOOD + 30) {
        this.registerMiss(tile);
        if (this.state !== 'playing') return;
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
    const elapsed = performance.now() - this.startTime;

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
      ctx.font = this.fontSize + 'px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = GROUPS[i].color + '50';
        ctx.fillText(GROUPS[i].key.toUpperCase(), i * this.laneW + this.laneW / 2, this.hitY + 28);
      }
    }
  }

  drawTiles(ctx, elapsed) {
    for (const tile of this.tiles) {
      if (tile.hit || tile.missed) continue;

      const timeToHit = tile.time_ms - elapsed;
      const progress = 1 - timeToHit / SCROLL_TIME;
      const y = progress * this.hitY - this.tileH / 2;

      if (y < -this.tileH || y > this.h) continue;

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

// ---- Init ----

document.addEventListener('DOMContentLoaded', async () => {
  const game = new FandomSort();
  await game.loadChart('charts/neon-frequency.json');

  document.getElementById('btn-play').addEventListener('click', () => game.start());
  document.getElementById('btn-replay').addEventListener('click', () => game.start());
  document.getElementById('btn-home').addEventListener('click', () => game.showScreen('home'));
  document.getElementById('btn-quit').addEventListener('click', () => game.showScreen('home'));
  document.getElementById('btn-revive').addEventListener('click', () => {
    game.health = 100;
    game.consecutiveMisses = 0;
    game.state = 'playing';
    game.showScreen('game');
    game.loop();
  });

  game.showScreen('home');
});
