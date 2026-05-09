import Image from "next/image";

type LogoVariant = "lockup" | "icon" | "stacked";

interface LogoProps {
  variant?: LogoVariant;
  /** Override the rendered height in px. Defaults: lockup 36, icon 32, stacked 96. */
  height?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}

const VARIANT_DEFAULTS: Record<
  LogoVariant,
  { height: number; width: number; light: string; dark: string }
> = {
  // intrinsic SVG aspect ratios — pulled from /public assets
  lockup: {
    height: 36,
    width: 144, // ~4:1
    light: "/roosta-lockup.svg",
    dark: "/roosta-lockup-dark.svg",
  },
  icon: {
    height: 32,
    width: 32,
    light: "/roosta-icon.svg",
    dark: "/roosta-icon-dark.svg",
  },
  stacked: {
    height: 96,
    width: 96,
    light: "/roosta-stacked.svg",
    dark: "/roosta-stacked-dark.svg",
  },
};

export function Logo({
  variant = "lockup",
  height,
  className = "",
  priority = false,
  alt = "Roosta",
}: LogoProps) {
  const cfg = VARIANT_DEFAULTS[variant];
  const h = height ?? cfg.height;
  const w = Math.round((h / cfg.height) * cfg.width);

  return (
    <span className={`inline-flex items-center ${className}`}>
      {/* Light variant — hidden in dark mode */}
      <Image
        src={cfg.light}
        alt={alt}
        width={w}
        height={h}
        priority={priority}
        className="block dark:hidden"
        style={{ height: h, width: "auto" }}
      />
      {/* Dark variant — shown only in dark mode */}
      <Image
        src={cfg.dark}
        alt={alt}
        width={w}
        height={h}
        priority={priority}
        className="hidden dark:block"
        style={{ height: h, width: "auto" }}
      />
    </span>
  );
}
