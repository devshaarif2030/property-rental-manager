import Image from "next/image";

export function DevCredit() {
  return (
    <a
      href="https://devshaarif.com"
      target="_blank"
      rel="noopener"
      className="dev-credit glass-light fixed right-2 bottom-2 z-30 flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 text-[10px] sm:gap-2 sm:py-1 sm:pr-3 sm:pl-1 sm:text-xs text-muted-foreground shadow-card transition-colors hover:text-foreground sm:right-4 sm:bottom-4"
    >
      <Image src="/devshaarif.png" alt="" width={24} height={24} className="size-5 rounded-full sm:size-6" />
      <span>
        Developed by <span className="font-semibold text-foreground">devshaarif.com</span>
      </span>
    </a>
  );
}
