import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { useCardAnimation } from '../hooks/useCardAnimation';

import { FeatureCardProps } from './simple-card'

const SvgNode = dynamic(() => import('../ui/SvgNode'), {
  ssr: false
});

export const OptimizedPerformanceCard: React.FC = ({ title, description, lugeReveal }: FeatureCardProps) => {
  const [glowPosition, setGlowPosition] = useState(0);
  const [glowVisible, setGlowVisible] = useState(false);
  const [checkmarks, setCheckmarks] = useState<boolean[]>(
    Array.from({ length: 13 }, () => false)
  );

  const id = 'optimized-performance'

  /**
   * Initialize card animation for hover interactions
   * Uses the custom useCardAnimation hook
   */
  const { startAnimation, isCardActive } = useCardAnimation(
    `#${id}`,
    () => {
      // Reset animation state before starting
      setGlowPosition(0);
      setGlowVisible(false);
      setCheckmarks(Array.from({ length: 13 }, () => false));

      // Create GSAP timeline for the animation sequence
      const timeline = gsap.timeline();

      // Animate glow position from 0 to 1 over 1.5s
      timeline.to(
        { value: glowPosition },
        {
          value: 1,
          duration: 1.5,
          ease: 'power2.in',
          onUpdate: function () {
            setGlowPosition(this.targets()[0].value);
          }
        },
        0
      );

      // Show glow effect after short delay
      timeline.call(
        () => {
          setGlowVisible(true);
        },
        undefined,
        0.2
      );

      // Hide glow effect before animation completes
      timeline.call(
        () => {
          setGlowVisible(false);
        },
        undefined,
        1.1
      );

      // Stagger checkmark animations
      checkmarks.map((_, index) => {
        timeline.call(
          () => {
            setCheckmarks(prev => {
              const newCheckmarks = [...prev];
              newCheckmarks[index] = true;
              return newCheckmarks;
            });
          },
          undefined,
          1.3 + index * 0.2
        );
      });

      return timeline;
    },
    {
      once: true
    }
  );

  /**
   * Handle mouse over event with proper event handling
   */
  const handleMouseOver = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startAnimation();
  };

  return (
    <div
      className="feature-card"
      id={id}
      data-lg-reveal={lugeReveal}
      data-lg-reveal-delay="0.15"
      onMouseOver={handleMouseOver}
    >
      <div
        className={`feature__visualization ${isCardActive ? 'active' : ''}`}
      >
        <div className="camera-container">
        <svg
          className="grid"
          width="720"
          height="241"
          viewBox="0 0 720 241"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1.00048 119.402L200.243 68.2732C213.283 65.4129 221.832 58.4923 221.832 50.7968V20.323V1M1.00048 136.779L231.212 68.7423C242.847 65.5523 250.195 59.0356 250.195 51.9076V20.323V1M1 165.731L263.267 69.1267C272.82 65.6348 278.558 59.7587 278.558 53.4667V20.323V1M719.001 154.23L464.019 69.1276C454.474 65.6348 448.743 59.7616 448.743 53.4731V20.323V1M719.001 125.219L496.078 68.7439C484.449 65.5528 477.106 59.0377 477.106 51.9119V20.323V1M719 107.817L527.05 68.2749C514.015 65.4134 505.469 58.4939 505.469 50.8001V20.323V1M719.001 96.2159L557.314 67.8323C543.291 65.2673 533.835 58.0756 533.835 49.976V20.323V9.78386C533.835 4.93267 529.902 1 525.051 1H505.469M1 107.817L169.982 67.8308C184.008 65.2668 193.467 58.0743 193.467 49.9735V20.323V9.78387C193.467 4.93267 197.4 1 202.251 1H221.832M221.832 1H250.195M250.195 1H278.558M278.558 1H306.924M306.924 1V20.323V55.7423C306.924 60.7337 303.306 65.5207 296.865 69.0509L62.8139 197.336C52.968 202.733 46.8471 213.068 46.8471 224.296V240.342M306.924 1H335.286M335.286 1V20.323V59.0919C335.286 62.0155 334.043 64.8989 331.656 67.5136L213.175 197.282C208.003 202.947 205.136 210.34 205.136 218.011V240.342M335.286 1H363.65M363.65 1V20.323L363.428 206.088V240.342M363.65 1H392.015M392.015 1V20.323V59.1056C392.015 62.0204 393.25 64.8954 395.624 67.5041L513.712 197.291C518.862 202.951 521.716 210.328 521.716 217.981V240.342M392.015 1H420.377M420.377 1V20.323V55.7518C420.377 60.7376 423.987 65.5197 430.415 69.0489L664.058 197.332C673.893 202.732 680.005 213.061 680.005 224.28V240.342M420.377 1H448.743M448.743 1H477.106M477.106 1H505.469"
            stroke="url(#paint0_linear_0_3)"
          />
          <defs>
            <linearGradient
              id="paint0_linear_0_3"
              x1="362.013"
              y1="-25.478"
              x2="362.013"
              y2="240.781"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset="0.7" stopColor="white" stopOpacity="0.35" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <span className="ci-text">NAPI-RS</span>

        <div className="checkmark-container">
          {/* Render checkmarks using map instead of Vue's v-for */}
          {Array.from({ length: 5 }).map((_, i) => (
            <svg
              key={i}
              className={`checkmark ${checkmarks[i] ? 'active' : ''}`}
              width="52"
              height="52"
              viewBox="0 0 52 52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g
                className="circle-glow"
                opacity="0.4"
                filter="url(#filter-circle-glow)"
              >
                <circle cx="25.712" cy="25.9725" r="17.6105" fill="#13B351" />
              </g>
              <circle
                className="circle-bg"
                cx="25.712"
                cy="25.9725"
                r="18.0268"
                fill="#171717"
              />
              <circle
                className="circle-specular"
                cx="25.712"
                cy="25.9725"
                r="18.0268"
                stroke="url(#radial-circle-specular)"
                strokeWidth="0.8"
              />
              <path
                className="checkmark-icon"
                d="M32.4256 21.1798C32.3326 21.086 32.2219 21.0115 32.1 20.9607C31.9781 20.9099 31.8473 20.8838 31.7152 20.8838C31.5831 20.8838 31.4523 20.9099 31.3304 20.9607C31.2085 21.0115 31.0978 21.086 31.0048 21.1798L23.5504 28.6442L20.4185 25.5023C20.3219 25.409 20.2079 25.3357 20.083 25.2864C19.9581 25.2372 19.8246 25.2131 19.6904 25.2154C19.5561 25.2177 19.4236 25.2465 19.3005 25.3C19.1773 25.3535 19.0659 25.4308 18.9726 25.5273C18.8793 25.6239 18.806 25.7379 18.7568 25.8629C18.7075 25.9878 18.6834 26.1212 18.6857 26.2555C18.688 26.3897 18.7168 26.5222 18.7703 26.6454C18.8238 26.7685 18.9011 26.8799 18.9977 26.9732L22.8399 30.8155C22.933 30.9093 23.0436 30.9837 23.1656 31.0345C23.2875 31.0853 23.4183 31.1115 23.5504 31.1115C23.6824 31.1115 23.8132 31.0853 23.9352 31.0345C24.0571 30.9837 24.1678 30.9093 24.2608 30.8155L32.4256 22.6506C32.5272 22.5569 32.6082 22.4432 32.6637 22.3166C32.7191 22.1901 32.7477 22.0534 32.7477 21.9152C32.7477 21.777 32.7191 21.6403 32.6637 21.5138C32.6082 21.3872 32.5272 21.2735 32.4256 21.1798Z"
                fill="#7fd5a0"
              />
              <g
                className="checkmark-icon__glow"
                filter="url(#filter-checkmark-icon-glow)"
              >
                <path
                  d="M32.4256 21.1798C32.3326 21.086 32.2219 21.0115 32.1 20.9607C31.9781 20.9099 31.8473 20.8838 31.7152 20.8838C31.5831 20.8838 31.4523 20.9099 31.3304 20.9607C31.2085 21.0115 31.0978 21.086 31.0048 21.1798L23.5504 28.6442L20.4185 25.5023C20.3219 25.409 20.2079 25.3357 20.083 25.2864C19.9581 25.2372 19.8246 25.2131 19.6904 25.2154C19.5561 25.2177 19.4236 25.2465 19.3005 25.3C19.1773 25.3535 19.0659 25.4308 18.9726 25.5273C18.8793 25.6239 18.806 25.7379 18.7568 25.8629C18.7075 25.9878 18.6834 26.1212 18.6857 26.2555C18.688 26.3897 18.7168 26.5222 18.7703 26.6454C18.8238 26.7685 18.9011 26.8799 18.9977 26.9732L22.8399 30.8155C22.933 30.9093 23.0436 30.9837 23.1656 31.0345C23.2875 31.0853 23.4183 31.1115 23.5504 31.1115C23.6824 31.1115 23.8132 31.0853 23.9352 31.0345C24.0571 30.9837 24.1678 30.9093 24.2608 30.8155L32.4256 22.6506C32.5272 22.5569 32.6082 22.4432 32.6637 22.3166C32.7191 22.1901 32.7477 22.0534 32.7477 21.9152C32.7477 21.777 32.7191 21.6403 32.6637 21.5138C32.6082 21.3872 32.5272 21.2735 32.4256 21.1798Z"
                  fill="#13B351"
                />
              </g>
              <defs>
                <filter
                  id="filter-circle-glow"
                  x="0.0968113"
                  y="0.357309"
                  width="51.2302"
                  height="51.2304"
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
                    stdDeviation="4.00238"
                    result="effect1_foregroundBlur_698_23226"
                  />
                </filter>
                <filter
                  id="filter-checkmark-icon-glow"
                  x="-2.30491"
                  y="-2.04392"
                  width="56.0332"
                  height="56.0332"
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
                    stdDeviation="8.00475"
                    result="effect1_foregroundBlur_698_23226"
                  />
                </filter>
                <radialGradient
                  id="radial-circle-specular"
                  cx="0"
                  cy="0"
                  r="1"
                  gradientUnits="userSpaceOnUse"
                  gradientTransform="translate(33.4166 23.1423) rotate(110.653) scale(21.8445)"
                >
                  <stop offset="0" stopColor="white" />
                  <stop offset="1" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          ))}
        </div>

        <svg
          className="grid"
          width="720"
          height="241"
          viewBox="0 0 720 241"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* SvgNode components with React props */}
          <SvgNode
            path="M1.00048 119.402L200.243 68.2732C213.283 65.4129 221.832 58.4923 221.832 50.7968V20.323V1"
            position={glowPosition}
            visible={glowVisible}
            dotColor={undefined}
            glowColor="#13B351"
          />
          <SvgNode
            path="M1.00048 136.779L231.212 68.7423C242.847 65.5523 250.195 59.0356 250.195 51.9076V20.323V1"
            position={glowPosition}
            visible={glowVisible}
            dotColor={undefined}
            glowColor="#13B351"
          />
          <SvgNode
            path="M1 165.731L263.267 69.1267C272.82 65.6348 278.558 59.7587 278.558 53.4667V20.323V1"
            position={glowPosition}
            visible={glowVisible}
            dotColor={undefined}
            glowColor="#13B351"
          />
          <SvgNode
            path="M719.001 154.23L464.019 69.1276C454.474 65.6348 448.743 59.7616 448.743 53.4731V20.323V1"
            position={glowPosition}
            visible={glowVisible}
            dotColor={undefined}
            glowColor="#13B351"
          />
          <SvgNode
            path="M719.001 125.219L496.078 68.7439C484.449 65.5528 477.106 59.0377 477.106 51.9119V20.323V1"
            position={glowPosition}
            visible={glowVisible}
            dotColor={undefined}
            glowColor="#13B351"
          />
          <SvgNode
            path="M719 107.817L527.05 68.2749C514.015 65.4134 505.469 58.4939 505.469 50.8001V20.323V1"
            position={glowPosition}
            visible={glowVisible}
            dotColor={undefined}
            glowColor="#13B351"
          />
          <SvgNode
            path="M719.001 96.2159L557.314 67.8323C543.291 65.2673 533.835 58.0756 533.835 49.976V20.323V9.78386C533.835 4.93267 529.902 1 525.051 1"
            position={glowPosition}
            visible={glowVisible}
            dotColor={undefined}
            glowColor="#13B351"
          />
          <SvgNode
            path="M1 107.817L169.982 67.8308C184.008 65.2668 193.467 58.0743 193.467 49.9735V20.323V9.78387C193.467 4.93267 197.4 1 202.251 1"
            position={glowPosition}
            visible={glowVisible}
            dotColor={undefined}
            glowColor="#13B351"
          />
          <SvgNode
            path="M306.924 1V20.323V55.7423C306.924 60.7337 303.306 65.5207 296.865 69.0509L62.8139 197.336C52.968 202.733 46.8471 213.068 46.8471 224.296V240.342"
            position={1 - glowPosition}
            visible={glowVisible}
            dotColor={undefined}
            glowColor="#13B351"
          />
          <SvgNode
            path="M335.286 1V20.323V59.0919C335.286 62.0155 334.043 64.8989 331.656 67.5136L213.175 197.282C208.003 202.947 205.136 210.34 205.136 218.011V240.342"
            position={1 - glowPosition}
            visible={glowVisible}
            dotColor={undefined}
            glowColor="#13B351"
          />
          <SvgNode
            path="M363.65 1V20.323L363.428 206.088V240.342"
            position={1 - glowPosition}
            visible={glowVisible}
            dotColor={undefined}
            glowColor="#13B351"
          />
          <SvgNode
            path="M392.015 1V20.323V59.1056C392.015 62.0204 393.25 64.8954 395.624 67.5041L513.712 197.291C518.862 202.951 521.716 210.328 521.716 217.981V240.342"
            position={1 - glowPosition}
            visible={glowVisible}
            dotColor={undefined}
            glowColor="#13B351"
          />
          <SvgNode
            path="M420.377 1V20.323V55.7518C420.377 60.7376 423.987 65.5197 430.415 69.0489L664.058 197.332C673.893 202.732 680.005 213.061 680.005 224.28V240.342"
            position={1 - glowPosition}
            visible={glowVisible}
            dotColor={undefined}
            glowColor="#13B351"
          />
        </svg>
        </div>
      </div>

      <div className="feature__meta meta--center">
        <div className="meta__title">{title}</div>
        <div className="meta__description">
          {description}
        </div>
      </div>
    </div>
  );
};

export default OptimizedPerformanceCard;
