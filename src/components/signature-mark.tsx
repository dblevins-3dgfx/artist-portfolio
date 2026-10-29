/*
 * Thomasene's "tb" signature monogram as an inline SVG, for the header.
 *
 * The paths are copied from src/app/icon.svg (the browser-tab icon), so if
 * the tracing changes, change both. We inline them here instead of using
 * <img src="/icon.svg"> because inline SVG can use `currentColor`: the
 * stroke takes the CSS `color` of its parent, like a font glyph does, so a
 * Tailwind class such as `text-primary` colours it. An <img> is a separate
 * document and can't see the page's CSS.
 *
 * The viewBox is cropped tighter than icon.svg's (no cream background
 * square), so the mark sits snugly next to the wordmark.
 *
 * `React.ComponentProps<"svg">` is the type of every prop a plain <svg>
 * accepts; spreading `...props` passes className, aria-*, etc. straight
 * through, a bit like perfect forwarding in C++.
 */
import type { ComponentProps } from "react";

export function SignatureMark(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="470 630 520 800"
      fill="none"
      stroke="currentColor"
      strokeWidth={52}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M655 662 C648 720 630 780 620 830 C610 900 600 980 596 1050 C594 1110 620 1140 680 1146 L860 1146 C925 1150 958 1210 952 1272 C946 1340 890 1392 815 1392 C770 1392 742 1375 740 1345 C745 1180 775 980 795 826" />
      <path d="M502 790 C540 805 575 822 620 828 C680 830 740 826 795 822" />
    </svg>
  );
}
