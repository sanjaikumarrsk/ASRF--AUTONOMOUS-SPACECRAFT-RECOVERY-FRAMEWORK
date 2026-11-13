import React from 'react';
import './ImageCredit.css';

const ImageCredit = ({ source, credit, position = 'bottom-right' }) => {
  return (
    <div className={`image-credit credit-${position}`}>
      <span className="credit-text">
        {source && <span className="credit-source">{source}</span>}
        {source && credit && <span className="credit-sep">|</span>}
        {credit && <span className="credit-author">Image: {credit}</span>}
      </span>
    </div>
  );
};

export default ImageCredit;
