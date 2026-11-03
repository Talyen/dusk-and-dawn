import { useEffect, useRef, useState } from "react";
import { startKeywordPlasma, type PlasmaColorState } from "../../lib/animation/keyword-plasma";
import { startBackgroundParticles } from "../../lib/animation/background-particles";
import { parsePlasmaHexColor, type PlasmaColorPair, type RgbTuple } from "../../lib/animation/plasma-colors";

const REST: PlasmaColorPair = { primary: "#364151", secondary: "#1d253a" };

function useMotionDisabled(reducedMotion: boolean) {
  const [systemReduce, setSystemReduce] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const update = () => setSystemReduce(query.matches);
    query.addEventListener("change", update);
    update();
    return () => query.removeEventListener("change", update);
  }, []);
  return reducedMotion || systemReduce;
}

function tuple(color: string | RgbTuple): [number, number, number] {
  return typeof color === "string" ? parsePlasmaHexColor(color) : [...color];
}

export function Background({
  pair,
  reducedMotion,
  glow,
  particles,
}: {
  pair: PlasmaColorPair | null;
  reducedMotion: boolean;
  glow: number;
  particles: number;
}) {
  const motionDisabled = useMotionDisabled(reducedMotion);
  const target = pair ?? REST;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef<PlasmaColorState>({ primary: REST.primary, secondary: REST.secondary });
  const particleColors = useRef<readonly string[]>([REST.primary, REST.secondary]);
  particleColors.current = [target.primary, target.secondary];
  const wakeRef = useRef<() => void>(() => {});
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (motionDisabled || glow <= 0 || !canvasRef.current) {
      setAvailable(false);
      return;
    }
    return startKeywordPlasma({
      canvas: canvasRef.current,
      colorsRef,
      focalYOffset: 0,
      active: () => true,
      onAvailabilityChange: setAvailable,
      onWakeReady: (wake) => {
        wakeRef.current = wake;
      },
    });
  }, [motionDisabled, glow]);

  useEffect(() => {
    const destination = { primary: target.primary, secondary: target.secondary };
    if (motionDisabled || glow <= 0) {
      colorsRef.current = destination;
      return;
    }
    const from = [tuple(colorsRef.current.primary), tuple(colorsRef.current.secondary)];
    const to = [parsePlasmaHexColor(target.primary), parsePlasmaHexColor(target.secondary)];
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / 800);
      const mix = 1 - Math.exp(-6 * progress) * (1 + 6 * progress);
      const blend = (i: number): [number, number, number] =>
        [0, 1, 2].map((channel) => from[i]![channel]! + (to[i]![channel]! - from[i]![channel]!) * mix) as [
          number,
          number,
          number,
        ];
      colorsRef.current = progress >= 1 ? destination : { primary: blend(0), secondary: blend(1) };
      wakeRef.current();
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target.primary, target.secondary, motionDisabled, glow]);

  useEffect(() => {
    if (motionDisabled || particles <= 0 || !particlesRef.current) return;
    try {
      return startBackgroundParticles(particlesRef, "embers", undefined, particles / 100, 32, particleColors);
    } catch {
      return;
    }
  }, [motionDisabled, particles]);

  return (
    <div
      className="ambient-background"
      aria-hidden="true"
      data-keyword-glow={pair ? "active" : "rest"}
      data-primary={target.primary}
      data-secondary={target.secondary}
    >
      <div className="ambient-plasma" style={{ opacity: Math.max(0, Math.min(1, glow / 100)) * 0.8 }}>
        <canvas
          ref={canvasRef}
          data-testid="plasma-canvas"
          style={{ visibility: available && !motionDisabled ? "visible" : "hidden" }}
        />
        {(!available || motionDisabled) && glow > 0 && (
          <div
            className="ambient-fallback"
            data-testid="plasma-fallback"
            style={{
              background: `radial-gradient(ellipse at center, color-mix(in srgb, ${target.primary} 13%, transparent), color-mix(in srgb, ${target.secondary} 7%, transparent) 35%, transparent 75%)`,
            }}
          />
        )}
      </div>
      <canvas
        ref={particlesRef}
        className="ambient-particles"
        style={{ visibility: motionDisabled || particles <= 0 ? "hidden" : "visible" }}
        data-testid="particle-canvas"
      />
    </div>
  );
}
