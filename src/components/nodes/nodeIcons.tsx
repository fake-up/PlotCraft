// Node icons for visual identification
// Each icon is a 16x16 SVG component

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

const defaultSize = 14;

// Helper to create consistent icon wrapper
const Icon = ({ children, className = '', size = defaultSize, style }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    {children}
  </svg>
);

// ============ GENERATORS ============

// Grid - grid pattern
export const GridIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="3" y1="3" x2="3" y2="13" />
    <line x1="8" y1="3" x2="8" y2="13" />
    <line x1="13" y1="3" x2="13" y2="13" />
    <line x1="3" y1="3" x2="13" y2="3" />
    <line x1="3" y1="8" x2="13" y2="8" />
    <line x1="3" y1="13" x2="13" y2="13" />
  </Icon>
);

// Flow Field - wavy parallel lines
export const FlowFieldIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 4 Q5 2, 8 4 T14 4" />
    <path d="M2 8 Q5 6, 8 8 T14 8" />
    <path d="M2 12 Q5 10, 8 12 T14 12" />
  </Icon>
);

// Concentric Circles - target
export const ConcentricCirclesIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="8" cy="8" r="6" />
    <circle cx="8" cy="8" r="3.5" />
    <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
  </Icon>
);

// Radial Lines - starburst
export const RadialLinesIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="8" y1="10" x2="8" y2="14" />
    <line x1="2" y1="8" x2="6" y2="8" />
    <line x1="10" y1="8" x2="14" y2="8" />
    <line x1="3.5" y1="3.5" x2="6" y2="6" />
    <line x1="10" y1="10" x2="12.5" y2="12.5" />
    <line x1="12.5" y1="3.5" x2="10" y2="6" />
    <line x1="6" y1="10" x2="3.5" y2="12.5" />
  </Icon>
);

// Spiral
export const SpiralIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 8 Q8 6, 10 6 Q12 6, 12 8 Q12 11, 8 11 Q4 11, 4 7 Q4 3, 9 3 Q14 3, 14 8" />
  </Icon>
);

// Lissajous - figure 8
export const LissajousIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 8 Q3 3, 8 3 Q13 3, 13 8 Q13 13, 8 13 Q3 13, 3 8 Z" />
    <path d="M6 8 Q6 6, 8 6 Q10 6, 10 8 Q10 10, 8 10 Q6 10, 6 8 Z" />
  </Icon>
);

// Vertical Lines
export const VerticalLinesIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="4" y1="3" x2="4" y2="13" />
    <line x1="7" y1="3" x2="7" y2="13" />
    <line x1="10" y1="3" x2="10" y2="13" />
    <line x1="13" y1="3" x2="13" y2="13" />
  </Icon>
);

// Circle Pack - multiple circles
export const CirclePackIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="11" cy="5" r="2" />
    <circle cx="5" cy="11" r="2" />
    <circle cx="11" cy="11" r="2.5" />
  </Icon>
);

// Voronoi - cell pattern
export const VoronoiIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 5 L6 2 L11 3 L14 7 L12 12 L7 14 L3 11 Z" />
    <line x1="6" y1="2" x2="7" y2="8" />
    <line x1="7" y1="8" x2="3" y2="11" />
    <line x1="7" y1="8" x2="12" y2="12" />
    <line x1="7" y1="8" x2="14" y2="7" />
  </Icon>
);

// Contours - topographic lines
export const ContoursIcon = (props: IconProps) => (
  <Icon {...props}>
    <ellipse cx="8" cy="9" rx="5" ry="4" />
    <ellipse cx="8" cy="8" rx="3" ry="2.5" />
    <ellipse cx="8" cy="7" rx="1.5" ry="1" />
  </Icon>
);

// Scatter Points - random dots
export const ScatterPointsIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="4" cy="4" r="1" fill="currentColor" stroke="none" />
    <circle cx="10" cy="3" r="1" fill="currentColor" stroke="none" />
    <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
    <circle cx="3" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
    <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="11" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="13" cy="5" r="1" fill="currentColor" stroke="none" />
  </Icon>
);

// Arc - curved line segment
export const ArcIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 11 A6 6 0 0 1 13 11" />
  </Icon>
);

// Horizontal Lines - parallel horizontal lines
export const HorizontalLinesIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="3" y1="4" x2="13" y2="4" />
    <line x1="3" y1="7" x2="13" y2="7" />
    <line x1="3" y1="10" x2="13" y2="10" />
    <line x1="3" y1="13" x2="13" y2="13" />
  </Icon>
);

// Particle Spray - spray pattern from point
export const ParticleSprayIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="3" cy="8" r="1.5" fill="currentColor" stroke="none" />
    <line x1="4" y1="8" x2="7" y2="4" />
    <line x1="4" y1="8" x2="8" y2="7" />
    <line x1="4" y1="8" x2="8" y2="9" />
    <line x1="4" y1="8" x2="7" y2="12" />
    <circle cx="9" cy="3" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="11" cy="6" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="11" cy="10" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="9" cy="13" r="0.8" fill="currentColor" stroke="none" />
  </Icon>
);

// ============ MODIFIERS ============

// Noise Displace - squiggle
export const NoiseDisplaceIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 8 Q4 5, 5 8 Q6 11, 8 8 Q10 5, 11 8 Q12 11, 14 8" />
  </Icon>
);

// Rotate - rotation arrow
export const RotateIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 4 A5 5 0 1 0 13 9" />
    <polyline points="12 2, 12 5, 15 5" />
  </Icon>
);

// Clip Rectangle
export const ClipRectIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="10" height="10" />
    <line x1="1" y1="3" x2="3" y2="3" />
    <line x1="13" y1="3" x2="15" y2="3" />
    <line x1="1" y1="13" x2="3" y2="13" />
    <line x1="13" y1="13" x2="15" y2="13" />
  </Icon>
);

// Clip Circle
export const ClipCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="8" cy="8" r="5" />
    <line x1="1" y1="4" x2="3.5" y2="4" />
    <line x1="12.5" y1="4" x2="15" y2="4" />
    <line x1="1" y1="12" x2="3.5" y2="12" />
    <line x1="12.5" y1="12" x2="15" y2="12" />
  </Icon>
);

// Jitter - scattered dots
export const JitterIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="4" cy="5" r="1" fill="currentColor" stroke="none" />
    <circle cx="8" cy="3" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="5" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="7" cy="13" r="1" fill="currentColor" stroke="none" />
    <circle cx="13" cy="12" r="1" fill="currentColor" stroke="none" />
  </Icon>
);

// Smooth - smooth curve
export const SmoothIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 12 Q5 12, 6 8 Q7 4, 10 4 Q13 4, 14 8" />
  </Icon>
);

// Scale - expand arrows
export const ScaleIcon = (props: IconProps) => (
  <Icon {...props}>
    <polyline points="10 2, 14 2, 14 6" />
    <line x1="14" y1="2" x2="9" y2="7" />
    <polyline points="6 14, 2 14, 2 10" />
    <line x1="2" y1="14" x2="7" y2="9" />
  </Icon>
);

// Wave Displace - sine wave
export const WaveDisplaceIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M1 8 Q4 3, 8 8 Q12 13, 15 8" />
  </Icon>
);

// Duplicate - stacked squares
export const DuplicateIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="2" y="5" width="8" height="8" />
    <rect x="6" y="2" width="8" height="8" />
  </Icon>
);

// Extend Endpoints - extend arrows
export const ExtendEndpointsIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="4" y1="8" x2="12" y2="8" />
    <polyline points="2 6, 2 8, 2 10" />
    <polyline points="14 6, 14 8, 14 10" />
    <line x1="2" y1="8" x2="4" y2="8" strokeDasharray="1,1" />
    <line x1="12" y1="8" x2="14" y2="8" strokeDasharray="1,1" />
  </Icon>
);

// Subdivide - line with dots
export const SubdivideIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="2" y1="8" x2="14" y2="8" />
    <circle cx="5" cy="8" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="11" cy="8" r="1.5" fill="currentColor" stroke="none" />
  </Icon>
);

// Twist - twisted shape
export const TwistIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 3 L12 3 L8 8 L12 13 L4 13 L8 8 Z" />
  </Icon>
);

// Dash - dashed line
export const DashIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="2" y1="8" x2="5" y2="8" />
    <line x1="7" y1="8" x2="10" y2="8" />
    <line x1="12" y1="8" x2="14" y2="8" />
  </Icon>
);

// Attractor - magnet/pull symbol
export const AttractorIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="8" cy="8" r="2" fill="currentColor" />
    <path d="M8 3 L8 5" />
    <path d="M8 11 L8 13" />
    <path d="M3 8 L5 8" />
    <path d="M11 8 L13 8" />
    <path d="M4.5 4.5 L6 6" />
    <path d="M10 10 L11.5 11.5" />
    <path d="M11.5 4.5 L10 6" />
    <path d="M6 10 L4.5 11.5" />
  </Icon>
);

// Merge - combine symbol
export const MergeIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="3" y1="4" x2="8" y2="8" />
    <line x1="3" y1="12" x2="8" y2="8" />
    <line x1="8" y1="8" x2="14" y2="8" />
    <circle cx="3" cy="4" r="1.5" />
    <circle cx="3" cy="12" r="1.5" />
    <polyline points="11 6, 14 8, 11 10" />
  </Icon>
);

// ============ VALUES ============

// Number - hash/number sign
export const NumberIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="5" y1="3" x2="4" y2="13" />
    <line x1="12" y1="3" x2="11" y2="13" />
    <line x1="3" y1="6" x2="13" y2="6" />
    <line x1="3" y1="10" x2="13" y2="10" />
  </Icon>
);

// Math - plus/minus
export const MathIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="4" y1="5" x2="8" y2="5" />
    <line x1="6" y1="3" x2="6" y2="7" />
    <line x1="9" y1="11" x2="13" y2="11" />
  </Icon>
);

// Random - dice
export const RandomIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <circle cx="5" cy="5" r="1" fill="currentColor" stroke="none" />
    <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
    <circle cx="11" cy="11" r="1" fill="currentColor" stroke="none" />
  </Icon>
);

// Vector - XY arrows
export const VectorIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="3" y1="13" x2="3" y2="5" />
    <polyline points="1 7, 3 5, 5 7" />
    <line x1="3" y1="13" x2="11" y2="13" />
    <polyline points="9 11, 11 13, 9 15" />
    <line x1="3" y1="13" x2="10" y2="6" strokeDasharray="2,1" />
  </Icon>
);

// Boolean - toggle switch
export const BooleanIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="2" y="5" width="12" height="6" rx="3" />
    <circle cx="11" cy="8" r="2" fill="currentColor" />
  </Icon>
);

// ============ OUTPUT ============

// Output - export arrow
export const OutputIcon = (props: IconProps) => (
  <Icon {...props}>
    <polyline points="5 3, 13 8, 5 13" fill="currentColor" strokeWidth="1" />
  </Icon>
);

// Shape - diamond with circle inside
export const ShapeIcon = (props: IconProps) => (
  <Icon {...props}>
    <polygon points="8 2, 14 8, 8 14, 2 8" fill="none" />
    <circle cx="8" cy="8" r="2.5" />
  </Icon>
);

// ============ ICON MAP ============

type IconComponent = (props: IconProps) => React.JSX.Element;

export const nodeIconMap: Record<string, IconComponent> = {
  // Generators
  shape: ShapeIcon,
  grid: GridIcon,
  flowField: FlowFieldIcon,
  concentricCircles: ConcentricCirclesIcon,
  radialLines: RadialLinesIcon,
  spiral: SpiralIcon,
  lissajous: LissajousIcon,
  verticalLines: VerticalLinesIcon,
  horizontalLines: HorizontalLinesIcon,
  circlePack: CirclePackIcon,
  voronoi: VoronoiIcon,
  contours: ContoursIcon,
  scatterPoints: ScatterPointsIcon,
  arc: ArcIcon,
  particleSpray: ParticleSprayIcon,

  // Modifiers
  noiseDisplace: NoiseDisplaceIcon,
  rotate: RotateIcon,
  clipRect: ClipRectIcon,
  clipCircle: ClipCircleIcon,
  jitter: JitterIcon,
  smooth: SmoothIcon,
  scale: ScaleIcon,
  waveDisplace: WaveDisplaceIcon,
  duplicate: DuplicateIcon,
  'extend-endpoints': ExtendEndpointsIcon,
  subdivide: SubdivideIcon,
  twist: TwistIcon,
  dash: DashIcon,
  attractor: AttractorIcon,
  merge: MergeIcon,

  // Values
  number: NumberIcon,
  math: MathIcon,
  random: RandomIcon,
  vector: VectorIcon,
  boolean: BooleanIcon,

  // Output
  output: OutputIcon,
};

// Get icon for a node type, with fallback
export function getNodeIcon(nodeType: string): IconComponent | null {
  return nodeIconMap[nodeType] || null;
}
