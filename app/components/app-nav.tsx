import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const links = [
  { href: "/materias", label: "Matérias" },
  { href: "/mentor", label: "Mentor" },
  { href: "/progresso", label: "Progresso" },
] as const;

export async function AppNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    profile?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "estudante";

  return (
    <nav className="sticky top-0 z-40 border-b border-teal-900/10 bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-6 py-3">
        <Link
          href="/materias"
          className="font-serif text-lg font-semibold text-teal-900"
        >
          App Estudo
        </Link>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50"
            >
              {link.label}
            </Link>
          ))}
          <span className="ml-1 hidden text-xs text-zinc-500 sm:inline">
            Olá, {name}
          </span>
        </div>
      </div>
    </nav>
  );
}
