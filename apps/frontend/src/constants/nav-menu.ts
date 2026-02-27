export interface NavItem {
  label: string;
  path: string;
  permission?: string;
  children?: NavItem[];
}

export const NAV_MENU: NavItem[] = [
  { label: "Modelos", path: "/modelos", permission: "models:list" },
  { label: "Clientes", path: "/clientes", permission: "clients:list" },
  { label: "Categorias", path: "/categorias", permission: "categories:list" },
  { label: "Baldes", path: "/baldes", permission: "buckets:list" },
  { label: "Showroom", path: "/showroom", permission: "showroom:view" },
  {
    label: "Admin",
    path: "/admin",
    permission: "admin:access",
    children: [
      { label: "Dashboard", path: "/admin" },
      { label: "Usuários", path: "/admin/users" },
      { label: "Convites", path: "/admin/invitations" },
      { label: "Perfis", path: "/admin/roles" },
      { label: "Recursos", path: "/admin/permissions" },
      { label: "Log de Auditoria", path: "/admin/audit-log" },
    ],
  },
];
