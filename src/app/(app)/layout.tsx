// Logged-in shell. The family GlobalHeader + GlobalFooter come from the root
// layout — this wrapper adds the left Sidebar nav (desktop fixed rail / mobile
// drawer) plus the email-verify banner.

import { redirect } from "next/navigation";
import { destroySession, requireUser } from "@/lib/auth";
import { EmailVerifyBanner } from "@/components/EmailVerifyBanner";
import { Sidebar } from "@/components/Sidebar";
import { isAdmin } from "@/lib/founder";

async function logoutAction() {
  "use server";
  await destroySession();
  redirect("/");
}

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const admin = isAdmin(user.email);

  return (
    <div className="flex flex-1 flex-col bg-almi-bg">
      {!user.emailVerified && <EmailVerifyBanner email={user.email} />}
      <Sidebar email={user.email} isAdmin={admin} logout={logoutAction} />
      <main className="flex-1 px-4 py-8 sm:px-6 md:ml-60 md:px-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
