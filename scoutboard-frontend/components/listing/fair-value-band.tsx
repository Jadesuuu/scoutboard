import { shortMoney } from "@/lib/format";

/**
 * Plots the asking price against the AI's fair-value range.
 *
 * A range and a price as two numbers make a reader do the comparison; drawn on
 * one axis, "above the range" is instant. The axis is padded past both ends so
 * a marker at an extreme still sits inside the track.
 */
export default function FairValueBand({
  low,
  high,
  askingPrice,
}: {
  low: number;
  high: number;
  askingPrice: number;
}) {
  const axisMin = Math.min(low, askingPrice) * 0.9;
  const axisMax = Math.max(high, askingPrice) * 1.05;
  const span = axisMax - axisMin || 1;

  const position = (value: number) =>
    Math.max(0, Math.min(100, ((value - axisMin) / span) * 100));

  const left = position(low);
  const width = Math.max(2, position(high) - left);
  const askPos = position(askingPrice);

  return (
    <div>
      <div className="eyebrow mb-1">Fair value range</div>
      <div className="tabular text-[18px] font-extrabold tracking-[-0.028em]">
        {shortMoney(low)} – {shortMoney(high)}
      </div>

      <div
        className="relative mt-3.5 h-1.5 rounded-full bg-[#e4e2da]"
        role="img"
        aria-label={`Fair value ${shortMoney(low)} to ${shortMoney(high)}, asking ${shortMoney(askingPrice)}`}
      >
        <div
          className="bg-band absolute top-0 bottom-0 rounded-full"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
        <div
          className="bg-ink absolute -top-1.5 -bottom-1.5 w-[2.5px] rounded-sm"
          style={{ left: `${askPos}%` }}
        />
      </div>

      <div className="text-faint mt-2 flex justify-between text-[10px] font-extrabold tracking-[0.07em] uppercase">
        <span>Fair range</span>
        <span className="text-ink">Asking</span>
      </div>
    </div>
  );
}
