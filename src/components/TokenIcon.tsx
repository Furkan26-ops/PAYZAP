"use client";

import { useState } from 'react';

type TokenIconProps = {
  symbol: string;
  logo?: string;
  size?: number;
  className?: string;
};

export default function TokenIcon({
  symbol,
  logo,
  size = 24,
  className = '',
}: TokenIconProps) {
  const [failed, setFailed] = useState(false);

  if (!logo || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-arc-panelStrong text-[10px] font-bold text-arc-text border border-arc-border ${className}`}
        style={{ width: size, height: size }}
      >
        {symbol.slice(0, 3)}
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
