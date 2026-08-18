import React, { useMemo } from 'react';
import { cn } from '../../core/utils';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  /** Color when trend is positive (default: emerald) */
  positiveColor?: string;
  /** Color when trend is negative (default: rose) */
  negativeColor?: string;
  className?: string;
  /** Show last value next to chart */
  showValue?: boolean;
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  data = [], width = 120, height = 30,
  positiveColor = '#10b981', negativeColor = '#ef4444',
  className, showValue = true,
}) => {
  const { path, isPositive, lastVal } = useMemo(() => {
    if (data.length < 2) return { path: '', isPositive: true, lastVal: data[0] || 0 };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    });

    const last = data[data.length - 1];
    const first = data[0];
    return {
      path: `M${points.join(' L')}`,
      isPositive: last >= first,
      lastVal: last,
    };
  }, [data, width, height]);

  const color = isPositive ? positiveColor : negativeColor;

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <svg
        width={width} height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="flex-shrink-0"
        aria-label={`Trend: ${isPositive ? 'up' : 'down'}, value: ${lastVal}`}
        role="img"
      >
        {/* Fill area */}
        <path
          d={`${path} L${width},${height} L0,${height} Z`}
          fill={color}
          fillOpacity={0.1}
        />
        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End dot */}
        {data.length > 0 && (
          <circle
            cx={width} cy={height - ((lastVal - Math.min(...data)) / (Math.max(...data) - Math.min(...data) || 1)) * (height - 4) - 2}
            r={2.5}
            fill={color}
          />
        )}
      </svg>
      {showValue && (
        <span className="text-[10px] font-bold font-mono text-[var(--app-text)]">
          {lastVal.toLocaleString('en-US')}
        </span>
      )}
    </div>
  );
};

export default SparklineChart;
