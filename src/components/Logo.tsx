export default function Logo({ size = 48 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full bg-evify-yellow shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        className="font-extrabold text-evify-teal tracking-tight"
        style={{ fontSize: size * 0.34 }}
      >
        EV
      </span>
    </div>
  );
}
