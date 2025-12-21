import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Globe Visualization Embed",
  description: "Interactive globe visualization",
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
