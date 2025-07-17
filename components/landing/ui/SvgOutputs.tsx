import React from 'react';
import SvgNode, { SvgNodeProps } from './SvgNode';
import { gsap } from 'gsap'

// Define props interface for OutputLines component
interface OutputLinesProps {
  outputLines: SvgNodeProps[];
}

function offsetPathY(pathData: string, offset: number): string {
  const segmentRegex = /[ML][^ML]*/g;
  const coordRegex = /[-+]?[0-9]*\.?[0-9]+/g;

  return pathData.replace(segmentRegex, segment => {
    const command = segment[0];
    const coords = segment.slice(1).match(coordRegex) || [];

    if (coords.length >= 2 && (command === 'M' || command === 'L')) {
      const x = coords[0];
      const y = parseFloat(coords[1]) + offset;

      const separator = segment.slice(1).replace(coordRegex, ' ');
      return `${command}${x}${separator.charAt(0)}${y}`;
    }

    return segment;
  });
}
/**
 * Component for rendering output lines with animated nodes
 */
export const SvgOutputs: React.FC<OutputLinesProps> = ({ outputLines }) => {
  const outputPath = "M843.463 1.3315L245.316 5.47507L0.633077 4.69725";
  const outputPaths = [
    offsetPathY(outputPath, 20),
    offsetPathY(outputPath, -20)
  ]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="844"
      height="80"
      viewBox="0 0 844 40"
      fill="none"
      className="output-line"
      style={{ opacity: 0.8 }}
    >
      {/* Base output line */}
      {outputPaths.map((path, index) => (
        <path
          key={index}
          d={path}
          stroke="url(#output_gradient)"
          strokeWidth="1.2"
        />
      ))}

      {/* Render nodes for each output line */}
      {outputLines.map((outputLine, index) => (
        <SvgNode
          key={index}
          path={gsap.utils.wrap(outputPaths, index)}
          position={outputLine.position}
          visible={outputLine.visible}
          labelVisible={outputLine.labelVisible}
          label={outputLine.label}
          dotColor={outputLine.dotColor || "#ED7B00"}
          glowColor={outputLine.glowColor || "#ED4900"}
        />
      ))}

      {/* Gradient definition for output line */}
      <defs>
        <linearGradient
          id="output_gradient"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.1" stopColor="#E0C8FF" stopOpacity="0" />
          <stop offset="0.4" stopColor="#E0C8FF" stopOpacity="0.4" />
          <stop offset="1" stopColor="#E0C8FF" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default SvgOutputs;
