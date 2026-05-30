import SystemLog from '../models/SystemLog.js';

/**
 * Utility to log system activities.
 * 
 * @param {Object} params
 * @param {String} params.author - ID of the user performing the action
 * @param {String} params.action - Action performed (e.g., 'LOGIN', 'CREATE')
 * @param {String} params.module - Module affected (e.g., 'AUTH', 'USER')
 * @param {String} params.details - Human readable description
 * @param {String} [params.targetId] - ID of the affected resource
 * @param {Object} [params.metadata] - Additional technical data
 * @param {Object} [req] - Express request object to capture IP and User-Agent
 */
export const logActivity = ({ author, action, module, details, targetId, metadata }, req = null, background = true) => {
  // Capture data immediately before any async shifts
  const logData = {
    author,
    action: action.toUpperCase(),
    module: module.toUpperCase(),
    details,
    targetId,
    metadata,
    ipAddress: req ? req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress : null,
    userAgent: req ? req.headers['user-agent'] : null,
    createdAt: new Date()
  };

  const saveLog = async () => {
    try {
      // Use direct collection access for slightly better performance than model instantiation
      await SystemLog.collection.insertOne(logData);
    } catch (error) {
      // Minimal logging for logger errors to avoid recursion/spam
      process.stderr.write(`[Logger Error]: ${error.message}\n`);
    }
  };

  if (background) {
    // setImmediate pushes the task to the check phase of Event Loop, 
    // ensuring current request finishes first.
    setImmediate(saveLog);
  } else {
    // If not background, we return the promise but don't await it here 
    // unless the caller explicitly wants to.
    return saveLog();
  }
};