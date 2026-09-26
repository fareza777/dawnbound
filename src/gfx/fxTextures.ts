import Phaser from 'phaser';

/** Small pixel-art textures drawn at boot: projectiles, pickups, VFX. All white-ish so they can be tinted. */
function draw(scene: Phaser.Scene, key: string, w: number, h: number, pixels: (put: (x: number, y: number, c: string) => void) => void): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  const put = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  pixels(put);
  tex.refresh();
}

function circle(put: (x: number, y: number, c: string) => void, cx: number, cy: number, r: number, c: string): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) put(cx + x, cy + y, c);
}

function fromMap(put: (x: number, y: number, c: string) => void, rows: string[], pal: Record<string, string>): void {
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) put(x, y, pal[ch]); }));
}

export function createFxTextures(scene: Phaser.Scene): void {
  draw(scene, 'proj_orb', 9, 9, (put) => {
    circle(put, 4, 4, 4, 'rgba(255,255,255,0.35)');
    circle(put, 4, 4, 3, 'rgba(255,255,255,0.8)');
    circle(put, 4, 4, 1, '#ffffff');
  });
  draw(scene, 'proj_bolt', 10, 5, (put) => {
    for (let x = 0; x < 10; x++) {
      const a = x / 9;
      put(x, 2, `rgba(255,255,255,${0.3 + a * 0.7})`);
      if (x > 3) {
        put(x, 1, `rgba(255,255,255,${a * 0.5})`);
        put(x, 3, `rgba(255,255,255,${a * 0.5})`);
      }
    }
  });
  draw(scene, 'proj_star', 9, 9, (put) => {
    fromMap(put, ['....a....', '....b....', '...aba...', 'aabbcbbaa', '...aba...', '....b....', '....a....'].map((r) => r.padEnd(9, '.')), {
      a: 'rgba(255,255,255,0.45)', b: 'rgba(255,255,255,0.85)', c: '#ffffff',
    });
  });
  draw(scene, 'proj_wave', 10, 18, (put) => {
    for (let y = 0; y < 18; y++) {
      const t = (y - 8.5) / 8.5;
      const x = Math.round(6 - (1 - t * t) * 5);
      const a = 1 - Math.abs(t) * 0.6;
      put(x + 3, y, `rgba(255,255,255,${a})`);
      put(x + 2, y, `rgba(255,255,255,${a * 0.7})`);
      if (Math.abs(t) < 0.7) put(x + 1, y, `rgba(255,255,255,${a * 0.35})`);
    }
  });
  draw(scene, 'proj_spore', 7, 7, (put) => {
    circle(put, 3, 3, 3, 'rgba(255,255,255,0.4)');
    circle(put, 3, 3, 2, 'rgba(255,255,255,0.9)');
    put(2, 2, '#ffffff');
  });
  draw(scene, 'proj_arrow', 12, 3, (put) => {
    for (let x = 0; x < 9; x++) put(x, 1, '#c89a5a');
    put(0, 0, '#e8e0d0'); put(0, 2, '#e8e0d0'); put(1, 0, '#e8e0d0'); put(1, 2, '#e8e0d0');
    put(9, 0, '#d0d8e0'); put(10, 1, '#ffffff'); put(9, 2, '#d0d8e0'); put(9, 1, '#e8f0ff');
    put(11, 1, '#ffffff');
  });
  // Pickups
  draw(scene, 'pk_coin', 7, 7, (put) => {
    fromMap(put, ['..aaa..', '.abbba.', 'abbcbba', 'abcbbba', 'abbbbda', '.addda.', '..aaa..'], {
      a: '#7a4a12', b: '#f2c14e', c: '#fff4c0', d: '#c98a24',
    });
  });
  draw(scene, 'pk_gem', 7, 8, (put) => {
    fromMap(put, ['..aaa..', '.abcba.', 'abbcbba', 'abbbbba', '.abbba.', '..aba..', '...a...', '.......'], {
      a: '#2a1a5a', b: '#b77cff', c: '#f0e0ff',
    });
  });
  draw(scene, 'pk_heart', 9, 8, (put) => {
    fromMap(put, ['.aa...aa.', 'abba.abca', 'abbbabbba', 'abbbbbbba', '.abbbbba.', '..abbba..', '...aba...', '....a....'], {
      a: '#5a0a1a', b: '#e0304a', c: '#ffb0b8',
    });
  });
  draw(scene, 'pk_ember', 7, 7, (put) => {
    circle(put, 3, 3, 3, 'rgba(255,140,40,0.45)');
    circle(put, 3, 3, 2, '#ffb347');
    put(3, 2, '#fff4c0');
    put(3, 3, '#fff4c0');
  });
  draw(scene, 'pk_key', 9, 5, (put) => {
    fromMap(put, ['.aa......', 'abba.....', 'abbaaaaaa', 'abba..a.a', '.aa......'], { a: '#f2c14e', b: '#7a4a12' });
  });
  draw(scene, 'fx_slash', 24, 24, (put) => {
    for (let a = -60; a <= 60; a += 2) {
      const r = (a + 60) / 120;
      for (let k = 0; k < 3; k++) {
        const rad = 9 + k * 1.2 + r * 1.5;
        const t = (a * Math.PI) / 180;
        put(Math.round(12 + Math.cos(t) * rad), Math.round(12 + Math.sin(t) * rad), `rgba(255,255,255,${(1 - k * 0.3) * (0.3 + r * 0.7)})`);
      }
    }
  });
  draw(scene, 'fx_seal', 24, 12, (put) => {
    for (let a = 0; a < 360; a += 3) {
      const t = (a * Math.PI) / 180;
      put(Math.round(12 + Math.cos(t) * 11), Math.round(6 + Math.sin(t) * 5), 'rgba(255,255,255,0.9)');
      if (a % 45 === 0) put(Math.round(12 + Math.cos(t) * 7), Math.round(6 + Math.sin(t) * 3), '#ffffff');
    }
  });
  draw(scene, 'fx_smoke', 8, 8, (put) => {
    circle(put, 4, 4, 3, 'rgba(255,255,255,0.55)');
    circle(put, 3, 3, 2, 'rgba(255,255,255,0.8)');
  });
  draw(scene, 'fx_spark', 5, 5, (put) => {
    fromMap(put, ['..a..', '..b..', 'abcba', '..b..', '..a..'], { a: 'rgba(255,255,255,0.4)', b: 'rgba(255,255,255,0.8)', c: '#ffffff' });
  });
  draw(scene, 'fx_leaf', 4, 3, (put) => {
    fromMap(put, ['.ab.', 'abba', '.a..'], { a: 'rgba(255,255,255,0.7)', b: '#ffffff' });
  });
  draw(scene, 'fx_door', 32, 20, (put) => {
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 32; x++) {
        const dx = (x - 15.5) / 16;
        const dy = (19 - y) / 20;
        if (dx * dx + dy * dy * 0.8 < 1) put(x, y, `rgba(255,255,255,${0.15 + dy * 0.6})`);
      }
    }
  });
  createSmoothFx(scene);
}

/** Smooth, linearly filtered effect textures (slashes, shockwaves, streaks) that look clean at any scale. */
function smooth(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  paint(tex.getContext());
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

function createSmoothFx(scene: Phaser.Scene): void {
  // Crescent swoosh: bright leading edge fading into a soft tail, centred so it can be rotated around the hero.
  smooth(scene, 'fx_slash_hd', 128, 128, (ctx) => {
    const c = 64;
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const a0 = (-70 + t * 140) * (Math.PI / 180);
      const width = 3 + Math.sin(t * Math.PI) * 13;
      ctx.strokeStyle = `rgba(255,255,255,${(0.08 + t * 0.92) * 0.9})`;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(c, c, 46, a0, a0 + (2.4 * Math.PI) / 180);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, 54, (-40 * Math.PI) / 180, (70 * Math.PI) / 180);
    ctx.stroke();
  });
  // Soft shockwave ring.
  smooth(scene, 'fx_ring_hd', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 40, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  // Horizontal speed streak (for rushes and dashes).
  smooth(scene, 'fx_streak', 128, 16, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.8, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(64, 2, 128, 5);
    ctx.lineTo(128, 11);
    ctx.quadraticCurveTo(64, 14, 0, 8);
    ctx.fill();
  });
  // "Watch video" badge for rewarded-ad buttons.
  smooth(scene, 'ui_play', 48, 48, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.beginPath();
    ctx.arc(24, 24, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(18, 13);
    ctx.lineTo(35, 24);
    ctx.lineTo(18, 35);
    ctx.closePath();
    ctx.fill();
  });
  // Four-point sparkle for magic hits.
  smooth(scene, 'fx_star_hd', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      ctx.beginPath();
      ctx.moveTo(32 - dx * 30, 32 - dy * 30);
      ctx.lineTo(32 + dy * 3, 32 + dx * 3);
      ctx.lineTo(32 + dx * 30, 32 + dy * 30);
      ctx.lineTo(32 - dy * 3, 32 - dx * 3);
      ctx.closePath();
      ctx.fill();
    }
  });
}

