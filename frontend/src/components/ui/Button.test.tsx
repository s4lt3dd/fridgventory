import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("forwards click events to onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    fireEvent.click(screen.getByRole("button", { name: "Click me" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables the button while loading and shows the spinner", () => {
    render(<Button loading>Saving</Button>);

    const button = screen.getByRole("button", { name: /saving/i });
    expect(button).toBeDisabled();
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Nope" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies the danger variant styling", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass(
      "bg-primary",
    );
  });
});
