import { useId, type CSSProperties, type ReactNode } from "react";
import { keywordColors, resolveKeywords, splitKeywordText } from "../../lib/keywords/keywords";

export function ShineBorder({ keywordIds }: { keywordIds: readonly string[] }) {
  const colors = keywordColors(keywordIds);
  const gradientId = useId();
  return (
    <svg aria-hidden="true" className="shine-border">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          {colors.map((color, index) => (
            <stop
              key={index}
              offset={`${(index / (colors.length - 1)) * 100}%`}
              stopColor={color}
              style={
                {
                  "--shine-a": color,
                  "--shine-b": colors[(index + 1) % colors.length],
                  "--shine-c": colors[(index + 2) % colors.length],
                } as CSSProperties
              }
            />
          ))}
        </linearGradient>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        rx="calc(1.875 * var(--ui-unit))"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
      />
    </svg>
  );
}

export function ShineText({ keywordIds, children }: { keywordIds: readonly string[]; children: ReactNode }) {
  const colors = resolveKeywords(keywordIds)
    .slice(0, 3)
    .map((keyword) => keyword.primary);
  if (!colors.length) return <>{children}</>;
  const band = [...colors, "#ffffff"].join(", ");
  const style: CSSProperties = {
    backgroundImage: `linear-gradient(in oklab 90deg, ${band}, ${band}, ${colors[0]})`,
    WebkitTextStroke: 0,
  };
  return (
    <span className="shine-text" style={style}>
      {children}
    </span>
  );
}

export function KeywordDescription({
  text,
  labels,
}: {
  text: string;
  labels: readonly { id: string; label: string }[];
}) {
  return (
    <>
      {splitKeywordText(text, labels).map((part, index) =>
        part.keywordId ? (
          <ShineText key={index} keywordIds={[part.keywordId]}>
            {part.text}
          </ShineText>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
