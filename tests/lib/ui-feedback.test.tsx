// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const play = vi.hoisted(() => vi.fn().mockResolvedValue(null));
vi.mock("../../src/lib/settings/settings", () => ({ audio: { play } }));
import { Button } from "../../src/components/ui/controls";
import { configureUiSounds } from "../../src/lib/feedback/ui-feedback";

afterEach(() => {
  cleanup();
  configureUiSounds({});
  play.mockClear();
});

it("plays registered confirmation cues only for enabled actions", () => {
  configureUiSounds({ confirm: "confirm.ogg" });
  const action = vi.fn();
  render(
    <>
      <Button cue="confirm" onClick={action}>
        Confirm
      </Button>
      <Button cue="confirm" aria-disabled="true" onClick={action}>
        Locked
      </Button>
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Locked" }));
  expect(play).not.toHaveBeenCalled();
  expect(action).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  expect(play).toHaveBeenCalledWith("confirm.ogg", "sound");
  expect(action).toHaveBeenCalledOnce();
});
