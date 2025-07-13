import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import cx from 'classnames';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SvgNode } from '../ui/SvgNode';

// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Define component props type
interface FeatureSectionProps {
  title: string;
  description?: string;
  type?: 'orange' | 'pink';
  children?: React.ReactNode;
  className?: string;
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({
  title,
  description,
  type = 'orange',
  className,
  children,
}) => {
  // State for animation control
  const [animationPercentage, setAnimationPercentage] = useState(0);
  const [animationVisible, setAnimationVisible] = useState(false);

  // Reference for GSAP timeline
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Reference for the section DOM element
  const sectionRef = useRef<HTMLDivElement>(null);

  /**
   * Initializes the animation when the component mounts
   * Sets up a scroll-triggered animation using GSAP
   */
  useEffect(() => {
    const startAnimation = () => {
      if (!sectionRef.current) return;

      // Create GSAP timeline with scroll trigger
      timelineRef.current = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current, // Element to watch for scroll
          start: 'top 80%', // Animation starts when section top hits 80% viewport height
          once: true,
        },
      })
        // First animation step: make animation visible
        .call(() => {
          setAnimationVisible(true);
        }, undefined, 0)
        // Second animation step: animate percentage value
        .to(
          { value: 0 },
          {
            value: 0.55,
            duration: 2,
            ease: 'expo.out',
            // Update state with animation progress
            onUpdate: function () {
              setAnimationPercentage(this.targets()[0].value);
            },
          },
          0 // Start at time 0 (same as previous step)
        );
    };

    // Start animation when component mounts
    startAnimation();

    // Cleanup function to kill animation when component unmounts
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      // Clean up scroll trigger
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.trigger === sectionRef.current) {
          trigger.kill();
        }
      });
    };
  }, [sectionRef.current]);

  return (
    <section
      ref={sectionRef}
      className={cx("feature-section", className)}
      id={`feature_section_${type}`}
    >
      {/* Section Title Container */}
      <div className="feature-section__title">
        {/* SVG Graphic with animation elements */}
        <div data-lg-reveal="fade-rotate-to-right">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="70"
          height="61"
          viewBox="0 0 70 61"
          fill="none"
          style={{ overflow: 'visible' }}
        >
          {/* Static background lines */}
          <path
            d="M38.5 0.772461V60.5215M22.6301 60.7725V38.7905C22.6301 25.3784 17.3675 12.5156 8 3.03184M54.3699 60.7725V38.7905C54.3699 25.3784 59.6325 12.5156 69 3.03184"
            stroke="url(#linear-gradient-bg-lines)"
            strokeWidth="2"
          />

          {/* Animated SVG node for orange type */}
          {type === 'orange' && (
            <SvgNode
              id="orange_node"
              path="M22.6301 80.7725V38.7905C22.6301 25.3784 17.3675 12.5156 8 3.03184L-20 -20"
              position={animationPercentage}
              visible={animationVisible}
              dotColor="#f3b84c"
              glowColor="#f3b84c"
            />
          )}

          {/* Animated SVG node for pink type */}
          {type === 'pink' && (
            <SvgNode
              id="pink_node"
              path="M54.3699 80.7725V38.7905C54.3699 25.3784 59.6325 12.5156 69 3.03184L90 -20"
              position={animationPercentage}
              visible={animationVisible}
              dotColor="#ce9bf4"
              glowColor="#BD34FE"
            />
          )}

          {/* SVG definitions for gradients */}
          <defs>
            <linearGradient
              id="linear-gradient-bg-lines"
              x1="38.5"
              y1="0.772461"
              x2="38.5"
              y2="60.7725"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#404040" stopOpacity="0" />
              <stop offset="0.5" stopColor="#737373" />
              <stop offset="1" stopColor="#404040" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        </div>

        {/* Section title with dynamic color based on type */}
        <div data-lg-reveal="heading">
        <h2
          style={{
            // @ts-ignore
            '--text-color': type === 'orange' ? 'var(--theme)' : '#BD34FE'
          }}
        >
          {title}
        </h2>
        </div>

        {/* Optional section description */}
        {description && <h3 data-lg-reveal="text">{description}</h3>}
      </div>

      {/* Grid container for feature cards */}
      <div className="feature-section__grid">
        {/* Slot content - will render child components */}
        {children}
      </div>
    </section>
  );
};
