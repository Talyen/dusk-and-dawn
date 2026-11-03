import type { ComponentProps, ReactNode } from "react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
};

export function Button({
  variant = "primary",
  size = "default",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`}
      {...props}
    />
  );
}

export function Surface({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`ui-surface ${className}`} {...props} />;
}

export function SurfaceButton({ className = "", type = "button", ...props }: ComponentProps<"button">) {
  return <button type={type} className={`ui-surface ui-surface--button ${className}`} {...props} />;
}

type SwitchProps = Omit<ComponentProps<"input">, "type" | "onChange" | "checked"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({ checked, onCheckedChange, className = "", ...props }: SwitchProps) {
  return (
    <span className={`ui-switch ${className}`}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        {...props}
      />
      <span aria-hidden="true" />
    </span>
  );
}

type ProgressProps = Omit<ComponentProps<"div">, "aria-label" | "aria-labelledby"> & {
  value: number;
} & (
    | { "aria-label": string; "aria-labelledby"?: never }
    | { "aria-labelledby": string; "aria-label"?: never }
  );

export function Progress({ value, className = "", ...props }: ProgressProps) {
  const percent = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className={`ui-progress ${className}`}
      {...props}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

export function ScreenShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main className={`ui-screen ${className}`}>
      {children}
      <div id="tooltip-root" />
    </main>
  );
}

interface TabBarProps<T extends string> {
  label: string;
  tabs: readonly { id: T; label: string; disabled?: boolean }[];
  activeTab: T;
  onSelectTab: (id: T) => void;
}

/** A group of immediate view choices, following Alchemy's pressed-button navigation. */
export function TabBar<T extends string>({ label, tabs, activeTab, onSelectTab }: TabBarProps<T>) {
  return (
    <div className="ui-tab-bar" role="group" aria-label={label}>
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant="outline"
          aria-pressed={tab.id === activeTab}
          disabled={tab.disabled}
          onClick={() => onSelectTab(tab.id)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
