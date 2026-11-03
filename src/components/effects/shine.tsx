import type { CSSProperties, ReactNode } from "react";
import { keywordColors, resolveKeywords, splitKeywordText } from "../../lib/keywords/keywords";

export function ShineBorder({ keywordIds }: { keywordIds: readonly string[] }) {
  const colors = keywordColors(keywordIds);
  return (
    <span aria-hidden="true" className="shine-border">
      <span style={{ backgroundImage: `radial-gradient(${colors.join(", ")})` }} />
    </span>
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
