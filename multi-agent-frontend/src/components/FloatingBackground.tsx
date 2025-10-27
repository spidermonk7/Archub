import React, { useEffect, useRef } from 'react';
import './FloatingBackground.css';

const FloatingBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointsRef = useRef<Array<{x:number;y:number;vx:number;vy:number}>>([]);
  const mouseRef = useRef<{x:number;y:number}|null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = Math.min(120, Math.floor((canvas.width * canvas.height) / 25000));
    const pts = Array.from({length: count}).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
    }));
    pointsRef.current = pts;

    const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = () => { mouseRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    const loop = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      const pts = pointsRef.current;
      // update
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }
      // draw connections
      for (let i=0;i<pts.length;i++){
        for (let j=i+1;j<pts.length;j++){
          const a=pts[i], b=pts[j];
          const dx=a.x-b.x, dy=a.y-b.y; const d= Math.hypot(dx,dy);
          if (d<120){
            const alpha = 1 - d/120;
            ctx.strokeStyle = `rgba(255,255,255,${alpha*0.15})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
          }
        }
      }
      // draw points
      for (const p of pts){
        let r=1.2;
        if (mouseRef.current){
          const mdx= p.x - mouseRef.current.x; const mdy = p.y - mouseRef.current.y;
          const md = Math.hypot(mdx,mdy);
          if (md<120) r = 1.2 + (120-md)/60;
        }
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    }
  }, []);

  return <canvas ref={canvasRef} className="floating-bg" />
};

export default FloatingBackground;
