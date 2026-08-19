import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "Account",
  description: "Sign in, sync your court, and manage your Strokeform player profile.",
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter note="Account data syncs to your Supabase project when env vars are configured. Otherwise everything stays in this browser." />
    </>
  );
}
