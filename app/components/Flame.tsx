export default function Flame({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transformOrigin: 'center bottom', overflow: 'visible' }}
    >
      {/* outer flame */}
      <path
        d="M12 1 C12 1 20 9 20 17 C20 23.6 16.4 29 12 29 C7.6 29 4 23.6 4 17 C4 9 12 1 12 1Z"
        fill="url(#flameOuter)"
        style={{
          transformOrigin: 'center bottom',
          animation: 'flame-outer 1.8s ease-in-out infinite',
        }}
      />
      {/* mid flame */}
      <path
        d="M12 8 C12 8 17.5 14 17.5 19 C17.5 23 15 27 12 27 C9 27 6.5 23 6.5 19 C6.5 14 12 8 12 8Z"
        fill="url(#flameMid)"
        style={{
          transformOrigin: 'center bottom',
          animation: 'flame-mid 1.3s ease-in-out infinite',
        }}
      />
      {/* bright core */}
      <path
        d="M12 15 C12 15 15 18 15 21 C15 23.8 13.7 26 12 26 C10.3 26 9 23.8 9 21 C9 18 12 15 12 15Z"
        fill="url(#flameCore)"
        style={{
          transformOrigin: 'center bottom',
          animation: 'flame-core 0.9s ease-in-out infinite',
        }}
      />
      <defs>
        <linearGradient id="flameOuter" x1="12" y1="1" x2="12" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="flameMid" x1="12" y1="8" x2="12" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id="flameCore" x1="12" y1="15" x2="12" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
      </defs>
    </svg>
  )
}
