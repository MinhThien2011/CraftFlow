import mongoose from 'mongoose';

const MAX_LIMIT = 100;

export const normalizePagination = ({ page = 1, limit = 10, cursor, withTotal = true } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || 10));

  return {
    pageNum,
    limitNum,
    skip: cursor ? 0 : (pageNum - 1) * limitNum,
    cursor: cursor && mongoose.Types.ObjectId.isValid(cursor) ? new mongoose.Types.ObjectId(cursor) : null,
    withTotal: withTotal !== false && withTotal !== 'false',
  };
};

export const applyCreatedAtCursor = (filter, cursor) => {
  if (!cursor) return filter;
  return { ...filter, _id: { ...(filter._id || {}), $lt: cursor } };
};

export const buildListPagination = ({ items, total, pageNum, limitNum, cursor, withTotal }) => {
  const nextCursor = items.length === limitNum ? items[items.length - 1]?._id?.toString() : null;
  return {
    ...(withTotal && total !== undefined ? { total, pages: Math.ceil(total / limitNum) } : {}),
    page: pageNum,
    limit: limitNum,
    nextCursor,
    hasNextPage: Boolean(nextCursor),
    mode: cursor ? 'cursor' : 'offset',
  };
};
