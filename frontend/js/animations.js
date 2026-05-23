/**
 * Zynex — Background Particle Constellation Animation
 * Renders a subtle, performant particle network on #bg-canvas.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  /* ── Configuration ─────────────────────────────── */
  const CONFIG = {
    particleCount: 80,          // base count (scales with screen)
    particleSizeMin: 1,
    particleSizeMax: 2.5,
    speedFactor: 0.15,
    connectionDistance: 140,
    connectionOpacity: 0.12,
    colors: [
      { r: 59, g: 130, b: 246 },   // Blue  #3B82F6
      { r: 6,  g: 182, b: 212 },   // Cyan  #06B6D4
      { r: 139, g: 92,  b: 246 },  // Violet #8B5CF6
    ],
    mouseRadius: 180,
    mouseRepel: 0.02,
    pulseSpeed: 0.002,
  };

  let particles = [];
  let w, h;
  let mouse = { x: -9999, y: -9999 };
  let animFrameId = null;
  let isVisible = true;

  /* ── Resize ────────────────────────────────────── */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initParticles();
  }

  /* ── Particle Factory ──────────────────────────── */
  function createParticle() {
    const color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
    const size = CONFIG.particleSizeMin + Math.random() * (CONFIG.particleSizeMax - CONFIG.particleSizeMin);
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * CONFIG.speedFactor * 2,
      vy: (Math.random() - 0.5) * CONFIG.speedFactor * 2,
      size,
      baseSize: size,
      color,
      opacity: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function initParticles() {
    const area = window.innerWidth * window.innerHeight;
    const count = Math.min(Math.max(Math.floor(area / 12000), 40), 160);
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(createParticle());
    }
  }

  /* ── Update ────────────────────────────────────── */
  function update() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Pulse size
      p.phase += CONFIG.pulseSpeed;
      p.size = p.baseSize + Math.sin(p.phase) * 0.4;

      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Mouse repel
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.mouseRadius && dist > 0) {
        const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius * CONFIG.mouseRepel;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      // Damping
      p.vx *= 0.999;
      p.vy *= 0.999;

      // Speed clamp
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const maxSpeed = CONFIG.speedFactor * 3;
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }

      // Wrap edges
      if (p.x < -10) p.x = vw + 10;
      if (p.x > vw + 10) p.x = -10;
      if (p.y < -10) p.y = vh + 10;
      if (p.y > vh + 10) p.y = -10;
    }
  }

  /* ── Draw ──────────────────────────────────────── */
  function draw() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    ctx.clearRect(0, 0, vw, vh);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.connectionDistance) {
          const opacity = (1 - dist / CONFIG.connectionDistance) * CONFIG.connectionOpacity;
          // Gradient between two particle colors
          const r = Math.round((a.color.r + b.color.r) / 2);
          const g = Math.round((a.color.g + b.color.g) / 2);
          const bl = Math.round((a.color.b + b.color.b) / 2);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${r},${g},${bl},${opacity})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    // Draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const { r, g, b } = p.color;

      // Glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity * 0.08})`;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity})`;
      ctx.fill();
    }
  }

  /* ── Loop ──────────────────────────────────────── */
  function loop() {
    if (!isVisible) {
      animFrameId = requestAnimationFrame(loop);
      return;
    }
    update();
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  /* ── Event Listeners ───────────────────────────── */
  let resizeTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 200);
  });

  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('mouseleave', function () {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // Pause when tab not visible (performance)
  document.addEventListener('visibilitychange', function () {
    isVisible = !document.hidden;
  });

  /* ── Init ──────────────────────────────────────── */
  resize();
  loop();

})();
