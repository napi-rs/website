import React from 'react';
import SvgNode, { SvgNodeProps } from './SvgNode';

// Props interface for the SvgInputs component
interface SvgInputsProps {
  inputLines: SvgNodeProps[];
}

// SvgInputs component - renders multiple input lines with nodes
export const SvgInputs: React.FC<SvgInputsProps> = ({ inputLines }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="844"
      height="644"
      viewBox="0 0 844 644"
      fill="none"
      className="input-lines"
    >
      {/* Input Lines - map over inputLines and render each line with node */}
      {inputLines.map((inputLine, index) => (
        <g key={index}>
          <path
            d={inputLine.path || ''}
            stroke="url(#base_gradient)"
            strokeWidth="1.2"
            style={{ opacity: 0.8 }}
          />
          <SvgNode {...inputLine} />
        </g>
      ))}

      {/* Gradient definition for the input lines */}
      <defs>
        <linearGradient
          id="base_gradient"
          x1="88.1032"
          y1="324.167"
          x2="843.505"
          y2="324.167"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#c6caff" stopOpacity="0" />
          <stop offset="0.2" stopColor="#c6caff" stopOpacity="0.1" />
          <stop offset="0.4" stopColor="white" stopOpacity="0.4" />
          <stop offset="0.6" stopColor="#c6caff" stopOpacity="0.2" />
          <stop offset="0.8" stopColor="#c6caff" stopOpacity="0.2" />
          <stop offset="0.9" stopColor="#c6caff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default SvgInputs;
