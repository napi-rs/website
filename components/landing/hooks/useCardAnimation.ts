import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

/**
 * Options for the card animation hook
 */
interface CardAnimationOptions {
  /**
   * If true, animation runs only once and won't reset after completion
   */
  once?: boolean;
}

/**
 * Return type of the useCardAnimation hook
 */
interface CardAnimationReturn {
  startAnimation: () => void;
  isCardActive: boolean;
}

export function useCardAnimation(
  selector: string,
  animation?: () => gsap.core.Timeline,
  options?: CardAnimationOptions
): CardAnimationReturn {
  // Register ScrollTrigger plugin once
  gsap.registerPlugin(ScrollTrigger);

  // State to track if the card is in an active animated state
  const [isCardActive, setIsCardActive] = useState<boolean>(false);

  // Ref to track if animation is currently running (prevents overlapping animations)
  const [isAnimationRunning, setIsAnimationRunning] = useState<boolean>(false);

  // Refs to store GSAP timeline and ScrollTrigger instances
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  /**
   * Starts the card animation, managing state and preventing concurrent animations
   */
  const startAnimation = useCallback(() => {
    // Exit if animation is already running exists
    if (isAnimationRunning) return;

    // Mark animation as running and activate card state
    setIsAnimationRunning(true)
    setIsCardActive(true);

    // Exit if no animation
    if (!animation) return;

    // Clean up existing timeline if it exists
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    // Create new timeline and add animation
    timelineRef.current = gsap.timeline({
      onComplete: () => {
        // Reset state after animation completes (unless "once" option is true)
        if (!options?.once) {
          setIsCardActive(false);
          // Prevent new animations immediately after completion
          setTimeout(() => {
            setIsAnimationRunning(false);
          }, 3000);
        }
      }
    });

    timelineRef.current.add(animation());

  }, [animation]);

  /**
   * Set up scroll trigger for mobile devices when component mounts
   * Clean up animations and triggers when component unmounts
   */
  useEffect(() => {
    // Get target element using the provided selector
    const getTargetElement = (): HTMLElement | null => {
      return document.querySelector(selector);
    };

    const targetElement = getTargetElement();
    if (!targetElement) {
      console.warn(`useCardAnimation: No element found for selector "${selector}"`);
      return;
    }

    // Set up scroll trigger for mobile devices (<768px)
    if (window.innerWidth < 768) {
      scrollTriggerRef.current = ScrollTrigger.create({
        trigger: targetElement,
        start: 'top 60%', // Trigger when element top reaches 60% viewport height
        onEnter: () => {
          startAnimation();
        },
      });
    }

    /**
     * Cleanup function to remove animations and event listeners
     * Prevents memory leaks when component unmounts
     */
    return () => {
      // Kill scroll trigger if it exists
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill();
        scrollTriggerRef.current = null;
      }

      // Kill animation timeline if it exists
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }

      // Reset animation state
      setIsAnimationRunning(false);
    };
  }, [selector]);

  return {
    startAnimation,
    isCardActive
  };
}
