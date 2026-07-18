"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface createListingBody {
  title: string;
  askingPrice: number;
  industry: string;
  establishedYear: number;
  monthlyRevenue: number;
  location: string;
  description: string;
}

type FormErrors = Partial<Record<keyof createListingBody, string>>;

function validateForm(f: createListingBody) {
  const e: FormErrors = {};
  if (!f.title.trim()) e.title = "Business name is required";
  if (!f.location.trim()) e.location = "Location is required";
  if (f.askingPrice <= 0) e.askingPrice = "Enter an asking price";
  if (f.monthlyRevenue <= 0) e.monthlyRevenue = "Enter monthly revenue";
  if (f.establishedYear < 1900 || f.establishedYear > 2026)
    e.establishedYear = "Enter a valid year";
  return e;
}

export default function ListingForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<createListingBody>({
    title: "",
    askingPrice: 0,
    industry: "food",
    establishedYear: 0,
    monthlyRevenue: 0,
    location: "",
    description: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: createListingBody) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businessList"] });
      setForm({
        title: "",
        askingPrice: 0,
        industry: "food",
        establishedYear: 0,
        monthlyRevenue: 0,
        location: "",
        description: "",
      });
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
    <div className="mx-auto min-w-2xl max-w-2xl px-6 py-10">
      {/* Cancel link */}
      <a
        className="text-sm text-stone-400 hover:text-stone-600"
        onClick={() => router.back()}
      >
        ← Cancel
      </a>

      {/* Heading */}
      <h1 className="mt-6 font-serif text-3xl text-stone-900">
        List your business
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        A few basics to get started. You can add more later.
      </p>

      {/* Form */}
      <div className="mt-8 space-y-6">
        {/* Business name */}
        <div className="space-y-2">
          <Label htmlFor="name">Business name</Label>
          <Input
            value={form.title}
            id="name"
            maxLength={120}
            placeholder="e.g. The Copper Kettle"
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          {errors.title && (
            <p className="text-xs text-red-500">{errors.title}</p>
          )}
        </div>

        {/* Category + Location side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.industry}
              onValueChange={(value) =>
                setForm({ ...form, industry: value ?? "food" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Coffee Shop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="tech">Tech</SelectItem>
                <SelectItem value="others">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="City, State"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            {errors.location && (
              <p className="text-xs text-red-500">{errors.location}</p>
            )}
          </div>
        </div>

        {/* Monthly Revenue + Year Established */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Monthly Revenue</Label>
            <div className="relative">
              <span className=" absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                $
              </span>
              <Input
                id="price"
                type="number"
                placeholder="400"
                className="pl-7"
                min={1}
                value={form.monthlyRevenue}
                onChange={(e) =>
                  setForm({ ...form, monthlyRevenue: Number(e.target.value) })
                }
              />
            </div>
            {errors.monthlyRevenue && (
              <p className="text-xs text-red-500">{errors.monthlyRevenue}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearEstablished">Year Established</Label>
            <Input
              id="yearEstablished"
              placeholder="2000"
              maxLength={4}
              min={1900}
              value={form.establishedYear}
              onChange={(e) =>
                setForm({ ...form, establishedYear: Number(e.target.value) })
              }
            />
            {errors.establishedYear && (
              <p className="text-xs text-red-500">{errors.establishedYear}</p>
            )}
          </div>
        </div>

        {/* Asking price */}
        <div className="space-y-2">
          <Label htmlFor="price">Asking price</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
              $
            </span>
            <Input
              id="price"
              type="number"
              placeholder="120000"
              className="pl-7"
              min={1}
              value={form.askingPrice}
              onChange={(e) =>
                setForm({ ...form, askingPrice: Number(e.target.value) })
              }
            />
          </div>
          {errors.askingPrice && (
            <p className="text-xs text-red-500">{errors.askingPrice}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="What makes this business special? Regulars, location, what's included..."
            rows={4}
            maxLength={2000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            className="bg-[#c0603a] text-white hover:bg-[#a85230] rounded-lg"
            onClick={() => {
              const e = validateForm(form);
              setErrors(e);
              if (Object.keys(e).length === 0) mutate(form);
            }}
            disabled={isPending}
          >
            Publish listing
          </Button>
          <Button
            className="rounded-lg"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
