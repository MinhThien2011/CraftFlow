import ProductionOrder from '../models/ProductionOrder.js';
import { appLogger } from '../utils/appLogger.js';

const ACTIVE_STATUSES = [
  'pending',
  'materials_checking',
  'materials_allocated',
  'ready_to_assign',
  'assigned',
  'in_preparation',
  'in_production',
  'partially_complete',
  'overdue',
  'insufficient_materials'
];

export const getActiveProductionOrders = {
  declaration: {
    name: 'get_active_production_orders',
    description: 'Lay danh sach cac don san xuat dang hoat dong va thong tin han.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: 'Trang thai don hang. Neu khong co, he thong lay nhom dang hoat dong.'
        }
      }
    }
  },
  roles: ['production_manager', 'admin'],
  execute: async (args) => {
    try {
      const normalized = typeof args?.status === 'string' ? args.status.trim().toLowerCase() : '';
      const queryStatus = normalized ? [normalized] : ACTIVE_STATUSES;
      const orders = await ProductionOrder.find({ status: { $in: queryStatus } })
        .select('orderCode products status deadline')
        .limit(20)
        .lean();

      const formattedOrders = orders.map((o) => ({
        orderCode: o.orderCode,
        products: (o.products || []).map((p) => `${p.productName} (SL: ${p.quantity})`).join(', '),
        status: o.status,
        deadline: o.deadline ? new Date(o.deadline).toISOString() : null,
      }));

      return {
        total: formattedOrders.length,
        orders: formattedOrders,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      appLogger.error('TOOL', 'get_active_production_orders_failed', { message: error?.message });
      return { error: 'Khong the lay danh sach don san xuat.' };
    }
  }
};

export const getAtRiskProductionOrders = {
  declaration: {
    name: 'get_at_risk_production_orders',
    description: 'Lay danh sach don co nguy co tre han: da qua deadline hoac sap qua deadline theo nguong canh bao.',
    parameters: {
      type: 'OBJECT',
      properties: {
        riskHours: {
          type: 'NUMBER',
          description: 'So gio canh bao truoc deadline. Mac dinh lay theo AI_RISK_HOURS_THRESHOLD hoac 24.'
        },
        limit: {
          type: 'NUMBER',
          description: 'So don toi da tra ve. Mac dinh 10.'
        }
      }
    }
  },
  roles: ['production_manager', 'admin'],
  execute: async (args = {}) => {
    try {
      const riskHours = Number(args.riskHours || process.env.AI_RISK_HOURS_THRESHOLD || 24);
      const limit = Math.max(1, Math.min(50, Number(args.limit || 10)));
      const now = new Date();
      const warningAt = new Date(now.getTime() + Math.max(1, riskHours) * 60 * 60 * 1000);

      const excluded = ['completed', 'cancelled'];
      const orders = await ProductionOrder.find({
        status: { $nin: excluded },
        deadline: { $ne: null, $lte: warningAt }
      })
        .select('orderCode products status deadline priority')
        .sort({ deadline: 1 })
        .limit(limit)
        .lean();

      const atRiskOrders = orders.map((o) => {
        const deadline = o.deadline ? new Date(o.deadline) : null;
        const diffHours = deadline ? (deadline.getTime() - now.getTime()) / (1000 * 60 * 60) : null;
        const riskLevel = diffHours === null
          ? 'unknown'
          : diffHours < 0
            ? 'overdue'
            : diffHours <= Math.max(1, riskHours) / 2
              ? 'high'
              : 'medium';

        return {
          orderCode: o.orderCode,
          status: o.status,
          priority: o.priority || 'medium',
          deadline: deadline ? deadline.toISOString() : null,
          hoursToDeadline: diffHours === null ? null : Math.round(diffHours * 10) / 10,
          riskLevel,
          products: (o.products || []).map((p) => `${p.productName} (SL: ${p.quantity})`).join(', '),
        };
      });

      return {
        total: atRiskOrders.length,
        thresholdHours: riskHours,
        now: now.toISOString(),
        orders: atRiskOrders,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      appLogger.error('TOOL', 'get_at_risk_production_orders_failed', { message: error?.message });
      return { error: 'Khong the lay danh sach don nguy co tre han.' };
    }
  }
};

export const getTodayProductionSummary = {
  declaration: {
    name: 'get_today_production_summary',
    description: 'Lay tom tat tinh hinh san xuat hom nay.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  roles: ['production_manager', 'admin'],
  execute: async () => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const [inProduction, completedToday, createdToday] = await Promise.all([
        ProductionOrder.countDocuments({ status: { $in: ['in_production', 'partially_complete', 'assigned', 'in_preparation'] } }),
        ProductionOrder.countDocuments({ completedAt: { $gte: start, $lte: end } }),
        ProductionOrder.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      ]);

      return {
        date: start.toISOString(),
        inProductionOrders: inProduction,
        completedTodayOrders: completedToday,
        createdTodayOrders: createdToday,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      appLogger.error('TOOL', 'get_today_production_summary_failed', { message: error?.message });
      return { error: 'Khong the lay tom tat san xuat hom nay.' };
    }
  }
};
