import { AccountChangeAlerts } from "@/components/admin/AccountChangeAlerts";
import { AdminHomeDashboard } from "@/components/admin/AdminHomeDashboard";
import { loadAccountChangeAlerts } from "@/lib/account-alerts";
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
  const [session, sellers, customers, wholesaleSales, accountAlerts] = await Promise.all([
    getAppSession(),
    loadSellers(),
    loadCustomers(),
    loadWholesaleSales(),
    loadAccountChangeAlerts(),
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
      <AccountChangeAlerts alerts={accountAlerts} />
      <AdminHomeDashboard data={data} />
    </>
  );
}
