import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { itemsApi } from "@/api/items";
import type { PantryItem } from "@/types";
import { useItems } from "./useItems";

vi.mock("@/api/items", () => ({
  itemsApi: {
    list: vi.fn(),
  },
}));

function makeItem(overrides: Partial<PantryItem>): PantryItem {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    household_id: "h1",
    name: "Item",
    category: "other",
    quantity: 1,
    unit: "unit",
    added_date: "2026-05-01",
    expiry_date: "2026-05-10",
    added_by: "u1",
    urgency: "fresh",
    ...overrides,
  };
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.mocked(itemsApi.list).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useItems", () => {
  it("fetches items for the given household and exposes them", async () => {
    const items: PantryItem[] = [
      makeItem({ id: "1", name: "Milk", urgency: "today" }),
      makeItem({ id: "2", name: "Bread", urgency: "fresh" }),
    ];
    vi.mocked(itemsApi.list).mockResolvedValueOnce(items);

    const { result } = renderHook(() => useItems("h1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(itemsApi.list).toHaveBeenCalledWith("h1");
    expect(result.current.data).toEqual(items);
  });

  it("groups returned items by urgency", async () => {
    const expired = makeItem({ id: "e", name: "Yogurt", urgency: "expired" });
    const today = makeItem({ id: "t", name: "Milk", urgency: "today" });
    const thisWeek = makeItem({
      id: "w",
      name: "Cheese",
      urgency: "this_week",
    });
    const fresh = makeItem({ id: "f", name: "Apples", urgency: "fresh" });
    vi.mocked(itemsApi.list).mockResolvedValueOnce([
      expired,
      today,
      thisWeek,
      fresh,
    ]);

    const { result } = renderHook(() => useItems("h1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.grouped.expired).toEqual([expired]);
    expect(result.current.grouped.today).toEqual([today]);
    expect(result.current.grouped.this_week).toEqual([thisWeek]);
    expect(result.current.grouped.fresh).toEqual([fresh]);
  });

  it("does not fetch when householdId is empty", () => {
    const { result } = renderHook(() => useItems(""), {
      wrapper: createWrapper(),
    });

    expect(itemsApi.list).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
    expect(result.current.grouped).toEqual({
      expired: [],
      today: [],
      this_week: [],
      fresh: [],
    });
  });
});
