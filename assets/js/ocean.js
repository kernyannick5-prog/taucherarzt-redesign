/* Hero underwater scene: marine snow, bubbles and fish on one <canvas>.
   Vanilla, ~30fps, paused when the hero is off-screen or the tab is hidden,
   counts reduced on small / low-core devices, static frame for
   prefers-reduced-motion. Light rays are plain CSS. */
(function () {
  'use strict';

  var canvas = document.getElementById('ocean');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var hero = canvas.parentElement;
  while (hero && !(hero.classList && hero.classList.contains('hero'))) hero = hero.parentElement;
  if (!hero) hero = canvas.parentElement;

  var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var FRAME_MS = 1000 / 30;
  var W = 0, H = 0, dpr = 1;
  var particles = [], bubbles = [], fish = [], schools = [];
  var inView = true, running = false, raf = 0, last = 0, clock = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------- scene building ---------- */
  function counts() {
    var small = W < 700;
    var low = (navigator.hardwareConcurrency || 8) <= 4;
    var lean = small || low;
    return {
      particles: small ? 12 : (low ? 26 : 44),
      bubbles: small ? 3 : (low ? 5 : 7),
      fish: small ? 2 : (low ? 3 : 5),
      school: small ? 0 : (low ? 5 : 7),
      lean: lean
    };
  }

  function makeFish(d) {
    var size = 16 + d * 26;                       /* far = small, near = larger */
    var crossing = (90 - d * 48) * rand(0.9, 1.1); /* seconds, far = slower */
    var dir = Math.random() < 0.5 ? -1 : 1;
    return {
      d: d, size: size, dir: dir,
      speed: (W + size * 4) / crossing,
      x: rand(-size * 2, W + size * 2),
      y0: rand(0.12, 0.74) * H,
      bobAmp: rand(5, 13) * (0.6 + d), bobFreq: rand(0.12, 0.2), bobPh: rand(0, 6.28),
      tailFreq: rand(1.6, 2.4) + d * 0.6, tailPh: rand(0, 6.28),
      alpha: 0.10 + d * 0.12,
      rgb: Math.round(70 + d * 25) + ',' + Math.round(180 + d * 32) + ',' + Math.round(200 + d * 24),
      y: 0, vy: 0
    };
  }

  function makeSchool(n) {
    var members = [], i;
    for (i = 0; i < n; i++) {
      members.push({ dx: rand(-46, 46), dy: rand(-22, 22), ph: rand(0, 6.28), tp: rand(0, 6.28), s: rand(8, 12) });
    }
    var dir = Math.random() < 0.5 ? -1 : 1;
    return {
      dir: dir, members: members,
      speed: (W + 160) / rand(60, 80),
      x: rand(0, W), y0: rand(0.2, 0.62) * H, ph: rand(0, 6.28)
    };
  }

  function build() {
    var c = counts(), i;
    particles = []; bubbles = []; fish = []; schools = [];
    for (i = 0; i < c.particles; i++) {
      particles.push({
        bx: rand(0, W), y: rand(0, H), r: rand(0.6, 1.8),
        vy: rand(3, 9), a: rand(0.08, 0.3), amp: rand(4, 14), sp: rand(0.1, 0.35), ph: rand(0, 6.28), x: 0
      });
    }
    for (i = 0; i < c.bubbles; i++) {
      bubbles.push({
        bx: rand(0, W), y: rand(0.2, 1.2) * H, r: rand(2, 6),
        vy: rand(14, 30), amp: rand(5, 13), sp: rand(0.5, 1.1), ph: rand(0, 6.28), x: 0
      });
    }
    var depths = [0.12, 0.3, 0.5, 0.72, 0.9], pick = [];
    for (i = 0; i < c.fish; i++) pick.push(depths[Math.round(i * (depths.length - 1) / Math.max(1, c.fish - 1))]);
    for (i = 0; i < pick.length; i++) fish.push(makeFish(pick[i]));
    if (c.school) schools.push(makeSchool(c.school));
  }

  /* ---------- simulation ---------- */
  function step(dt) {
    var i, p, b, f, s;
    clock += dt;
    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      p.y += p.vy * dt;
      if (p.y > H + 4) { p.y = -4; p.bx = rand(0, W); }
      p.x = p.bx + Math.sin(clock * p.sp + p.ph) * p.amp;
    }
    for (i = 0; i < bubbles.length; i++) {
      b = bubbles[i];
      b.y -= b.vy * dt;
      if (b.y < -b.r * 2) { b.y = H + b.r + rand(0, H * 0.5); b.bx = rand(0, W); b.r = rand(2, 6); }
      b.x = b.bx + Math.sin(clock * b.sp + b.ph) * b.amp;
    }
    for (i = 0; i < fish.length; i++) {
      f = fish[i];
      f.x += f.dir * f.speed * dt;
      if (f.dir > 0 && f.x > W + f.size * 2) { f.x = -f.size * 2; f.y0 = rand(0.12, 0.74) * H; }
      else if (f.dir < 0 && f.x < -f.size * 2) { f.x = W + f.size * 2; f.y0 = rand(0.12, 0.74) * H; }
      f.y = f.y0 + Math.sin(clock * f.bobFreq * 6.28 + f.bobPh) * f.bobAmp;
      f.vy = Math.cos(clock * f.bobFreq * 6.28 + f.bobPh) * f.bobAmp * f.bobFreq * 6.28;
    }
    for (i = 0; i < schools.length; i++) {
      s = schools[i];
      s.x += s.dir * s.speed * dt;
      if (s.dir > 0 && s.x > W + 100) { s.x = -100; s.y0 = rand(0.2, 0.62) * H; }
      else if (s.dir < 0 && s.x < -100) { s.x = W + 100; s.y0 = rand(0.2, 0.62) * H; }
    }
  }

  /* ---------- drawing ---------- */
  function fishShape(x, y, size, dir, pitch, tail, fill) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(pitch);
    ctx.scale(dir * size, size);
    ctx.fillStyle = fill;
    ctx.beginPath();                                   /* body, facing +x */
    ctx.moveTo(0.5, 0);
    ctx.bezierCurveTo(0.32, -0.27, -0.12, -0.31, -0.38, -0.06);
    ctx.lineTo(-0.38, 0.06);
    ctx.bezierCurveTo(-0.12, 0.31, 0.32, 0.27, 0.5, 0);
    ctx.closePath();
    ctx.moveTo(0.08, -0.22);                           /* dorsal fin */
    ctx.quadraticCurveTo(-0.02, -0.42, -0.2, -0.26);
    ctx.lineTo(0.0, -0.2);
    ctx.closePath();
    ctx.fill();
    ctx.save();                                        /* tail, swings around the peduncle */
    ctx.translate(-0.36, 0);
    ctx.rotate(tail);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-0.3, -0.23);
    ctx.quadraticCurveTo(-0.2, 0, -0.3, 0.23);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function draw() {
    var i, j, p, b, f, s, m, mx, my;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = 'rgb(190,235,245)';
    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      ctx.globalAlpha = p.a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
    }

    /* farthest fish first */
    for (i = 0; i < fish.length; i++) {
      f = fish[i];
      ctx.globalAlpha = 1;
      fishShape(f.x, f.y, f.size, f.dir,
        f.dir * Math.atan2(f.vy, f.speed) , Math.sin(clock * f.tailFreq * 6.28 + f.tailPh) * 0.32,
        'rgba(' + f.rgb + ',' + f.alpha.toFixed(3) + ')');
    }
    for (i = 0; i < schools.length; i++) {
      s = schools[i];
      for (j = 0; j < s.members.length; j++) {
        m = s.members[j];
        mx = s.x + m.dx + Math.sin(clock * 0.4 + m.ph) * 6;
        my = s.y0 + m.dy + Math.sin(clock * 0.5 + s.ph + m.ph) * 8;
        fishShape(mx, my, m.s, s.dir, 0, Math.sin(clock * 3.2 + m.tp) * 0.35, 'rgba(130,215,228,0.09)');
      }
    }

    ctx.lineWidth = 1;
    for (i = 0; i < bubbles.length; i++) {
      b = bubbles[i];
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(190,238,246,0.3)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.62, -2.5, -1.6);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- loop control ---------- */
  function frame(ts) {
    raf = window.requestAnimationFrame(frame);
    var delta = ts - last;
    if (delta < FRAME_MS - 2) return;               /* ~30fps */
    last = ts;
    step(Math.min(delta / 1000, 0.1));
    draw();
  }

  function sync() {
    var should = inView && !document.hidden && !reduceMq.matches &&
      !document.documentElement.classList.contains('motion-paused');
    if (should && !running) {
      running = true;
      last = performance.now();
      raf = window.requestAnimationFrame(frame);
    } else if (!should && running) {
      running = false;
      window.cancelAnimationFrame(raf);
    }
    if (reduceMq.matches) { step(0); draw(); }      /* one static frame */
  }

  function resize() {
    var w = hero.offsetWidth, h = hero.offsetHeight;
    if (!w || !h) return;
    var rebuild = !particles.length || w !== W || Math.abs(h - H) > 80;
    W = w; H = h;
    dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (rebuild) build();
    if (!running) { step(0); draw(); }
  }

  var timer = 0;
  function onResize() {
    window.clearTimeout(timer);
    timer = window.setTimeout(resize, 160);
  }

  /* Start only once the page has loaded and the browser is idle, so the
     decorative scene never competes with the first render of the content. */
  function init() {
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(hero);
    else window.addEventListener('resize', onResize);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        sync();
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('motionchange', sync);
    if (reduceMq.addEventListener) reduceMq.addEventListener('change', sync);
    sync();
    canvas.classList.add('is-ready');
  }
  function schedule() {
    window.setTimeout(function () {
      if ('requestIdleCallback' in window) window.requestIdleCallback(init, { timeout: 2000 });
      else init();
    }, 1200);
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule);
})();
