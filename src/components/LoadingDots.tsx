interface LoadingDotsProps {
  label?: string;
  className?: string;
}

export default function LoadingDots({ label = 'Loading', className = '' }: LoadingDotsProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {label}
      <span className="inline-flex gap-0.5">
        <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1 h-1 rounded-full bg-current animate-bounce" />
      </span>
    </span>
  );
}
