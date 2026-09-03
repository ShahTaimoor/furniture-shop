import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Lightweight scroll-reveal wrapper.
 * Adds a smooth fade + rise as the element enters the viewport.
 *
 * Props:
 *  - as: element/component to render (default 'div')
 *  - delay: 1..4 -> staggered transition-delay
 *  - once: reveal a single time (default true)
 */
const Reveal = React.forwardRef(function Reveal(
  { as: Tag = 'div', delay = 0, once = true, className, children, ...rest },
  forwardedRef
) {
  const innerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = innerRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  const setRefs = (node) => {
    innerRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  return (
    <Tag
      ref={setRefs}
      className={cn(
        'reveal',
        delay >= 1 && `reveal-delay-${Math.min(delay, 4)}`,
        visible && 'is-visible',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export default Reveal;
