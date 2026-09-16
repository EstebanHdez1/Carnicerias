import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { LotType, PaymentMethod, SaleStatus, Status } from '@prisma/client';

function getDateRange(filter?: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  switch (filter) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'last7days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      break;
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'last30days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      break;
    case 'custom':
      if (customStart) startDate = new Date(customStart);
      if (customEnd) {
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
      }
      break;
    default:
      // Default to last 30 days
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      break;
  }

  return { startDate, endDate };
}

export async function getDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { filter, start_date, end_date } = req.query;
    const { startDate, endDate } = getDateRange(
      filter as string,
      start_date as string,
      end_date as string
    );

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. KPI Queries
    const [
      salesToday,
      salesThisMonth,
      salesLast7Days,
      salesFiltered,
      activeLots,
      allLots,
      allLotCuts,
      allProducts,
      salesByPayment,
      salesByVendor,
      topItems,
    ] = await Promise.all([
      // Sales today
      prisma.sale.aggregate({
        where: { created_at: { gte: todayStart }, status: SaleStatus.CONFIRMED },
        _sum: { total_amount: true },
        _count: { id: true },
      }),
      // Sales this month
      prisma.sale.aggregate({
        where: { created_at: { gte: monthStart }, status: SaleStatus.CONFIRMED },
        _sum: { total_amount: true },
        _count: { id: true },
      }),
      // Sales last 7 days
      prisma.sale.aggregate({
        where: { created_at: { gte: sevenDaysAgo }, status: SaleStatus.CONFIRMED },
        _sum: { total_amount: true },
        _count: { id: true },
      }),
      // Sales in active filter range
      prisma.sale.aggregate({
        where: {
          created_at: { gte: startDate, lte: endDate },
          status: SaleStatus.CONFIRMED,
        },
        _sum: { total_amount: true },
        _count: { id: true },
      }),
      // Active animal lots count (lots with status ACTIVE that have remaining stock > 0)
      prisma.animalLot.count({
        where: {
          status: Status.ACTIVE,
          cuts: {
            some: {
              current_stock: { gt: 0 },
            },
          },
        },
      }),
      // All lots with cuts for yield metrics
      prisma.animalLot.findMany({
        where: { status: Status.ACTIVE },
        include: {
          cuts: {
            include: { cut_catalog: true },
          },
        },
      }),
      // All active cuts with available stock for stock summary
      prisma.lotCut.findMany({
        where: {
          lot: { status: Status.ACTIVE },
          current_stock: { gt: 0 },
        },
        include: { cut_catalog: true, lot: true },
      }),
      // All active general products
      prisma.product.findMany({
        where: { status: Status.ACTIVE },
        include: { category: true },
      }),
      // Sales grouped by payment method in date range
      prisma.sale.groupBy({
        by: ['payment_method'],
        where: {
          created_at: { gte: startDate, lte: endDate },
          status: SaleStatus.CONFIRMED,
        },
        _sum: { total_amount: true },
        _count: { id: true },
      }),
      // Sales grouped by vendor in date range
      prisma.sale.groupBy({
        by: ['user_id'],
        where: {
          created_at: { gte: startDate, lte: endDate },
          status: SaleStatus.CONFIRMED,
        },
        _sum: { total_amount: true },
        _count: { id: true },
      }),
      // Top items sold in date range
      prisma.saleItem.groupBy({
        by: ['item_name'],
        where: {
          sale: {
            created_at: { gte: startDate, lte: endDate },
            status: SaleStatus.CONFIRMED,
          },
        },
        _sum: {
          quantity: true,
          subtotal: true,
        },
        _count: { id: true },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    // Calculate ticket promedio
    const filterTotalRevenue = Number(salesFiltered._sum.total_amount || 0);
    const filterTotalCount = salesFiltered._count.id || 0;
    const ticketPromedio = filterTotalCount > 0 ? filterTotalRevenue / filterTotalCount : 0;

    // Inventory calculations
    let totalCutsStockKg = 0;
    let beefStockKg = 0;
    let porkStockKg = 0;
    const lowStockItems: any[] = [];

    allLotCuts.forEach((cut) => {
      const stock = Number(cut.current_stock);
      totalCutsStockKg += stock;
      if (cut.lot.lot_type === LotType.BEEF) {
        beefStockKg += stock;
      } else {
        porkStockKg += stock;
      }

      if (stock <= 5 && stock > 0) {
        lowStockItems.push({
          id: cut.id,
          name: `${cut.cut_catalog.name} (${cut.lot.lot_code})`,
          current_stock: stock,
          unit: 'kg',
          type: 'CORTE',
        });
      }
    });

    let totalProductsStock = 0;
    allProducts.forEach((prod) => {
      const stock = Number(prod.current_stock);
      totalProductsStock += stock;
      if (stock <= 5 && stock > 0) {
        lowStockItems.push({
          id: prod.id,
          name: prod.name,
          current_stock: stock,
          unit: prod.unit_measure,
          type: 'PRODUCTO',
        });
      }
    });

    // Yield Calculations (Rendimiento)
    let totalBeefPurchase = 0;
    let totalBeefCutsValue = 0;
    let beefLotsCount = 0;

    let totalPorkPurchase = 0;
    let totalPorkCutsValue = 0;
    let porkLotsCount = 0;

    const lotPerformances = allLots.map((lot) => {
      let cutsValue = 0;
      let cutsWeight = 0;

      lot.cuts.forEach((cut) => {
        const w = Number(cut.initial_weight);
        const p = Number(cut.price_per_kg);
        cutsWeight += w;
        cutsValue += w * p;
      });

      const purchase = Number(lot.purchase_price);
      const yieldRatio = purchase > 0 ? cutsValue / purchase : 0;
      const yieldPct = yieldRatio * 100;
      const diff = cutsValue - purchase;

      if (lot.lot_type === LotType.BEEF) {
        totalBeefPurchase += purchase;
        totalBeefCutsValue += cutsValue;
        beefLotsCount++;
      } else {
        totalPorkPurchase += purchase;
        totalPorkCutsValue += cutsValue;
        porkLotsCount++;
      }

      return {
        id: lot.id,
        lot_code: lot.lot_code,
        lot_type: lot.lot_type,
        purchase_price: purchase,
        total_cuts_value: Number(cutsValue.toFixed(2)),
        total_cuts_weight: Number(cutsWeight.toFixed(2)),
        difference: Number(diff.toFixed(2)),
        yield_percentage: Number(yieldPct.toFixed(2)),
      };
    });

    const avgBeefYield = totalBeefPurchase > 0 ? (totalBeefCutsValue / totalBeefPurchase) * 100 : 0;
    const avgPorkYield = totalPorkPurchase > 0 ? (totalPorkCutsValue / totalPorkPurchase) * 100 : 0;

    // Enrich vendor names
    const userIds = salesByVendor.map((v) => v.user_id);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, username: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const vendorPerformance = salesByVendor.map((v) => ({
      user_id: v.user_id,
      vendor_name: userMap.get(v.user_id) || 'Desconocido',
      sales_count: v._count.id,
      total_amount: Number(v._sum.total_amount || 0),
    }));

    // Payment methods summary
    const paymentMethodsData = salesByPayment.map((p) => ({
      payment_method: p.payment_method,
      sales_count: p._count.id,
      total_amount: Number(p._sum.total_amount || 0),
    }));

    // Daily sales chart data for the filtered range
    const rawDailySales = await prisma.sale.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: SaleStatus.CONFIRMED,
      },
      select: {
        total_amount: true,
        created_at: true,
      },
      orderBy: { created_at: 'asc' },
    });

    // Group sales by day (YYYY-MM-DD)
    const dailySalesMap: Record<string, { date: string; total: number; count: number }> = {};
    rawDailySales.forEach((sale) => {
      const dateKey = sale.created_at.toISOString().slice(0, 10);
      if (!dailySalesMap[dateKey]) {
        dailySalesMap[dateKey] = { date: dateKey, total: 0, count: 0 };
      }
      dailySalesMap[dateKey].total += Number(sale.total_amount);
      dailySalesMap[dateKey].count += 1;
    });

    const dailySalesChart = Object.values(dailySalesMap);

    res.json({
      success: true,
      filter: {
        name: filter || 'last30days',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
      sales: {
        today: {
          total: Number(salesToday._sum.total_amount || 0),
          count: salesToday._count.id || 0,
        },
        this_month: {
          total: Number(salesThisMonth._sum.total_amount || 0),
          count: salesThisMonth._count.id || 0,
        },
        last_7_days: {
          total: Number(salesLast7Days._sum.total_amount || 0),
          count: salesLast7Days._count.id || 0,
        },
        filtered_period: {
          total: filterTotalRevenue,
          count: filterTotalCount,
          ticket_promedio: Number(ticketPromedio.toFixed(2)),
        },
      },
      inventory: {
        active_lots_count: activeLots,
        total_cuts_stock_kg: Number(totalCutsStockKg.toFixed(2)),
        beef_stock_kg: Number(beefStockKg.toFixed(2)),
        pork_stock_kg: Number(porkStockKg.toFixed(2)),
        total_products_stock: Number(totalProductsStock.toFixed(2)),
        low_stock_items: lowStockItems,
      },
      yield_metrics: {
        average_beef_yield_percentage: Number(avgBeefYield.toFixed(2)),
        average_pork_yield_percentage: Number(avgPorkYield.toFixed(2)),
        total_beef_purchase: Number(totalBeefPurchase.toFixed(2)),
        total_beef_cuts_value: Number(totalBeefCutsValue.toFixed(2)),
        total_pork_purchase: Number(totalPorkPurchase.toFixed(2)),
        total_pork_cuts_value: Number(totalPorkCutsValue.toFixed(2)),
        lot_performances: lotPerformances,
      },
      top_products: topItems.map((item) => ({
        name: item.item_name,
        quantity: Number(item._sum.quantity || 0),
        total_amount: Number(item._sum.subtotal || 0),
        count: item._count.id,
      })),
      vendors: vendorPerformance,
      payment_methods: paymentMethodsData,
      charts: {
        daily_sales: dailySalesChart,
        payment_methods: paymentMethodsData,
        top_products: topItems.map((item) => ({
          name: item.item_name,
          quantity: Number(item._sum.quantity || 0),
          total: Number(item._sum.subtotal || 0),
        })),
        lot_yields: lotPerformances.slice(0, 10),
        vendor_sales: vendorPerformance,
      },
    });
  } catch (error) {
    next(error);
  }
}
