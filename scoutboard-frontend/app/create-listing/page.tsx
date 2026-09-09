"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { INDUSTRIES } from "@/lib/listing";

interface createListingBody {
  title: string;
  askingPrice: number;
  industry: string;
  establishedYear: number;
  monthlyRevenue: number;
  /** Optional on the API too — omitted from the request when left blank. */
  monthlyCashFlow: number;
  location: string;
  description: string;
}

type FormErrors = Partial<Record<keyof createListingBody, string>>;

const EMPTY_FORM: createListingBody = {
  title: "",
  askingPrice: 0,
  industry: "food",
  establishedYear: 0,
  monthlyRevenue: 0,
  monthlyCashFlow: 0,
  location: "",
  description: "",
};

function validateForm(f: createListingBody) {
  const e: FormErrors = {};
  if (!f.title.trim()) e.title = "Business name is required";
  if (!f.location.trim()) e.location = "Location is required";
  if (f.askingPrice <= 0) e.askingPrice = "Enter an asking price";
  if (f.monthlyRevenue <= 0) e.monthlyRevenue = "Enter monthly revenue";
  if (
    !Number.isInteger(f.establishedYear) ||
    f.establishedYear < 1900 ||
    f.establishedYear > new Date().getFullYear()
  )
    e.establishedYear = "Enter a valid year";
  // Cash flow is optional, but a figure above revenue is a typo, not a business.
  if (f.monthlyCashFlow > 0 && f.monthlyCashFlow > f.monthlyRevenue)
    e.monthlyCashFlow = "Cash flow can't exceed revenue";
  return e;
}

const LABEL =
  "block text-[10.5px] font-extrabold tracking-[0.1em] text-faint uppercase";
const INPUT =
  "w-full rounded-[10px] border-[1.5px] border-line-strong bg-white px-3 py-3 text-[14.5px] text-ink focus:border-brand focus:outline-none";

export default function ListingForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<createListingBody>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: createListingBody) => {
      // `monthlyCashFlow` is optional on the API; send it only when given so a
      // blank field stays absent rather than becoming a real zero.
      const { monthlyCashFlow, ...rest } = formData;
      const body =
        monthlyCashFlow > 0 ? { ...rest, monthlyCashFlow } : { ...rest };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businessList"] });
      setForm(EMPTY_FORM);
      toast.success("Successfully registered your business", {
        position: "bottom-right",
      });
    },
    onError: () => {
      toast.error("Failed to register your business", {
        position: "bottom-right",
      });
    },
  });

  return (
    <div className="animate-sb-fade-in mx-auto max-w-[620px] px-4 py-8 sm:px-6 sm:py-12">
      <button
        type="button"
        className="text-quiet hover:text-brand mb-4 text-[13px] font-bold"
        onClick={() => router.back()}
      >
        ← Cancel
      </button>

      <h1 className="m-0 mb-2.5 text-[clamp(27px,5.5vw,38px)] leading-tight tracking-[-0.038em]">
        List your business
      </h1>
      <p className="text-quiet m-0 mb-7 text-[15.5px] leading-relaxed">
        Buyers on ScoutBoard filter on numbers first. Fill in what you can —
        revenue and cash flow drive the offers you get.
      </p>

      <div className="border-line bg-surface flex flex-col gap-4 rounded-2xl border p-5 sm:gap-[18px] sm:p-6">
        <div className="space-y-2">
          <label className={LABEL} htmlFor="name">
            Business name
          </label>
          <input
            value={form.title}
            id="name"
            maxLength={120}
            placeholder="The Copper Kettle"
            className={INPUT}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          {errors.title && <FieldError>{errors.title}</FieldError>}
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="min-w-0 flex-1 basis-40 space-y-2">
            <label className={LABEL} htmlFor="industry">
              Category
            </label>
            <select
              id="industry"
              value={form.industry}
              className={`${INPUT} cursor-pointer`}
              onChange={(e) =>
                setForm({ ...form, industry: e.target.value || "food" })
              }
            >
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 flex-1 basis-40 space-y-2">
            <label className={LABEL} htmlFor="location">
              Location
            </label>
            <input
              id="location"
              placeholder="Portland, OR"
              className={INPUT}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            {errors.location && <FieldError>{errors.location}</FieldError>}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="min-w-0 flex-1 basis-36 space-y-2">
            <label className={LABEL} htmlFor="askingPrice">
              Asking price
            </label>
            <input
              id="askingPrice"
              type="number"
              min={0}
              placeholder="145000"
              className={INPUT}
              value={form.askingPrice === 0 ? "" : form.askingPrice}
              onChange={(e) =>
                setForm({ ...form, askingPrice: Number(e.target.value) })
              }
            />
            {errors.askingPrice && <FieldError>{errors.askingPrice}</FieldError>}
          </div>

          <div className="min-w-0 flex-1 basis-36 space-y-2">
            <label className={LABEL} htmlFor="monthlyRevenue">
              Monthly revenue
            </label>
            <input
              id="monthlyRevenue"
              type="number"
              min={0}
              placeholder="22000"
              className={INPUT}
              value={form.monthlyRevenue === 0 ? "" : form.monthlyRevenue}
              onChange={(e) =>
                setForm({ ...form, monthlyRevenue: Number(e.target.value) })
              }
            />
            {errors.monthlyRevenue && (
              <FieldError>{errors.monthlyRevenue}</FieldError>
            )}
          </div>

          <div className="min-w-0 flex-1 basis-36 space-y-2">
            <label className={LABEL} htmlFor="monthlyCashFlow">
              Monthly cash flow
            </label>
            <input
              id="monthlyCashFlow"
              type="number"
              min={0}
              placeholder="5200"
              className={INPUT}
              value={form.monthlyCashFlow === 0 ? "" : form.monthlyCashFlow}
              onChange={(e) =>
                setForm({ ...form, monthlyCashFlow: Number(e.target.value) })
              }
            />
            {errors.monthlyCashFlow ? (
              <FieldError>{errors.monthlyCashFlow}</FieldError>
            ) : (
              <p className="text-faint text-[11.5px]">
                Optional — owner&apos;s take-home
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className={LABEL} htmlFor="yearEstablished">
            Year established
          </label>
          <input
            id="yearEstablished"
            placeholder="2016"
            inputMode="numeric"
            maxLength={4}
            className={`${INPUT} max-w-40`}
            value={form.establishedYear === 0 ? "" : form.establishedYear}
            onChange={(e) => {
              // Digits only, max 4: typing letters used to produce NaN.
              const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
              setForm({
                ...form,
                establishedYear: digits === "" ? 0 : Number(digits),
              });
            }}
          />
          {errors.establishedYear && (
            <FieldError>{errors.establishedYear}</FieldError>
          )}
        </div>

        <div className="space-y-2">
          <label className={LABEL} htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            placeholder="Staff, lease terms, equipment, why you're selling…"
            rows={4}
            maxLength={2000}
            className={`${INPUT} resize-y leading-relaxed`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            className="bg-brand hover:bg-brand-hover rounded-[10px] px-6 py-3 text-[14.5px] font-bold text-white transition-colors disabled:opacity-60"
            onClick={() => {
              const e = validateForm(form);
              setErrors(e);
              if (Object.keys(e).length === 0) mutate(form);
            }}
            disabled={isPending}
          >
            Publish listing
          </button>
          <button
            type="button"
            className="border-line-strong text-ink hover:border-muted rounded-[10px] border-[1.5px] bg-white px-5 py-3 text-[14.5px] font-bold transition-colors"
            onClick={() => router.back()}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-negative text-[12.5px] font-semibold">{children}</p>
  );
}
