const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const I = (paths) => (props) => <svg {...base} {...props}>{paths}</svg>;

export const CheckIcon = I(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const TodayIcon = I(<><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></>);
export const WeekIcon = I(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>);
export const LayersIcon = I(<><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>);
export const DayIcon = I(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const ListIcon = I(<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />);
export const PlusIcon = I(<path d="M12 5v14M5 12h14" />);
export const TrashIcon = I(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />);
export const EditIcon = I(<path d="M4 20h4L19 9l-4-4L4 16v4z" />);
export const GripIcon = I(<><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></>);
export const XIcon = I(<path d="M6 6l12 12M18 6L6 18" />);
export const ChevronLeft = I(<path d="M15 6l-6 6 6 6" />);
export const ChevronRight = I(<path d="M9 6l6 6-6 6" />);
export const LogoutIcon = I(<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />);
export const StarIcon = I(<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />);
