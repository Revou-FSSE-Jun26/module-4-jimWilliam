import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BaseBadge } from "@/components/shared/BaseBadge";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseModal } from "@/components/shared/BaseModal";

describe("BaseButton (R20.1, R20.4)", () => {
  it.each(["primary", "secondary", "destructive"] as const)("renders the %s variant", (variant) => {
    render(<BaseButton variant={variant}>Save</BaseButton>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("data-variant", variant);
  });

  it("calls onClick when enabled", async () => {
    const onClick = jest.fn();
    render(<BaseButton onClick={onClick}>Save</BaseButton>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("ignores clicks while disabled", async () => {
    const onClick = jest.fn();
    render(<BaseButton disabled onClick={onClick}>Save</BaseButton>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("shows the loading label and is busy while loading", () => {
    render(<BaseButton loading loadingLabel="Saving…">Save</BaseButton>);
    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });
});

describe("BaseBadge (R20.2)", () => {
  it.each(["neutral", "info", "success", "warning", "danger"] as const)("renders the %s color", (color) => {
    render(<BaseBadge color={color}>3</BaseBadge>);
    expect(screen.getByText("3")).toHaveAttribute("data-color", color);
  });
});

describe("BaseModal (R20.3, R16.6)", () => {
  function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
      <BaseModal open={open} title="New board" onClose={onClose}>
        <label htmlFor="n">Board name</label>
        <input id="n" data-autofocus />
      </BaseModal>
    );
  }

  it("is a native dialog named by its title, without role or aria-modal overrides", () => {
    render(<Harness open onClose={jest.fn()} />);
    const dialog = document.querySelector("dialog")!;
    expect(dialog).toHaveAttribute("open");
    expect(dialog).not.toHaveAttribute("role");
    expect(dialog).not.toHaveAttribute("aria-modal");
    expect(screen.getByRole("heading", { name: "New board" }).id).toBe(dialog.getAttribute("aria-labelledby"));
  });

  it("focuses the marked field when it opens", () => {
    render(<Harness open onClose={jest.fn()} />);
    expect(screen.getByLabelText("Board name")).toHaveFocus();
  });

  it("closes with the close control", async () => {
    const onClose = jest.fn();
    render(<Harness open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close New board" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the browser closes it with Escape", () => {
    const onClose = jest.fn();
    render(<Harness open onClose={onClose} />);
    // A native Escape fires the dialog's close event; jsdom has no key handling for dialogs.
    fireEvent(document.querySelector("dialog")!, new Event("close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when `open` becomes false", () => {
    const { rerender } = render(<Harness open onClose={jest.fn()} />);
    rerender(<Harness open={false} onClose={jest.fn()} />);
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
  });
});
