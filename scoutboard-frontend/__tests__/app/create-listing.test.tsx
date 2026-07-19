import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ListingForm from "@/app/create-listing/page";

const { routerBack, toast } = vi.hoisted(() => ({
  routerBack: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: routerBack }),
}));

// The vendored Select wraps a portal-heavy primitive that's awkward in jsdom.
// Replace it with a minimal control that exercises the page's onValueChange
// callback — including the `value ?? "food"` fallback.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    onValueChange,
    children,
  }: {
    onValueChange: (v: string | undefined) => void;
    children: React.ReactNode;
  }) => (
    <div>
      <button type="button" onClick={() => onValueChange("retail")}>
        choose retail
      </button>
      <button type="button" onClick={() => onValueChange(undefined)}>
        choose nothing
      </button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => null,
}));

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <QueryClientProvider client={queryClient}>
      <ListingForm />
    </QueryClientProvider>,
  );
  return { invalidateSpy };
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Business name"), {
    target: { value: "Copper Kettle" },
  });
  fireEvent.change(screen.getByLabelText("Location"), {
    target: { value: "NYC" },
  });
  // Two "$" number inputs share id="price"; target by placeholder instead.
  fireEvent.change(screen.getByPlaceholderText("400"), {
    target: { value: "5000" },
  });
  fireEvent.change(screen.getByLabelText("Year Established"), {
    target: { value: "2015" },
  });
  fireEvent.change(screen.getByPlaceholderText("120000"), {
    target: { value: "120000" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "A cozy cafe" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("ListingForm", () => {
  it("renders the heading", () => {
    renderForm();
    expect(screen.getByText("List your business")).toBeInTheDocument();
  });

  it("shows validation errors and does not POST when the form is empty", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Publish listing" }));

    expect(screen.getByText("Business name is required")).toBeInTheDocument();
    expect(screen.getByText("Location is required")).toBeInTheDocument();
    expect(screen.getByText("Enter an asking price")).toBeInTheDocument();
    expect(screen.getByText("Enter monthly revenue")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid year")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a year in the future", () => {
    vi.stubGlobal("fetch", vi.fn());
    renderForm();
    fillValidForm();
    fireEvent.change(screen.getByLabelText("Year Established"), {
      target: { value: "3000" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Publish listing" }));

    expect(screen.getByText("Enter a valid year")).toBeInTheDocument();
    expect(screen.queryByText("Business name is required")).toBeNull();
  });

  it("POSTs the listing, resets the form, invalidates and toasts on success", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ _id: "new" }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    const { invalidateSpy } = renderForm();

    fillValidForm();
    fireEvent.click(screen.getByText("choose retail")); // industry select
    fireEvent.click(screen.getByRole("button", { name: "Publish listing" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.test/listings",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body as string)).toEqual({
      title: "Copper Kettle",
      askingPrice: 120000,
      industry: "retail",
      establishedYear: 2015,
      monthlyRevenue: 5000,
      location: "NYC",
      description: "A cozy cafe",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["businessList"] });
    // Form reset
    expect(screen.getByLabelText("Business name")).toHaveValue("");
  });

  it("falls back to the food industry when the select clears", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchSpy);
    renderForm();

    fillValidForm();
    fireEvent.click(screen.getByText("choose nothing")); // value ?? "food"
    fireEvent.click(screen.getByRole("button", { name: "Publish listing" }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(
      JSON.parse(fetchSpy.mock.calls[0][1].body as string).industry,
    ).toBe("food");
  });

  it("toasts an error when the POST fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    renderForm();

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Publish listing" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("navigates back from the cancel link and Cancel button", () => {
    renderForm();

    fireEvent.click(screen.getByText("← Cancel"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(routerBack).toHaveBeenCalledTimes(2);
  });
});
