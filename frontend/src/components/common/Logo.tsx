import { cn } from '../../utils/cn';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function Logo({ className, size = 'md', animated = true }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn(
      'relative flex items-center justify-center',
      sizeClasses[size],
      className
    )}>
      {/* Animated gradient background - Bright vibrant colors */}
      <div className={cn(
        'absolute inset-0 rounded-2xl',
        'bg-gradient-to-br from-[#74B9FF] via-[#A29BFE] to-[#00CEC9]',
        animated && 'animate-pulse-soft',
        'shadow-lg shadow-[#74B9FF]/40'
      )} />
      
      {/* Shine effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
      
      {/* SVG Icon - Download with play button */}
      <svg
        viewBox="0 0 64 64"
        className={cn(
          'relative z-10 w-full h-full',
          animated && 'animate-bounce-subtle'
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#F0F0F0', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Download arrow */}
        <path
          d="M 32 12 L 32 40 M 24 32 L 32 40 L 40 32"
          stroke="url(#logoGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Play button circle */}
        <circle
          cx="32"
          cy="50"
          r="8"
          fill="url(#logoGradient)"
          opacity="0.9"
        />
        <path
          d="M 28 50 L 28 46 L 36 50 L 28 54 Z"
          fill="#FFFFFF"
        />
        
        {/* Bottom line */}
        <line
          x1="20"
          y1="48"
          x2="44"
          y2="48"
          stroke="url(#logoGradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

