import { PlatformLogo } from "@/components/ui/PlatformLogo";

export function PlatformMark({
  name,
  size = "md",
}: {
  name: string;
  from?: string;
  to?: string;
  size?: "sm" | "md" | "lg";
}) {
  const px = size === "lg" ? 40 : size === "sm" ? 32 : 36;
  return <PlatformLogo platform={name} size={px} alt={name} />;
}
