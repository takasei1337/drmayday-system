/**
 * Skeleton — DR. MAYDAY Design System
 * Animated shimmer loading placeholder.
 */

const BASE_STYLE = {
  backgroundColor: 'var(--color-neutral-100, #F1F5F9)',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '4px',
};

function SkeletonBase({ width, height, style = {}, className = '' }) {
  return (
    <>
      <span
        className={`skeleton ${className}`}
        style={{ display: 'block', width, height, ...BASE_STYLE, ...style }}
        aria-hidden="true"
      />
      <style>{`
        .skeleton::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--color-neutral-0, #fff) 50%,
            transparent 100%
          );
          opacity: 0.5;
          animation: shimmer 1.4s infinite;
          transform: translateX(-100%);
        }
        @keyframes shimmer {
          to { transform: translateX(100%); }
        }
      `}</style>
    </>
  );
}

export function Skeleton({
  variant = 'rect',
  width,
  height,
  lines = 3,
  className = '',
}) {
  if (variant === 'text') {
    return (
      <div className={`skeleton-text ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBase
            key={i}
            width={i === lines - 1 && lines > 1 ? '70%' : (width || '100%')}
            height={height || '16px'}
            style={{ borderRadius: '4px' }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circle') {
    const d = width || height || '40px';
    return (
      <SkeletonBase
        width={d}
        height={d}
        className={className}
        style={{ borderRadius: '50%' }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`skeleton-card ${className}`}
        style={{
          ...BASE_STYLE,
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: width || '100%',
          height: height || 'auto',
        }}
      >
        <SkeletonBase width="40px" height="40px" style={{ borderRadius: '50%' }} />
        <SkeletonBase width="60%" height="16px" />
        <SkeletonBase width="100%" height="12px" />
        <SkeletonBase width="85%" height="12px" />
      </div>
    );
  }

  // rect (default)
  return (
    <SkeletonBase
      width={width || '100%'}
      height={height || '16px'}
      className={className}
      style={{ borderRadius: 'var(--radius-sm, 4px)' }}
    />
  );
}

export default Skeleton;
