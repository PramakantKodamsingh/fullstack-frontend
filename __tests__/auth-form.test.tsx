import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/app/components/auth-form";
import { ApiError, login, register, saveToken } from "@/lib/auth";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  login: vi.fn(),
  register: vi.fn(),
  saveToken: vi.fn(),
}));

const authResponse = {
  accessToken: "token-123",
  user: { id: 1, email: "john@gmail.com", name: "John", createdAt: "2026-01-01T00:00:00.000Z" },
};

function fillIn(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("AuthForm in login mode", () => {
  it("should show email and password fields but no name field", () => {
    render(<AuthForm mode="login" />);

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeDefined();
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
    expect(screen.queryByLabelText(/name/i)).toBeNull();
  });

  it("should log in, save the token and go to the home page", async () => {
    vi.mocked(login).mockResolvedValue(authResponse);
    render(<AuthForm mode="login" />);

    fillIn(/email/i, "john@gmail.com");
    fillIn(/password/i, "supersecret123");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(login).toHaveBeenCalledWith("john@gmail.com", "supersecret123");
    expect(saveToken).toHaveBeenCalledWith("token-123");
  });

  it("should show the error message and stay on the page when login fails", async () => {
    vi.mocked(login).mockRejectedValue(new ApiError("Invalid email or password", 401));
    render(<AuthForm mode="login" />);

    fillIn(/email/i, "john@gmail.com");
    fillIn(/password/i, "wrongpassword");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Invalid email or password");
    expect(saveToken).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    // The button is usable again so the user can retry
    expect(screen.getByRole("button", { name: "Sign in" }).hasAttribute("disabled")).toBe(false);
  });

  it("should disable the button while the request is in flight", async () => {
    vi.mocked(login).mockReturnValue(new Promise(() => {}));
    render(<AuthForm mode="login" />);

    fillIn(/email/i, "john@gmail.com");
    fillIn(/password/i, "supersecret123");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const button = await screen.findByRole("button", { name: "Signing in…" });
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("should link to the register page", () => {
    render(<AuthForm mode="login" />);

    expect(screen.getByRole("link", { name: "Create one" }).getAttribute("href")).toBe("/register");
  });
});

describe("AuthForm in register mode", () => {
  it("should register with the name, save the token and go to the home page", async () => {
    vi.mocked(register).mockResolvedValue(authResponse);
    render(<AuthForm mode="register" />);

    fillIn(/name/i, "  John  ");
    fillIn(/email/i, "john@gmail.com");
    fillIn(/password/i, "supersecret123");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(register).toHaveBeenCalledWith("john@gmail.com", "supersecret123", "John");
    expect(saveToken).toHaveBeenCalledWith("token-123");
  });

  it("should register without a name when it is left empty", async () => {
    vi.mocked(register).mockResolvedValue(authResponse);
    render(<AuthForm mode="register" />);

    fillIn(/email/i, "john@gmail.com");
    fillIn(/password/i, "supersecret123");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(register).toHaveBeenCalled());
    expect(register).toHaveBeenCalledWith("john@gmail.com", "supersecret123", undefined);
  });

  it("should show the error when the email is already in use", async () => {
    vi.mocked(register).mockRejectedValue(
      new ApiError("Email john@gmail.com is already in use", 409),
    );
    render(<AuthForm mode="register" />);

    fillIn(/email/i, "john@gmail.com");
    fillIn(/password/i, "supersecret123");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Email john@gmail.com is already in use",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("should link to the login page", () => {
    render(<AuthForm mode="register" />);

    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
  });
});
