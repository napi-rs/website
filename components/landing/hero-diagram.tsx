'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/dist/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import { SvgNodeProps } from './ui/SvgNode';
import SvgInputs from './ui/SvgInputs';
import SvgOutputs from './ui/SvgOutputs';
import SvgBlueIndicator from './ui/SvgBlueIndicator';
import SvgPinkIndicator from './ui/SvgPinkIndicator';

const logo = '/img/favicon.png';

// Register GSAP plugins
gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);

interface InputFile {
  label: string;
  color?: string;
}

// Input path definitions
const inputPaths: string[] = [
  'M843.505 284.659L752.638 284.659C718.596 284.659 684.866 280.049 653.251 271.077L598.822 255.629L0.675021 1.00011',
  'M843.505 298.181L724.342 297.36C708.881 297.36 693.45 296.409 678.22 294.518L598.822 284.659C592.82 284.659 200.538 190.002 0.675028 164.892',
  'M843.505 311.703L701.108 310.061L598.822 305.136L0.675049 256.071',
  'M843.505 325.224L598.822 326.002L0.675049 321.858',
  'M843.505 338.746L701.108 340.388L598.822 345.442L0.675038 387.646',
  'M843.505 352.268L724.342 353.088C708.881 353.088 693.45 354.039 678.22 355.93L598.822 365.789L0.675067 478.825',
  'M843.505 365.789L752.638 365.789C718.596 365.789 684.866 370.399 653.251 379.372L598.822 394.82L0.675049 642.717',
];

export const HeroDiagram: React.FC = () => {
  // State management
  const [inputLines, setInputLines] = useState<SvgNodeProps[]>(
    inputPaths.map(path => ({
      position: 0,
      visible: false,
      labelVisible: false,
      label: '',
      path,
    }))
  );

  const [inputFileSets] = useState<InputFile[][]>([
    // [
    //   { label: '.jsx' },
    //   { label: '.sass' },
    //   { label: '.svelte', color: '#ff8d67' },
    // ],
    // [{ label: '.tsx' }, { label: '.scss' }, { label: '.vue', color: '#40b782' }],
    // [
    //   { label: '.js' },
    //   { label: '.styl' },
    //   { label: '.svelte', color: '#ff8d67' },
    // ],
    // [{ label: '.ts' }, { label: '.less' }, { label: '.vue', color: '#40b782' }],
    // [{ label: '.mts' }, { label: '.html' }, { label: '.json' }],
    [
      { label: 'Rust Crates', color: '#b7410e' }, { label: 'Node.js', color: '#5BAC47' }, { label: 'C/C++', color: '#6295CB' },
    ]
  ]);

  const [outputLines, setOutputLines] = useState<SvgNodeProps[]>([
    { position: 0, visible: false, labelVisible: false, label: 'Browser' },
    { position: 0, visible: false, labelVisible: false, label: 'Node/Bun/Deno' },
    { position: 0, visible: false, labelVisible: false, label: 'React Native' },
  ]);

  const [blueIndicator, setBlueIndicator] = useState(false);
  const [pinkIndicator, setPinkIndicator] = useState(false);
  const [illuminateLogo, setIlluminateLogo] = useState(false);
  const [isChromiumBrowser, setIsChromiumBrowser] = useState(false);
  const [isUwu, setIsUwu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Refs
  const scrollTriggerInstance = useRef<ScrollTrigger | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const heroDiagramRef = useRef<HTMLDivElement>(null);

  // Update input line helper
  const updateInputLine = (index: number, updates: Partial<SvgNodeProps>) => {
    setInputLines(prev =>
      prev.map((line, i) => i === index ? { ...line, ...updates } : line)
    );
  };

  // Update output line helper
  const updateOutputLine = (index: number, updates: Partial<SvgNodeProps>) => {
    setOutputLines(prev =>
      prev.map((line, i) => i === index ? { ...line, ...updates } : line)
    );
  };

  // Prepare random input lines with file labels
  const prepareInputs = (): number[] => {
    const inputFileSet = inputFileSets[Math.floor(Math.random() * inputFileSets.length)];
    const inputLineIndexes = new Set<number>();

    // Ensure we get 3 unique line indexes
    while (inputLineIndexes.size < 3) {
      const index = Math.floor(Math.random() * inputLines.length);
      inputLineIndexes.add(index);
    }

    const inputs = Array.from(inputLineIndexes);
    inputs.forEach((lineIndex, fileIndex) => {
      const file = inputFileSet[fileIndex];
      if (file) {
        updateInputLine(lineIndex, {
          label: file.label,
          dotColor: file.color,
          glowColor: file.color,
        });
      }
    });

    return inputs;
  };

  // Animation: Desktop input line
  const animateSingleInputDesktop = (lineIndex: number) => {
    const tl = gsap.timeline();
    const startPos = 0;
    const midPos = Math.random() * 0.1 + 0.4;
    const endPos = 1;

    tl.call(() => updateInputLine(lineIndex, { position: startPos }), null, 0)
      .to({}, {
        duration: 1,
        ease: 'expo.out',
        onUpdate: function(this: gsap.core.Tween) {
          updateInputLine(lineIndex, {
            position: startPos + (midPos - startPos) * this.progress()
          });
        },
      }, 0)
      .call(() => updateInputLine(lineIndex, { visible: true }), null, 0)
      .call(() => updateInputLine(lineIndex, { labelVisible: true }), null, 0.2)
      .to({}, {
        duration: 1.2,
        ease: 'power3.in',
        onUpdate: function(this: gsap.core.Tween) {
          updateInputLine(lineIndex, {
            position: midPos + (endPos - midPos) * this.progress()
          });
        },
      }, 1.2)
      .call(() => updateInputLine(lineIndex, { labelVisible: false }), null, 1.6)
      .call(() => updateInputLine(lineIndex, { visible: false }), null, 1.9);

    return tl;
  };

  // Animation: Mobile input line
  const animateSingleInputMobile = (lineIndex: number) => {
    const tl = gsap.timeline();
    const startPos = 0;
    const endPos = 1;

    tl.call( () => updateInputLine(lineIndex, { position: startPos }), null, 0)
      .to({}, {
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: function(this: gsap.core.Tween) {
          updateInputLine(lineIndex, {
            position: startPos + (endPos - startPos) * this.progress()
          });
        },
      }, 0)
      .call(() => updateInputLine(lineIndex, { visible: true }), null, 0)
      .call(() => updateInputLine(lineIndex, { visible: false }), null, 0.5);

    return tl;
  };

  // Animation: Desktop output line
  const animateSingleOutputDesktop = (lineIndex: number, index: number) => {
    const tl = gsap.timeline();
    const startPos = 0;
    const midPos = (0.7 / 3) * (index + 1) + 0.05;
    const endPos = 1;

    tl.call( () => updateOutputLine(lineIndex, { position: startPos }), null, 0)
      .to({}, {
        duration: 1.5,
        ease: 'expo.out',
        onUpdate: function(this: gsap.core.Tween) {
          updateOutputLine(lineIndex, {
            position: startPos + (midPos - startPos) * this.progress()
          });
        },
      }, 0)
      .call( () => updateOutputLine(lineIndex, { visible: true }), null,0)
      .call( () => updateOutputLine(lineIndex, { labelVisible: true }), null,0.4)
      .to({}, {
        duration: 1.5,
        ease: 'power3.in',
        onUpdate: function(this: gsap.core.Tween) {
          updateOutputLine(lineIndex, {
            position: midPos + (endPos - midPos) * this.progress()
          });
        },
      }, 2)
      .call( () => updateOutputLine(lineIndex, { labelVisible: false }), null,2.5)
      .call( () => updateOutputLine(lineIndex, { visible: false }), null, 3);

    return tl;
  };

  // Animation: Mobile output line
  const animateSingleOutputMobile = (lineIndex: number) => {
    const tl = gsap.timeline();
    const startPos = 0;
    const endPos = 0.7;

    tl.call(() => updateOutputLine(lineIndex, { position: startPos }), null, 0)
      .to({}, {
        duration: 2,
        ease: 'power1.inOut',
        onUpdate: function(this: gsap.core.Tween) {
          updateOutputLine(lineIndex, {
            position: startPos + (endPos - startPos) * this.progress()
          });
        },
      }, 0.3)
      .call(() => updateOutputLine(lineIndex, { visible: true }), null, 0.75)
      .call(() => updateOutputLine(lineIndex, { visible: false }), null, 1.2);

    return tl;
  };

  // Core animation sequence
  const animateDiagram = () => {
    timeline.current = gsap.timeline({
      onComplete: animateDiagram,
    });

    // Animate input lines
    const inputIndices = prepareInputs();
    inputIndices.forEach((lineIndex, fileIndex) => {
      timeline.current!.add(
        isMobile ? animateSingleInputMobile(lineIndex) : animateSingleInputDesktop(lineIndex),
        fileIndex * (isMobile ? 0.4 : 0.2)
      );
    });

    // Animate indicators and logo
    timeline.current
      .call(() => setBlueIndicator(true), null, isMobile ? '>-2' : '>-0.2')
      .call(() => setIlluminateLogo(true), null, '<-0.3')
      .call(() => setPinkIndicator(true), null, '<+0.3');

    // Animate output lines
    timeline.current.addLabel('showOutput', '<');
    outputLines.forEach((_, index) => {
      timeline.current!.add(
        isMobile ? animateSingleOutputMobile(index) : animateSingleOutputDesktop(index, index),
        `showOutput+=${(isMobile ? 0.3 : 0.1) * index}`
      );
    });

    // Desktop-only reset
    if (!isMobile) {
      timeline.current
        // Disable the colored indicators
        .call(() => setBlueIndicator(false), null, '>-1')
        .call(() => setPinkIndicator(false), null, '<')
        // Pause briefly at the end of the animation
        .call(() => {}, null, '+=0.2');
    }
  };

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize on mount
  useEffect(() => {
    // Browser detection
    setIsChromiumBrowser(!!(window as any).chrome);
    setIsUwu(window.location.search.includes('?uwu'));

    // Scroll trigger setup
    scrollTriggerInstance.current = ScrollTrigger.create({
      trigger: heroDiagramRef.current,
      start: 'center 100%',
      once: true,
      onEnter: animateDiagram,
    });

    // Cleanup
    return () => {
      scrollTriggerInstance.current?.kill();
      timeline.current?.kill();
    };
  }, []);

  return (
    <>
      <div className="hero__diagram" id="hero-diagram" ref={heroDiagramRef}>
        <SvgInputs inputLines={inputLines} />
        <SvgOutputs outputLines={outputLines} />
        <SvgBlueIndicator active={blueIndicator} />
        <SvgPinkIndicator active={pinkIndicator} />

        <div className={`brand-chip ${illuminateLogo ? 'active' : ''}`}>
          <div className="brand-chip__background">
            <div className="brand-chip__border" />
            <div
              className={`brand-chip__edge ${isChromiumBrowser ? 'edge--animated' : ''}`}
            />
          </div>
          <div className="brand-chip__filter" />
          <img
            src={logo}
            alt="NAPI-RS Logo"
            className="brand-chip__logo"
          />
        </div>
      </div>

      {/* Background */}
      <div className={`hero__background ${illuminateLogo ? 'active' : ''}`} />
    </>
  );
};

export default HeroDiagram;
