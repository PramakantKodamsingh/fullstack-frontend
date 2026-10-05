import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  clearToken,
  fetchMe,
  getToken,
  login,
  register,
  saveToken,
  subscribeToken,
} from "@/lib/auth";

const user = {
  id: 1,
  email: "john@gmail.com",
  name: "John",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("login", () => {
  it("should POST the credentials and return the token and user", async () => {
    const fetchMock = mockFetch(200, { accessToken: "token-123", user });

    const result = await login("john@gmail.com", "supersecret123");

    expect(result).toEqual({ accessToken: "token-123", user });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "john@gmail.com", password: "supersecret123" }),
      headers: { "Content-Type": "application/json" },
    });
  });

  it("should throw an ApiError with the server's message", async () => {
    mockFetch(401, { message: "Invalid email or password", statusCode: 401 });

    const error = await login("john@gmail.com", "wrong").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Invalid email or password");
    expect(error.status).toBe(401);
  });

  it("should join validation messages that come as an array", async () => {
    mockFetch(400, {
      message: ["email must be an email", "password should not be empty"],
      statusCode: 400,
    });

    await expect(login("bad", "")).rejects.toThrow(
      "email must be an email. password should not be empty",
    );
  });

  it("should use a fallback message when the response has no body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new SyntaxError("Unexpected end of JSON")),
      }),
    );

    await expect(login("john@gmail.com", "supersecret123")).rejects.toThrow(
      "Something went wrong. Please try again.",
    );
  });
});

describe("register", () => {
  it("should include the name when given", async () => {
    const fetchMock = mockFetch(201, { accessToken: "token-123", user });

    await register("john@gmail.com", "supersecret123", "John");

    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/auth/register");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: "john@gmail.com",
      password: "supersecret123",
      name: "John",
    });
  });

  it("should leave out the name when it is empty", async () => {
    const fetchMock = mockFetch(201, { accessToken: "token-123", user });

    await register("john@gmail.com", "supersecret123");

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: "john@gmail.com",
      password: "supersecret123",
    });
  });
});

describe("fetchMe", () => {
  it("should send the token as a Bearer header", async () => {
    const fetchMock = mockFetch(200, user);

    await expect(fetchMe("token-123")).resolves.toEqual(user);
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/auth/me");
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      Authorization: "Bearer token-123",
    });
  });
});

describe("token storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should save, read and clear the token", () => {
    expect(getToken()).toBeNull();

    saveToken("token-123");
    expect(getToken()).toBe("token-123");

    clearToken();
    expect(getToken()).toBeNull();
  });

  it("should notify subscribers when the token changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToken(listener);

    saveToken("token-123");
    clearToken();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    saveToken("token-456");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
