import Image from "next/image";

/** The MOSAIC logo: the mark and/or the wordmark (alt text carries the name once). */
export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return <Image src="/brand/mark.png" alt="" width={192} height={181} className={`object-contain ${className}`} priority unoptimized />;
}

export function BrandWordmark({ className = "h-3.5 w-auto" }: { className?: string }) {
  return <Image src="/brand/wordmark.png" alt="MOSAIC" width={337} height={56} className={className} priority unoptimized />;
}

export function BrandLockup() {
  return (
    <span className="flex flex-col items-center gap-3">
      <Image src="/brand/mark-lg.png" alt="" width={419} height={395} className="h-24 w-auto drop-shadow-[0_10px_24px_rgba(120,110,200,0.25)]" priority unoptimized />
      <BrandWordmark className="h-7 w-auto" />
    </span>
  );
}
