import { StockStatus } from '../../types';
interface BadgeProps {
  status: StockStatus;
}
export function StockBadge({ status }: BadgeProps) {
  const styles = {
    OK: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    LOW: 'bg-amber-100 text-amber-800 border-amber-200',
    CRITICAL: 'bg-red-100 text-red-800 border-red-200'
  };
  const labels = {
    OK: 'Ổn định',
    LOW: 'Sắp hết',
    CRITICAL: 'Hết hàng'
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      
      {labels[status]}
    </span>);

}