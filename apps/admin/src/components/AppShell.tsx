'use client';

import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import CampaignIcon from '@mui/icons-material/Campaign';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GrassIcon from '@mui/icons-material/Grass';
import HandymanIcon from '@mui/icons-material/Handyman';
import HistoryIcon from '@mui/icons-material/History';
import LandscapeIcon from '@mui/icons-material/Landscape';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ThunderstormIcon from '@mui/icons-material/Thunderstorm';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import type { User } from '@/lib/types';

const DRAWER_WIDTH = 248;

const NAV: { href: string; label: string; icon: ReactNode }[] = [
  { href: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { href: '/farmers', label: 'Farmers', icon: <PeopleIcon /> },
  { href: '/farms', label: 'Farms', icon: <LandscapeIcon /> },
  { href: '/crops', label: 'Crop Master', icon: <GrassIcon /> },
  { href: '/mandi-prices', label: 'Mandi Prices', icon: <StorefrontIcon /> },
  { href: '/weather-alerts', label: 'Weather Alerts', icon: <ThunderstormIcon /> },
  { href: '/advisories', label: 'Advisories', icon: <CampaignIcon /> },
  { href: '/schemes', label: 'Govt Schemes', icon: <AccountBalanceIcon /> },
  { href: '/suppliers', label: 'Suppliers', icon: <HandymanIcon /> },
  { href: '/notifications', label: 'Notifications', icon: <NotificationsIcon /> },
  { href: '/audit-logs', label: 'Audit Log', icon: <HistoryIcon /> },
  { href: '/settings', label: 'Settings', icon: <SettingsIcon /> },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ user, onLogout, children }: { user: User; onLogout: () => void; children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ gap: 1.5 }}>
        <AgricultureIcon color="primary" />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            Krishi Saathi
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Admin console
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, flex: 1 }}>
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={active}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                '&.Mui-selected:hover': { bgcolor: 'primary.dark' },
                '&.Mui-selected .MuiListItemIcon-root': { color: 'primary.contrastText' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
      <Typography variant="caption" color="text.secondary" sx={{ p: 2 }}>
        West Bengal agriculture staff
      </Typography>
    </Box>
  );

  const displayName = user.name || user.phone;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'primary.dark',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {NAV.find((n) => isActive(pathname, n.href))?.label ?? 'Krishi Saathi'}
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {displayName}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {user.role}
              </Typography>
            </Box>
            <Tooltip title="Log out">
              <IconButton color="inherit" onClick={onLogout} aria-label="Log out">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
}
