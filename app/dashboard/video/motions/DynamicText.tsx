import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  AbsoluteFill,
} from "remotion";

export const DynamicMotionGraphic = ({
  text,
  mainColor = "#FFFFFF",
  heroColor = "#39FF14",
}: {
  text: string;
  mainColor?: string;
  heroColor?: string;
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Bouncy entrance animation
  const entrance = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Floating idle animation
  const float = Math.sin(frame / 10) * 10;

  return (
    <AbsoluteFill className="bg-slate-950 flex items-center justify-center overflow-hidden">
      <div
        style={{
          transform: `scale(${entrance}) translateY(${float}px)`,
          color: mainColor,
          fontSize: width * 0.08,
          fontWeight: 900,
          textAlign: "center",
          padding: "0 40px",
          fontFamily: "Montserrat, sans-serif",
          textShadow: `0 0 40px ${heroColor}44`,
        }}
      >
        {text || "DeepShark AI"}
      </div>
    </AbsoluteFill>
  );
};
