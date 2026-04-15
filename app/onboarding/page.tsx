import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingFlow from "./OnboardingFlow";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) redirect("/dashboard");

  return <OnboardingFlow />;
}
