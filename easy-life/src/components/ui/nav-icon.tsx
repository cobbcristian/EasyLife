import { cn } from "@/lib/utils";
import { navIconForLucide, navIconPaths, type NavIconKey } from "@/lib/nav-icons";

interface NavIconProps {
  name: NavIconKey | string;
  className?: string;
  active?: boolean;
}

const activeFilter = "brightness(0) invert(1)";
const inactiveFilter =
  "brightness(0) saturate(100%) invert(27%) sepia(89%) saturate(2476%) hue-rotate(197deg) brightness(97%) contrast(101%)";

function NavIconImg({ src, active }: { src: string; active?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      className="h-5 w-5 shrink-0"
      style={{ filter: active ? activeFilter : inactiveFilter }}
    />
  );
}

export function NavIcon({ name, className, active }: NavIconProps) {
  const key: NavIconKey =
    name in navIconPaths ? (name as NavIconKey) : navIconForLucide(name);

  return (
    <span className={cn("inline-flex", className)}>
      <NavIconImg src={navIconPaths[key]} active={active} />
    </span>
  );
}
