import React, { useEffect, useRef, useState, useMemo } from 'react';
import { gsap } from 'gsap';

// Define the props interface for the SvgNode component
export interface SvgNodeProps {
  /**
   * The SVG path to draw the node on.
   */
  path: string;

  /**
   * The position of the node along the path, represented as a percentage from 0-1.
   */
  position?: number;

  /**
   * Whether the node is visible or not.
   */
  visible?: boolean;

  /**
   * Whether the node label is visible or not.
   */
  labelVisible?: boolean;

  /**
   * The label to display next to the node.
   */
  label?: string;

  /**
   * The color of the glow effect.
   */
  glowColor?: string | undefined;

  /**
   * The color of the dot.
   */
  dotColor?: string | undefined;
}

// SvgNode component - renders a glowing node that moves along an SVG path
export const SvgNode: React.FC<SvgNodeProps> = ({
  path,
  position = 0,
  visible = false,
  labelVisible = false,
  label = '',
  glowColor = '#41D1FF',
  dotColor = '#9fe6fd',
}) => {
  // Generate a unique ID for the path to avoid collisions in a single SVG
  const pathId = useMemo(() => Math.random().toString(36), []);

  // References to DOM elements
  const pathElement = useRef<SVGPathElement>(null);

  // State for animation properties
  const [gradientWidth] = useState(30); // The radius of the glow effect
  const [gradientWidthScaleFactor, setGradientWidthScaleFactor] = useState(visible ? 1 : 0);
  const [dotRadius, setDotRadius] = useState(visible ? 3 : 0);
  const [dotPosition, setDotPosition] = useState({ x: 0, y: 0 });

  // Calculate the length of the SVG path
  const pathLength = useMemo(() => {
    if (!pathElement.current) return 0;
    return pathElement.current.getTotalLength();
  }, [pathElement.current]);

  // Update dot position when position prop changes
  useEffect(() => {
    if (!pathElement.current) return;

    const positionValue = 1 - (position || 0);
    const length = positionValue * pathLength;
    const { x, y } = pathElement.current.getPointAtLength(length);

    setDotPosition({ x, y });
  }, [position, pathLength]);

  // Animate the glow and dot radius when visibility changes
  useEffect(() => {
    // Animate the gradient width scale factor
    gsap.to(
      { value: gradientWidthScaleFactor },
      {
        duration: 0.5,
        ease: 'power2.inOut',
        value: visible ? 1 : 0,
        onUpdate: function () {
          setGradientWidthScaleFactor(this.targets()[0].value);
        },
      }
    );

    // Animate the dot radius
    gsap.to(
      { value: dotRadius },
      {
        duration: 0.6,
        ease: 'power2.inOut',
        value: visible ? 3 : 0,
        onUpdate: function () {
          setDotRadius(this.targets()[0].value);
        },
      }
    );
  }, [visible]);

  return (
    <g>
      {/* The main path with glow effect */}
      <path
        ref={pathElement}
        d={path}
        stroke={`url(#glow_gradient_${pathId})`}
        strokeWidth="1.2"
        mask={`url(#glow_mask_${pathId})`}
        className="svg-path"
      />

      {/* The dot that moves along the path */}
      {dotColor && (
        <circle
          cx={dotPosition.x}
          cy={dotPosition.y}
          r={dotRadius}
          fill={dotColor}
          className="circle-dot"
          // @ts-ignore
          style={{ '--dot-color': dotColor }}
        />
      )}

      {/* The label text */}
      {label && (
        <text
          x={dotPosition.x}
          y={dotPosition.y + 15}
          fill="#a3a3a3"
          fontFamily="Inter, sans-serif"
          fontSize="11px"
          fontStyle="normal"
          fontWeight="400"
          textAnchor="middle"
          alignmentBaseline="hanging"
          className={`label ${labelVisible ? 'label--visible' : ''}`}
        >
          {label}
        </text>
      )}

      {/* SVG definitions for mask and gradient */}
      <defs>
        {/* Mask to control where the glow appears */}
        <mask id={`glow_mask_${pathId}`}>
          <path d={path} fill="black" />
          <circle
            cx={dotPosition.x}
            cy={dotPosition.y}
            r={gradientWidth * gradientWidthScaleFactor}
            fill="white"
          />
        </mask>

        {/* Radial gradient for the glow effect */}
        <radialGradient
          id={`glow_gradient_${pathId}`}
          cx={dotPosition.x}
          cy={dotPosition.y}
          r={gradientWidth * gradientWidthScaleFactor}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={glowColor} stopOpacity="1" />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </radialGradient>
      </defs>
    </g>
  );
};

export default SvgNode;
