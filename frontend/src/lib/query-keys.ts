export const queryKeys = {
  auth: {
    user: ["auth-user"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
  },
  production: {
    all: ["production"] as const,
  },
  purchaseOrders: {
    all: ["purchase-orders"] as const,
  },
  inventory: {
    all: ["inventory"] as const,
  },
  materials: {
    all: ["materials"] as const,
  },
  products: {
    all: ["products"] as const,
  },
  slips: {
    all: ["slips"] as const,
  },
  requisitions: {
    all: ["requisitions"] as const,
  },
} as const
