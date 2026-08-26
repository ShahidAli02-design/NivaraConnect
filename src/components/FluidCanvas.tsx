import React, { useEffect, useRef } from 'react';

export const FluidCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const colors = [
      { r: 212, g: 175, b: 55, a: 0.18 },  /* Primary Sunrise Gold */
      { r: 243, g: 229, b: 171, a: 0.28 }, /* Light Pearl Gold */
      { r: 255, g: 255, b: 255, a: 0.45 }, /* Pure White Glow */
      { r: 250, g: 246, b: 240, a: 0.35 }, /* Warm Cream Sunrise */
      { r: 170, g: 124, b: 17, a: 0.12 },  /* Deep Amber Gold */
    ];

    const particleCount = 35;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 160 + 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      pulseSpeed: Math.random() * 0.015 + 0.005,
      angle: Math.random() * Math.PI * 2,
    }));

    let time = 0;

    const render = () => {
      time += 0.008;

      // 1. Draw flowing pearl-white gradient background base
      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#FFFFFF');
      bgGradient.addColorStop(0.35, '#FAF8F3');
      bgGradient.addColorStop(0.75, '#F7F3E9');
      bgGradient.addColorStop(1, '#F3EBD8');

      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw soft flowing liquid wave layers
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        ctx.moveTo(0, height);

        for (let x = 0; x <= width; x += 25) {
          const s1 = Math.sin(x * 0.0022 + time * 0.7 + layer * 1.5) * 45;
          const s2 = Math.cos(x * 0.0012 + time * 0.4 + layer) * 25;
          const y = height * (0.35 + layer * 0.24) + s1 + s2;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        const waveGrad = ctx.createLinearGradient(0, 0, width, 0);
        waveGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        waveGrad.addColorStop(0.5, `rgba(212, 175, 55, ${0.09 - layer * 0.02})`);
        waveGrad.addColorStop(1, 'rgba(243, 229, 171, 0.2)');

        ctx.fillStyle = waveGrad;
        ctx.fill();
      }

      // 3. Draw ambient glowing pearl & gold fluid spheres
      particles.forEach((p) => {
        p.x += p.vx + Math.sin(time + p.angle) * 0.25;
        p.y += p.vy + Math.cos(time + p.angle) * 0.25;
        p.angle += p.pulseSpeed;

        if (p.x < -p.radius) p.x = width + p.radius;
        if (p.x > width + p.radius) p.x = -p.radius;
        if (p.y < -p.radius) p.y = height + p.radius;
        if (p.y > height + p.radius) p.y = -p.radius;

        const currentRadius = p.radius + Math.sin(p.angle) * 20;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentRadius);
        const c = p.color;
        grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`);
        grad.addColorStop(0.6, `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a * 0.4})`);
        grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      id="fluidCanvas"
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
    />
  );
};
