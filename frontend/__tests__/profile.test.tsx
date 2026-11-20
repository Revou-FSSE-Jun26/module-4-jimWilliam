/**
 * Component tests for ProfileForm and ProfileHero (task 18.6, R36.9, R36.10).
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileHero } from "@/components/profile/ProfileHero";

const SAVED = { name: "Ana Novak", email: "ana@example.com" };
const USER_ID = "11111111-1111-4111-8111-111111111111";

/** The same wiring as /profile: the form's name and email drive the hero. */
function Harness({ onSave = jest.fn(async () => undefined) }: { onSave?: () => Promise<void> }) {
  const [name, setName] = useState(SAVED.name);
  const [email, setEmail] = useState(SAVED.email);
  return (
    <>
      <ProfileHero id={USER_ID} name={name} email={email} stats={{ boards: 2, admin: 1, openTasks: 3 }} />
      <ProfileForm
        saved={SAVED}
        name={name}
        email={email}
        onNameChange={setName}
        onEmailChange={setEmail}
        onSave={onSave}
        onReset={() => { setName(SAVED.name); setEmail(SAVED.email); }}
      />
    </>
  );
}

const hero = () => screen.getByRole("region", { name: "Profile summary" });
const heroInitials = () => hero().querySelector("[aria-hidden='true']")!.textContent;

describe("ProfileForm (R36.10)", () => {
  it("disables Save and Reset while the form matches the saved values", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("enables Save with the unsaved-changes indicator after an edit", async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText("Email"), "x");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes");
  });

  it("treats an edit that returns to the saved value as clean again", async () => {
    render(<Harness />);
    const name = screen.getByLabelText("Name");
    await userEvent.type(name, "!");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    await userEvent.type(name, "{Backspace}");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("Reset restores the saved values", async () => {
    render(<Harness />);
    const name = screen.getByLabelText("Name");
    const email = screen.getByLabelText("Email");
    await userEvent.clear(name);
    await userEvent.type(name, "Someone Else");
    await userEvent.clear(email);
    await userEvent.type(email, "someone@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(name).toHaveValue(SAVED.name);
    expect(email).toHaveValue(SAVED.email);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("validates before saving and does not call onSave with an invalid email", async () => {
    const onSave = jest.fn(async () => undefined);
    render(<Harness onSave={onSave} />);
    const email = screen.getByLabelText("Email");
    await userEvent.clear(email);
    await userEvent.type(email, "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText(/Enter an email address/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave once with a valid edit", async () => {
    const onSave = jest.fn(async () => undefined);
    render(<Harness onSave={onSave} />);
    await userEvent.type(screen.getByLabelText("Name"), " Lee");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe("ProfileHero (R36.8, R36.9)", () => {
  it("shows the avatar, name, email and activity chips", () => {
    render(<Harness />);
    expect(within(hero()).getByTestId("hero-name")).toHaveTextContent("Ana Novak");
    expect(within(hero()).getByText(SAVED.email)).toBeInTheDocument();
    expect(heroInitials()).toBe("AN");
    const chips = within(hero()).getByRole("list", { name: "Your activity" });
    expect(within(chips).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["2 Boards", "1 Admin of", "3 Open tasks"]);
  });

  it("updates the name and initials on every keystroke", async () => {
    render(<Harness />);
    const name = screen.getByLabelText("Name");
    await userEvent.clear(name);
    expect(within(hero()).getByTestId("hero-name")).toHaveTextContent("Your name");
    const typed = "Mia Tan";
    for (let i = 1; i <= typed.length; i++) {
      await userEvent.type(name, typed[i - 1]);
      const sofar = typed.slice(0, i);
      expect(within(hero()).getByTestId("hero-name")).toHaveTextContent(sofar.trim() ? sofar.trim() : "Your name"); // the matcher normalises whitespace
    }
    expect(heroInitials()).toBe("MT");
  });

  it("shows a placeholder dash while stats are loading", () => {
    render(<ProfileHero id={USER_ID} name="Ana" email="ana@example.com" stats={null} />);
    const chips = within(hero()).getByRole("list", { name: "Your activity" });
    expect(within(chips).getAllByRole("listitem").every((li) => li.textContent?.startsWith("–"))).toBe(true);
  });
});
