import Role from "../models/Roles.js";
import User from "../models/User.js";
import { emitToRoles } from "../config/socket.js";
import { createNotification } from "./notificationService.js";

export const notifyUsersByRole = async ({ roles, excludeUserId, title, message, type, priority = "MEDIUM", metaData = {} }) => {
  const roleDocs = await Role.find({ roleName: { $in: roles } }).select("_id").lean();
  const roleIds = roleDocs.map((roleDoc) => roleDoc._id);

  if (roleIds.length === 0) return [];

  const users = await User.find({ role: { $in: roleIds }, isActive: true }).select("_id").lean();
  const excludeId = excludeUserId ? excludeUserId.toString() : null;
  const recipients = users
    .map((user) => user._id.toString())
    .filter((userId) => userId !== excludeId);

  await Promise.all(
    recipients.map((recipient) =>
      createNotification({
        recipient,
        title,
        message,
        type,
        priority,
        metaData,
      })
    )
  );

  return recipients;
};

export const emitDataChanged = async (roles, { domains = [], action, entity, id, message, metaData = {} }) => {
  await emitToRoles(roles, "data_changed", {
    domains,
    action,
    entity,
    id,
    message,
    metaData,
    timestamp: new Date().toISOString(),
  });
};
