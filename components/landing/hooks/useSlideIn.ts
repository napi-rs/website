import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

/**
 * React Hook to animate an element sliding in when it enters the viewport.
 * @param {string} selector - CSS selector for the target element (e.g., ".slide-in-element").
 */
export function useSlideIn(selector: HTMLElement | string) {
  // Store the GSAP animation instance to clean up on unmount
  const animationRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    // Register ScrollTrigger plugin (ensure it's registered only once)
    gsap.registerPlugin(ScrollTrigger);

    // Simulate Vue's nextTick to ensure DOM is updated before animating
    const timer = setTimeout(() => {
      // Create the slide-in animation
      animationRef.current = gsap.to(selector, {
        x: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: selector,
          start: 'top 100%', // Animation starts when element top hits bottom of viewport
          once: true, // Only animate once
        },
      });
    }, 0);

    // Cleanup function: kill animation and scroll trigger when component unmounts
    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, [selector]); // Re-run effect if selector changes
}
