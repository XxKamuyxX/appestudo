import { redirect } from "next/navigation";
import { MentorChat } from "@/app/mentor/mentor-chat";
import { createClient } from "@/lib/supabase/server";

export default async function MentorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <MentorChat />
    </main>
  );
}
