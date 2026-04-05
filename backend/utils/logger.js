import SystemLog from '../models/SystemLog.js';

/**
 * Utility to log system activities.
 * 
 * @param {Object} params
 * @param {String} params.userId - ID of the user performing the action
 * @param {String} params.action - Action performed (e.g., 'LOGIN', 'CREATE')
 * @param {String} params.module - Module affected (e.g., 'AUTH', 'USER')
 * @param {String} params.details - Human readable description
 * @param {String} [params.targetId] - ID of the affected resource
 * @param {Object} [params.metadata] - Additional technical data
 * @param {Object} [req] - Express request object to capture IP and User-Agent
 */
export const logActivity = async ({ author, action, module, details, targetId, metadata }, req = null) => {
  try {
    const logData = {
      author: author,
      action: action.toUpperCase(),
      module: module.toUpperCase(),
      details,
      targetId,
      metadata,
      ipAddress: req ? req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress : null,
      userAgent: req ? req.headers['user-agent'] : null
    };

    await SystemLog.create(logData);
  } catch (error) {
    console.error('[Logger] Failed to save system log:', error.message);
  }
};
