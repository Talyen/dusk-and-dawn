import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../cards/card";
import { Button, TabBar } from "../ui/controls";
import { anchorPage, getPagination } from "./pagination";

type Kind = "player" | "enemy";
const CARD_COUNT = 12;

export function CardBrowser() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<Kind>("player");
  const [columns, setColumns] = useState(4);
  const [paging, setPaging] = useState({ page: 0, pageSize: 8 });
  const gridRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const recovery = useRef<{ index: number; element: HTMLElement } | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const pageSize = columns * 2;
  const page = getPagination(
    CARD_COUNT,
    paging.pageSize === pageSize
      ? paging.page
      : recovery.current
        ? Math.floor(recovery.current.index / pageSize)
        : anchorPage(paging.page, paging.pageSize, pageSize, CARD_COUNT),
    pageSize,
  ).page;
  if (paging.page !== page || paging.pageSize !== pageSize) setPaging({ page, pageSize });
  const totalPages = getPagination(CARD_COUNT, page, pageSize).totalPages;

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const measure = measureRef.current;
    if (!grid || !measure) return;
    const update = () => {
      const width = measure.getBoundingClientRect().width;
      const gap = width / (kind === "player" ? 7.25 : 10);
      if (width > 0 && grid.clientWidth > 0) {
        const next = Math.max(1, Math.min(4, Math.floor((grid.clientWidth + gap + 0.5) / (width + gap))));
        if (next !== columns) {
          const active = document.activeElement;
          const item =
            active instanceof HTMLElement && active.matches(":focus-visible")
              ? active.closest<HTMLElement>("[data-card-index]")
              : null;
          if (item && active instanceof HTMLElement && grid.contains(item))
            recovery.current = { index: Number(item.dataset.cardIndex), element: active };
          setColumns(next);
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
    const safe = getPagination(CARD_COUNT, next, pageSize).page;
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
      <TabBar
        label={t("cardTypes")}
        tabs={[
          { id: "player", label: t("playerCards") },
          { id: "enemy", label: t("enemyCards") },
        ]}
        activeTab={kind}
        onSelectTab={(next) => {
          setKind(next);
          setPaging({ page: 0, pageSize });
        }}
      />
      <div className={`card-grid-shell card-grid-shell--${kind}`} ref={gridRef}>
        <span className="card-grid-measure" ref={measureRef} aria-hidden="true" />
        <div className="card-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: Math.min(pageSize, CARD_COUNT - page * pageSize) }, (_, index) => {
            const number = page * pageSize + index + 1;
            const title = t(kind === "player" ? "playerCardNumber" : "enemyCardNumber", { number });
            return (
              <div className="card-grid-item" data-card-index={number - 1} key={`${kind}-${number}`}>
                <Card
                  title={title}
                  description={t("placeholderDescription")}
                  aspect={kind === "player" ? "portrait" : "landscape"}
                />
                <p>{title}</p>
              </div>
            );
          })}
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
          ‹
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
          ›
        </Button>
      </nav>
    </>
  );
}
