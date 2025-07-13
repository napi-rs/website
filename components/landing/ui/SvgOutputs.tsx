import React from 'react';
import SvgNode, { SvgNodeProps } from './SvgNode';

// Define props interface for OutputLines component
interface OutputLinesProps {
  outputLines: SvgNodeProps[];
}

/**
 * Component for rendering output lines with animated nodes
 */
export const SvgOutputs: React.FC<OutputLinesProps> = ({ outputLines }) => {
  // Shared output path for all nodes
  const outputPath = "M843.463 1.3315L245.316 5.47507L0.633077 4.69725";

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
      <path
        d={outputPath}
        stroke="url(#output_gradient)"
        strokeWidth="1.2"
      />

      {/* Render nodes for each output line */}
      {outputLines.map((outputLine, index) => (
        <SvgNode
          key={index}
          path={outputPath}
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
