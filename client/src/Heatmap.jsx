import { useEffect, useRef } from 'react';

export default function Heatmap({ points, width, height }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // simple heat: draw translucent circles
    points.forEach(({ x, y }) => {
      const px = x * width;
      const py = y * height;
      const radius = 30;
      const grd = ctx.createRadialGradient(px, py, 0, px, py, radius);
      grd.addColorStop(0, 'rgba(255,0,0,0.35)');
      grd.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [points, width, height]);

  return <canvas ref={canvasRef} className="overlay" aria-label="heatmap canvas" />;
}