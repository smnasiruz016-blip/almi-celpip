import { listCompAccounts } from "@/lib/admin/comp-accounts";
import { CompAccountsClient } from "./comp-accounts-client";

export const dynamic = "force-dynamic";

export default async function CompAccountsPage() {
  const { active, expired } = await listCompAccounts();
  return <CompAccountsClient active={active} expired={expired} />;
}
