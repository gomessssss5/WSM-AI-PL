import React from 'react';

interface PacmanLoadingAnimationProps {
  className?: string;
  text?: string;
}

export default function PacmanLoadingAnimation({ className, text = "Omnix 1.6 está trabalhando..." }: PacmanLoadingAnimationProps = {}) {
  return (
    <div className={`wsm-response-card ${className || ''}`}>
      <div className="wsm-body-text" style={{ paddingLeft: '0px' }}>
        <div className="wsm-thinking-state">
          <span className="shimmer-text">{text}</span>
        </div>
      </div>
    </div>
  );
}
