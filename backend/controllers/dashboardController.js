import * as dashboardService from '../services/dashboardService.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Controller to get all statistics for the dashboard.
 */
export const getDashboardStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const [overview, chartData, performance, alerts] = await Promise.all([
      dashboardService.getOverviewStats(),
      dashboardService.getChartData(days),
      dashboardService.getTopPerformanceStats(),
      dashboardService.getRecentAlerts(5)
    ]);

    if (!overview.success || !chartData.success || !performance.success || !alerts.success) {
      // Log specific errors for debugging
      console.log('Dashboard stats retrieval errors:', {
        overviewError: overview.message,
        chartDataError: chartData.message,
        performanceError: performance.message,
        alertsError: alerts.message
      });
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve some dashboard statistics. Check logs for details.'
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        overview: overview.data,
        charts: chartData.data,
        performance: performance.data,
        alerts: alerts.data
      }
    });
  } catch (error) {
    console.log('[DashboardController] getDashboardStats error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error while fetching dashboard statistics.'
    });
  }
};

/**
 * Controller to get specific statistics for the Warehouse Manager dashboard.
 */
export const getWarehouseDashboardStats = async (req, res) => {
  try {
    const [warehouseStats, recentActivity, alerts, charts] = await Promise.all([
      dashboardService.getWarehouseStats(),
      dashboardService.getWarehouseRecentActivity(10),
      dashboardService.getRecentAlerts(5),
      dashboardService.getChartData(7)
    ]);

    if (!warehouseStats.success || !recentActivity.success || !alerts.success || !charts.success) {
      console.log('Warehouse dashboard stats retrieval errors:', {
        warehouseError: warehouseStats.message,
        activityError: recentActivity.message,
        alertsError: alerts.message,
        chartsError: charts.message
      });
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve some warehouse statistics.'
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        stats: warehouseStats.data,
        recentActivity: recentActivity.data,
        alerts: alerts.data,
        charts: charts.data
      }
    });
  } catch (error) {
    console.log('[DashboardController] getWarehouseDashboardStats error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error while fetching warehouse dashboard statistics.'
    });
  }
};
