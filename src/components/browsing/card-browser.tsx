import { useLayoutEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../cards/card";
import { Icon } from "../navigation/icons";
import { Button, TabBar } from "../ui/controls";
import { anchorPage, getPagination } from "./pagination";
import { collectionItems, type CollectionEntry, type CollectionKind } from "../../lib/collection/catalog";
import { resolveKeywords } from "../../lib/keywords/keywords";

type Kind = CollectionKind;
export interface CollectionViewState {
  kind: Kind;
  pages: Record<Kind, { page: number; pageSize: number }>;
}
export const initialCollectionView: CollectionViewState = {
  kind: "cards",
  pages: { cards: { page: 0, pageSize: 8 }, enemies: { page: 0, pageSize: 6 } },
};

export function CardBrowser({
  header,
  discoveredIds,
  catalog,
  view,
  setView,
  onInspectChange,
}: {
  header?: ReactNode;
  discoveredIds: ReadonlySet<string>;
  catalog: readonly CollectionEntry[];
  view: CollectionViewState;
  setView: Dispatch<SetStateAction<CollectionViewState>>;
  onInspectChange: (id: string, keywords: readonly string[] | null) => void;
}) {
  const { t } = useTranslation();
  const { kind, pages } = view;
  const [columnCounts, setColumnCounts] = useState<Record<Kind, number>>({ cards: 4, enemies: 3 });
  const columns = columnCounts[kind];
  const paging = pages[kind];
  const setPaging = (next: { page: number; pageSize: number }) =>
    setView((current) => ({ ...current, pages: { ...current.pages, [kind]: next } }));
  const items = collectionItems(kind, discoveredIds, catalog);
  const itemCount = items.length;
  const gridRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const recovery = useRef<{ index: number; element: HTMLElement } | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const pageSize = columns * 2;
  const page = getPagination(
    itemCount,
    paging.pageSize === pageSize
      ? paging.page
      : recovery.current
        ? Math.floor(recovery.current.index / pageSize)
        : anchorPage(paging.page, paging.pageSize, pageSize, itemCount),
    pageSize,
  ).page;
  useLayoutEffect(() => {
    if (paging.page !== page || paging.pageSize !== pageSize)
      setView((current) => ({ ...current, pages: { ...current.pages, [kind]: { page, pageSize } } }));
  }, [paging.page, paging.pageSize, page, pageSize, kind, setView]);
  const totalPages = getPagination(itemCount, page, pageSize).totalPages;

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const measure = measureRef.current;
    if (!grid || !measure) return;
    const update = () => {
      const width = measure.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(grid.querySelector(".card-grid")!).rowGap) || 0;
      if (width > 0 && grid.clientWidth > 0) {
        const next = Math.max(
          1,
          Math.min(kind === "cards" ? 4 : 3, Math.floor((grid.clientWidth + gap + 0.5) / (width + gap))),
        );
        if (next !== columns) {
          const active = document.activeElement;
          const item =
            active instanceof HTMLElement && active.matches(":focus-visible")
              ? active.closest<HTMLElement>("[data-card-index]")
              : null;
          if (item && active instanceof HTMLElement && grid.contains(item))
            recovery.current = { index: Number(item.dataset.cardIndex), element: active };
          setColumnCounts((current) => ({ ...current, [kind]: next }));
        }
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(grid);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [kind, columns]);

  useLayoutEffect(() => {
    const pending = recovery.current;
    if (!pending) return;
    if (
      !pending.element.isConnected &&
      (document.activeElement === document.body || document.activeElement === pending.element)
    )
      gridRef.current?.querySelector<HTMLElement>(`[data-card-index="${pending.index}"] .game-card`)?.focus();
    recovery.current = null;
  }, [columns, page]);

  function changePage(next: number) {
    const safe = getPagination(itemCount, next, pageSize).page;
    setPaging({ page: safe, pageSize });
    if (
      safe === totalPages - 1 &&
      document.activeElement === nextRef.current &&
      nextRef.current?.matches(":focus-visible")
    )
      requestAnimationFrame(() => {
        if (document.activeElement === document.body || document.activeElement === nextRef.current)
          previousRef.current?.focus();
      });
    if (
      safe === 0 &&
      document.activeElement === previousRef.current &&
      previousRef.current?.matches(":focus-visible")
    )
      requestAnimationFrame(() => {
        if (document.activeElement === document.body || document.activeElement === previousRef.current)
          nextRef.current?.focus();
      });
  }

  return (
    <>
      {header && (
        <div
          className="collection-header"
          style={{
            width: `min(100%, calc(${columns} * var(--collection-card-width) + ${columns - 1} * var(--ui-unit)))`,
          }}
        >
          {header}
        </div>
      )}
      <TabBar
        label={t("cardTypes")}
        tabs={[
          { id: "cards", label: t("cards") },
          { id: "enemies", label: t("enemies") },
        ]}
        activeTab={kind}
        onSelectTab={(next) => {
          setView((current) => ({ ...current, kind: next }));
        }}
      />
      <div
        className={`card-grid-shell card-grid-shell--${kind === "cards" ? "player" : "enemy"}`}
        ref={gridRef}
      >
        <span className="card-grid-measure" ref={measureRef} aria-hidden="true" />
        <div className="card-grid">
          {Array.from(
            { length: Math.ceil(Math.min(pageSize, Math.max(0, itemCount - page * pageSize)) / columns) },
            (_, row) => (
              <div className="card-grid-row" key={row}>
                {items
                  .slice(
                    page * pageSize + row * columns,
                    Math.min((page + 1) * pageSize, page * pageSize + (row + 1) * columns),
                  )
                  .map((item, offset) => {
                    const index = page * pageSize + row * columns + offset;
                    const label = item.discovered
                      ? t(item.titleKey, { number: item.number })
                      : t(kind === "cards" ? "undiscoveredCardNumber" : "undiscoveredEnemyNumber", {
                          number: item.number,
                        });
                    return (
                      <div className="card-grid-item" data-card-index={index} key={item.id}>
                        <Card
                          entryId={item.id}
                          tooltipSide={offset < columns / 2 ? "left" : "right"}
                          title={label}
                          description={
                            item.discovered
                              ? t(item.descriptionKey, {
                                  keywords: resolveKeywords(item.keywordIds)
                                    .map((keyword) => t(keyword.labelKey))
                                    .join(", "),
                                })
                              : t("undiscoveredDescription")
                          }
                          {...(item.art ? { art: item.art } : {})}
                          aspect={kind === "cards" ? "portrait" : "landscape"}
                          keywordIds={item.keywordIds}
                          discovered={item.discovered}
                          onInspectChange={onInspectChange}
                        />
                      </div>
                    );
                  })}
              </div>
            ),
          )}
        </div>
      </div>
      <nav className="pagination" aria-label={t("cardPages")}>
        <Button
          ref={previousRef}
          size="icon"
          variant="outline"
          aria-label={t("previousPage")}
          disabled={page === 0}
          onClick={() => changePage(page - 1)}
        >
          <Icon name="previous" />
        </Button>
        <span aria-live="polite">{t("pageOf", { page: page + 1, total: totalPages })}</span>
        <Button
          ref={nextRef}
          size="icon"
          variant="outline"
          aria-label={t("nextPage")}
          disabled={page === totalPages - 1}
          onClick={() => changePage(page + 1)}
        >
          <Icon name="next" />
        </Button>
      </nav>
    </>
  );
}
