import React, { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    // Only activate custom cursor on devices with mouse/pointer
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    let mouseX = -100;
    let mouseY = -100;
    let cursorX = -100;
    let cursorY = -100;
    let animationFrameId: number;

    const checkInteractive = (target: HTMLElement | null): boolean => {
      if (!target) return false;

      // Tag name check
      const tagName = target.tagName ? target.tagName.toUpperCase() : '';
      if (['INPUT', 'TEXTAREA', 'SELECT', 'A', 'BUTTON', 'LABEL', 'OPTION'].includes(tagName)) {
        return true;
      }

      // Ancestor check
      if (
        target.closest(
          'button, a, input, textarea, select, label, [role="button"], [role="link"], [contenteditable="true"], .cursor-pointer, .cursor-text, .cursor-grab, .cursor-grabbing'
        ) !== null
      ) {
        return true;
      }

      // Computed style check
      try {
        const computed = window.getComputedStyle(target).cursor;
        if (
          computed &&
          computed !== 'none' &&
          computed !== 'default' &&
          computed !== 'auto'
        ) {
          return true;
        }
      } catch (e) {
        // ignore
      }

      return false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      const overInteractive = checkInteractive(e.target as HTMLElement);
      setIsInteractive(overInteractive);

      if (!isVisible) setIsVisible(true);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    const animate = () => {
      cursorX += (mouseX - cursorX) * 0.85;
      cursorY += (mouseY - cursorY) * 0.85;

      if (cursorRef.current) {
        cursorRef.current.style.left = `${cursorX}px`;
        cursorRef.current.style.top = `${cursorY}px`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isVisible]);

  // Show custom cursor only when visible and NOT over an interactive element that uses a native cursor
  const showCursor = isVisible && !isInteractive;

  return (
    <div
      ref={cursorRef}
      id="custom-cursor"
      className={`${showCursor ? 'visible' : ''} ${isClicking ? 'clicking' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '22px',
        height: '22px',
        pointerEvents: 'none',
        zIndex: 999999,
        transform: 'translate(-1px, -1px)',
        transition: 'transform 0.05s ease-out, opacity 0s',
        willChange: 'transform',
        opacity: showCursor ? 1 : 0,
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full block drop-shadow-sm">
        <path
          d="M4 4 L20 11 L12.5 13 L10 19 Z"
          fill="#000000"
          stroke="#000000"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
