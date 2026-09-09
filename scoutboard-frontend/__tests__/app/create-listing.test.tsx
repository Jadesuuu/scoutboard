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

/** Fills every required field; cash flow is optional and left out. */
function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Business name"), {
    target: { value: "Copper Kettle" },
  });
  fireEvent.change(screen.getByLabelText("Location"), {
    target: { value: "NYC" },
  });
  fireEvent.change(screen.getByLabelText("Monthly revenue"), {
    target: { value: "5000" },
  });
  fireEvent.change(screen.getByLabelText("Year established"), {
    target: { value: "2015" },
  });
  fireEvent.change(screen.getByLabelText("Asking price"), {
    target: { value: "120000" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "A cozy cafe" },
  });
}

const publish = () =>
  fireEvent.click(screen.getByRole("button", { name: "Publish listing" }));

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

    publish();

    expect(screen.getByText("Business name is required")).toBeInTheDocument();
    expect(screen.getByText("Location is required")).toBeInTheDocument();
    expect(screen.getByText("Enter an asking price")).toBeInTheDocument();
    expect(screen.getByText("Enter monthly revenue")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid year")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ignores non-digit input in Year established instead of showing NaN", () => {
    vi.stubGlobal("fetch", vi.fn());
    renderForm();
    const year = screen.getByLabelText("Year established") as HTMLInputElement;

    // Starts blank (not "0") so the placeholder is visible.
    expect(year.value).toBe("");

    fireEvent.change(year, { target: { value: "20ab15" } });
    expect(year.value).toBe("2015");

    fireEvent.change(year, { target: { value: "abc" } });
    expect(year.value).toBe("");
    expect(year.value).not.toContain("NaN");

    // Capped at four digits.
    fireEvent.change(year, { target: { value: "201567" } });
    expect(year.value).toBe("2015");
  });

  it("rejects a year in the future", () => {
    vi.stubGlobal("fetch", vi.fn());
    renderForm();
    fillValidForm();
    fireEvent.change(screen.getByLabelText("Year established"), {
      target: { value: "3000" },
    });

    publish();

    expect(screen.getByText("Enter a valid year")).toBeInTheDocument();
    expect(screen.queryByText("Business name is required")).toBeNull();
  });

  it("rejects cash flow above revenue as a typo", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    renderForm();
    fillValidForm();
    fireEvent.change(screen.getByLabelText("Monthly cash flow"), {
      target: { value: "9999" }, // revenue is 5,000
    });

    publish();

    expect(screen.getByText("Cash flow can't exceed revenue")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POSTs the listing, resets the form, invalidates and toasts on success", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ _id: "new" }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    const { invalidateSpy } = renderForm();

    fillValidForm();
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "retail" },
    });
    publish();

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.test/listings",
      expect.objectContaining({ method: "POST" }),
    );
    // Cash flow was left blank, so it is absent rather than sent as 0.
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

  it("includes monthly cash flow when the seller supplies it", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ _id: "new" }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    renderForm();

    fillValidForm();
    fireEvent.change(screen.getByLabelText("Monthly cash flow"), {
      target: { value: "1500" },
    });
    publish();

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(
      JSON.parse(fetchSpy.mock.calls[0][1].body as string).monthlyCashFlow,
    ).toBe(1500);
  });

  it("falls back to the food industry when the category clears", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchSpy);
    renderForm();

    fillValidForm();
    // jsdom blanks a select whose value matches no option, exercising `|| "food"`.
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "" },
    });
    publish();

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body as string).industry).toBe(
      "food",
    );
  });

  it("toasts an error when the POST fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    renderForm();

    fillValidForm();
    publish();

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
