import React, { useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { FeatureCardProps } from './simple-card'
import cx from 'classnames'

import { useCardAnimation } from '../hooks/useCardAnimation';

import buildRs from './images/build-rs.svg'

export function ZeroConfigBuildCard ({ title, description, emoji, lugeReveal }: FeatureCardProps) {
  const [commandTriggered, setCommandTriggered] = useState(false);
  const [highlightEnter, setHighlightEnter] = useState(true);

  const id = 'zero-config-build'

  const { startAnimation, isCardActive } = useCardAnimation(
    `#${id}`,
    () => {
      const timeline = gsap.timeline();

      // Execute the `napi build` command animation
      timeline.call(() => {
        setCommandTriggered(true);
        setHighlightEnter(false);
      });

      return timeline;
    },
    {
      once: true,
    }
  )

  /**
   * Handle enter key press to trigger animation
   * Removes event listener after first use
   */
  const handleEnterPress = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      startAnimation();
      window.removeEventListener('keydown', handleEnterPress);
    }
  }, []);


  /**
   * Set up event listener for enter key press when component mounts
   * Clean up listener when component unmounts
   */
  useEffect(() => {
    window.addEventListener('keydown', handleEnterPress);

    return () => {
      window.removeEventListener('keydown', handleEnterPress);
    };
  }, [handleEnterPress]);

  const handleMouseOver = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startAnimation();
  };

  return (
    <div className="feature-card"
      id={id}
      data-lg-reveal={lugeReveal}
      data-lg-reveal-delay="0.15"
    >
      <div className={`feature__visualization ${isCardActive ? 'active' : ''}`}>

        <div className={cx("build-rs")} style={{ backgroundImage: `url(${buildRs.src})` }}></div>

        <div className={`terminal ${commandTriggered ? 'terminal--active' : ''}`}>
          {/* <div className="terminal__skeleton-line" />
          <div className="terminal__skeleton-line" /> */}

          {/* Command SVG - shown when command not triggered */}
          <div className={`command-wrapper ${!commandTriggered ? 'active' : ''}`} onMouseOver={handleMouseOver}>
            <div className="terminal__command">&gt; napi build</div>

              <svg
                className="terminal__enter"
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  width="28"
                  height="28"
                  rx="4"
                  fill="url(#paint0_linear_693_14840)"
                />
                <rect
                  width="28"
                  height="28"
                  rx="4"
                  fill="url(#paint1_linear_693_14840)"
                />
                <rect
                  x="0.5"
                  y="0.5"
                  width="27"
                  height="27"
                  rx="3.92105"
                  stroke="white"
                  strokeOpacity="0.1"
                />
                <g filter="url(#filter0_f_693_14840)">
                  <path
                    d="M19.9999 8V14.75C19.9999 15.5456 19.6839 16.3087 19.1213 16.8713C18.5586 17.4339 17.7956 17.75 16.9999 17.75H10.1854L12.0604 19.625L10.9999 20.6855L7.31445 17L10.9999 13.3145L12.0604 14.375L10.1854 16.25H16.9999C17.3978 16.25 17.7793 16.092 18.0606 15.8106C18.3419 15.5293 18.4999 15.1478 18.4999 14.75V8H19.9999Z"
                    fill="#FAFAFA"
                  />
                </g>
                <path
                  d="M19.9999 8V14.75C19.9999 15.5456 19.6839 16.3087 19.1213 16.8713C18.5586 17.4339 17.7956 17.75 16.9999 17.75H10.1854L12.0604 19.625L10.9999 20.6855L7.31445 17L10.9999 13.3145L12.0604 14.375L10.1854 16.25H16.9999C17.3978 16.25 17.7793 16.092 18.0606 15.8106C18.3419 15.5293 18.4999 15.1478 18.4999 14.75V8H19.9999Z"
                    fill="#FAFAFA"
                  />
                <defs>
                  <filter
                    id="filter0_f_693_14840"
                    x="1.31445"
                    y="2"
                    width="24.6855"
                    height="24.6855"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                  >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend
                      mode="normal"
                      in="SourceGraphic"
                      in2="BackgroundImageFix"
                      result="shape"
                    />
                    <feGaussianBlur
                      stdDeviation="3"
                      result="effect1_foregroundBlur_693_14840"
                    />
                  </filter>
                  <linearGradient
                    id="paint0_linear_693_14840"
                    x1="14"
                    y1="0"
                    x2="14"
                    y2="28"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#404040" />
                    <stop offset="1" stopColor="#262626" />
                  </linearGradient>
                  <linearGradient
                    id="paint1_linear_693_14840"
                    x1="14"
                    y1="0"
                    x2="14"
                    y2="28"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stopColor="#404040" />
                    <stop offset="1" stopColor="#262626" />
                  </linearGradient>
                </defs>
              </svg>

            {/* Enter key pulse effect */}
            {highlightEnter && (
              <div className="terminal__enter-pulse" />
            )}
            </div>

            <span className={cx('terminal__ready-label', {active: commandTriggered})}>Build in 96ms</span>

            <div className="terminal__glow" />
          </div>

          <div className={`connection-line ${commandTriggered ? 'active' : ''}`} />
      </div>

      <div className="feature__meta meta--left">
        <h3 className="meta__title">{title}</h3>
        <p className="meta__description">{description}</p>
      </div>
    </div>
  )
}
