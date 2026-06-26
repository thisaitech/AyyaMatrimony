import type { AdminApprovalRecord, AdminUserRecord } from '@/constants/adminMockData';
import { PROFILE_ACCESS_PRICE } from '@/constants/subscription';

export type AdminDashboardStats = {
  totalUsers: number;
  adminAdded: number;
  pendingApprovals: number;
  pendingPayments: number;
  pendingPhotos: number;
  verifiedPayments: number;
  totalRevenue: number;
  activeToday: number;
  unreadCount: number;
  selfRegistered: number;
  paidMembers: number;
};

export function computeAdminDashboardStats(
  users: AdminUserRecord[],
  approvals: AdminApprovalRecord[],
  options: {
    unreadCount?: number;
    pendingPayments?: number;
    pendingPhotos?: number;
    verifiedPayments?: number;
    totalRevenue?: number;
    paidMembers?: number;
  } = {},
): AdminDashboardStats {
  const totalUsers = users.length;
  const activeToday = users.filter((user) => user.status === 'active').length;
  const adminAdded = users.filter((user) => user.registrationSource === 'admin').length;
  const selfRegistered = users.filter((user) => user.registrationSource === 'self').length;
  const pendingApprovals = approvals.filter((item) => item.status === 'pending').length;

  return {
    totalUsers,
    adminAdded,
    selfRegistered,
    pendingApprovals,
    pendingPayments: options.pendingPayments ?? 0,
    pendingPhotos: options.pendingPhotos ?? 0,
    verifiedPayments: options.verifiedPayments ?? 0,
    totalRevenue: options.totalRevenue ?? 0,
    activeToday,
    paidMembers: options.paidMembers ?? 0,
    unreadCount: options.unreadCount ?? 0,
  };
}

export function formatRevenue(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function revenueFromVerifiedCount(count: number): number {
  return count * PROFILE_ACCESS_PRICE;
}
