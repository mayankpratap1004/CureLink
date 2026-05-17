import {
  LayoutDashboard, Users, UserCog, Building2,
  CalendarDays, ListOrdered, Receipt, FileText,
  FolderOpen, Settings, Bell,
} from 'lucide-react'
import type { Role } from '@/types/app'

export interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: Role[]         // which roles can see this item
  badge?: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'doctor', 'receptionist'],
  },
  {
    label: 'Patients',
    href: '/patients',
    icon: Users,
    roles: ['admin', 'doctor', 'receptionist'],
  },
  {
    label: 'Doctors',
    href: '/doctors',
    icon: UserCog,
    roles: ['admin', 'receptionist'],
  },
  {
    label: 'Departments',
    href: '/departments',
    icon: Building2,
    roles: ['admin'],
  },
  {
    label: 'Appointments',
    href: '/appointments',
    icon: CalendarDays,
    roles: ['admin', 'doctor', 'receptionist'],
  },
  {
    label: 'Queue',
    href: '/queue',
    icon: ListOrdered,
    roles: ['admin', 'doctor', 'receptionist'],
  },
  {
    label: 'Billing',
    href: '/billing',
    icon: Receipt,
    roles: ['admin', 'receptionist'],
  },
  {
    label: 'Prescriptions',
    href: '/prescriptions',
    icon: FileText,
    roles: ['admin', 'doctor'],
  },
  {
    label: 'Medical Records',
    href: '/records',
    icon: FolderOpen,
    roles: ['admin', 'doctor'],
  },
  {
    label: 'Notifications',
    href: '/notifications',
    icon: Bell,
    roles: ['admin', 'doctor', 'receptionist'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
]

export function getNavItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter(item => item.roles.includes(role))
}