import { AccountChangeAlerts } from "@/components/admin/AccountChangeAlerts";
import { CodeApprovalAlerts } from "@/components/admin/CodeApprovalAlerts";
import { AdminHomeDashboard } from "@/components/admin/AdminHomeDashboard";
import { loadAccountChangeAlerts } from "@/lib/account-alerts";
import { listPendingApprovals } from "@/lib/code-controls";
import { getAppSession } from "@/lib/auth/get-session";
import { loadCustomers, loadSellers, loadWholesaleSales } from "@/lib/data/queries";
import {
  currentLimaMonthKey,
  firstName,
  monthOptions,
  wholesaleIncomeFromSales,
  type AdminHomePayload,
} from "@/lib/admin-home";

export default async function AdminDashboardPage() {
  const [session, sellers, customers, wholesaleSales, accountAlerts, pendingApprovals] = await Promise.all([
    getAppSession(),
    loadSellers(),
    loadCustomers(),
    loadWholesaleSales(),
    loadAccountChangeAlerts(),
    listPendingApprovals(),
  ]);

  const data: AdminHomePayload = {
    greetingName: firstName(session.name),
    defaultMonth: currentLimaMonthKey(),
    months: monthOptions(12),
    sellers: sellers.map((seller) => ({
      id: seller.id,
      name: seller.name,
      status: seller.status,
      registeredAt: seller.registeredAt,
    })),
    customers: customers.map((customer) => ({
      id: customer.id,
      status: customer.status,
      registeredAt: customer.registeredAt,
    })),
    wholesaleSales: wholesaleIncomeFromSales(wholesaleSales, sellers),
  };

  return (
    <>
      <CodeApprovalAlerts items={pendingApprovals} />
      <AccountChangeAlerts alerts={accountAlerts} />
      <AdminHomeDashboard data={data} />
    </>
  );
}
