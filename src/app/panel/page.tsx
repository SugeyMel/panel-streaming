import { SellerMobileHome, type WholesalePreview } from "@/components/panel/SellerMobileHome";
import {
  loadCustomers,
  loadFinance,
  loadHomeImages,
  loadOrders,
  loadPlatforms,
  loadProducts,
  loadSupplierProducts,
  panelScope,
} from "@/lib/data/queries";
import { paidSalesFromOrders } from "@/lib/sales-performance";

export default async function SellerDashboardPage() {
  const { session, sellerId } = await panelScope();
  const [finance, orders, customers, products, homeImages, supplierProducts, platforms] = await Promise.all([
    loadFinance(sellerId),
    loadOrders({ sellerId }),
    loadCustomers(sellerId),
    loadProducts(sellerId),
    loadHomeImages(sellerId),
    loadSupplierProducts(),
    loadPlatforms(),
  ]);
  const pendingOrders = orders.filter((item) =>
    ["pendiente_pago", "pago_enviado"].includes(item.status),
  ).length;
  const wholesaleItems: WholesalePreview[] = supplierProducts
    .filter((row) => row.status === "active")
    .map((row) => ({
      id: row.id,
      name: row.name,
      wholesalePrice: row.wholesalePrice,
      imageUrl: row.imageUrl,
      platform: platforms.find((item) => item.id === (row.platformId ?? "")) ?? null,
    }));

  return (
    <SellerMobileHome
      sellerName={session.name}
      products={products}
      customerCount={customers.length}
      pendingOrders={pendingOrders}
      sales={finance.sales}
      homeImages={homeImages}
      paidSales={paidSalesFromOrders(orders)}
      wholesaleItems={wholesaleItems}
    />
  );
}
