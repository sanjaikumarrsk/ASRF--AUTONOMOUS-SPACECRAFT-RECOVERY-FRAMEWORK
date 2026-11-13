import React from 'react';
import './PageBanner.css';

export default function PageBanner({ eyebrow, title, description, image, children, className = '' }) {
  return (
    <section className={`page-banner ${className}`}>
      <img className="page-banner-image" src={image} alt="" aria-hidden="true" />
      <div className="page-banner-content">
        {eyebrow && <span className="page-banner-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {children && <div className="page-banner-actions">{children}</div>}
      </div>
      <div className="page-banner-status"><span></span> SIMULATION MODE · STANDALONE</div>
    </section>
  );
}
