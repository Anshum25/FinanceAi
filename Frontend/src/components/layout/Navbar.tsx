import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import FinanceAILogo from '@/components/icons/FinanceAILogo';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavbarProps {
  onTogglePermissions: () => void;
  onToggleChat: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onTogglePermissions, onToggleChat }) => {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <motion.nav 
      className="nav-gradient sticky top-0 z-50 px-6 py-4"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <FinanceAILogo size="md" showText={true} />

        {/* Center Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleChat}
            className="hidden md:flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Ask AI</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePermissions}
            className="flex items-center space-x-2 hover-scale"
          >
            <span className="hidden sm:inline">Privacy Settings</span>
            <span className="sm:hidden">Privacy</span>
          </Button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="relative overflow-hidden"
          >
            <motion.div
              initial={false}
              animate={{ rotate: theme === 'light' ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </motion.div>
          </Button>

          {/* Auth */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm text-foreground">{user.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link to="/signup">
                <Button variant="gradient" size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;