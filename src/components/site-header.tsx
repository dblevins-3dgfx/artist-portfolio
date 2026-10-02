"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useRequestCart } from "@/components/request-provider";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const links = [
  { href: "/work", label: "Work" },
  { href: "/prints", label: "Prints" },
  { href: "/about", label: "About" },
  { href: "/request", label: "Request" },
];

function NavLink({
  href,
  label,
  count,
  onNavigate,
}: {
  href: string;
  label: string;
  count?: number;
  onNavigate?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const text = (
    <>
      {label}
      {href === "/request" && count ? (
        <span className="ml-1.5 text-primary">{count}</span>
      ) : null}
    </>
  );
  const className = cn(
    "text-sm tracking-wide",
    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
  );

  if (onNavigate) {
    return (
      <SheetClose render={<Link href={href} className={className} />}>
        {text}
      </SheetClose>
    );
  }

  return (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      {text}
    </Link>
  );
}

export function SiteHeader() {
  const { count } = useRequestCart();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="font-heading text-2xl leading-none italic tracking-tight">
          {site.artistName}
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {links.map((link) => (
            <NavLink key={link.href} {...link} count={count} />
          ))}
        </nav>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11 bg-card"
                  aria-label="Open menu"
                />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="right" className="bg-background">
              <SheetHeader>
                <SheetTitle className="font-heading text-xl italic">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-5 px-4 text-lg" aria-label="Mobile">
                {links.map((link) => (
                  <NavLink key={link.href} {...link} count={count} onNavigate />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
