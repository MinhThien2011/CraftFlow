import * as dashboardService from '../services/dashboardService.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Controller to get all statistics for the dashboard.
 */
export const getDashboardStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const [overview, chartData, performance] = await Promise.all([
      dashboardService.getOverviewStats(),
      dashboardService.getChartData(days),
      dashboardService.getTopPerformanceStats()
    ]);

    if (!overview.success || !chartData.success || !performance.success) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve some dashboard statistics.'
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        overview: overview.data,
        charts: chartData.data,
        performance: performance.data
      }
    });
  } catch (error) {
    console.error('[DashboardController] getDashboardStats error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error while fetching dashboard statistics.'
    });
  }
};
