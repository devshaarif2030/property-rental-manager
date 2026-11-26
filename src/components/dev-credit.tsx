import Image from "next/image";

export function DevCredit() {
  return (
    <a
      href="https://devshaarif.com"
      target="_blank"
      rel="noopener"
      className="dev-credit glass-light fixed right-3 bottom-3 z-30 flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs text-muted-foreground shadow-card transition-colors hover:text-foreground sm:right-4 sm:bottom-4"
    >
      <Image src="/devshaarif.png" alt="" width={24} height={24} className="size-6 rounded-full" />
      <span>
        Developed by <span className="font-semibold text-foreground">devshaarif.com</span>
      </span>
    </a>
  );
}
