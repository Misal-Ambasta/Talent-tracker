
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Users, Briefcase, FileText, Brain, MessageSquare, BarChart3, Menu, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppDispatch } from "@/hooks/reduxHooks";
import { logout } from "@/slices/authSlice";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  
  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    { href: "/applicants", label: "Applicants", icon: Users },
    { href: "/resume-matching", label: "AI Matching", icon: Brain },
    { href: "/interview-feedback", label: "Interviews", icon: MessageSquare },
    { href: "/bias-detection", label: "Bias Detection", icon: Shield },
  ];

  const NavContent = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        
        return (
          <Link key={item.href} to={item.href}>
            <Button
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "flex items-center space-x-2 w-full justify-start md:w-auto md:justify-center",
                isActive && "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Button>
          </Link>
        );
      })}
    </>
  );

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">TalentTracker</span>
          </Link>

          {/* Desktop Navigation */}
          {!isMobile && (
            <div className="hidden md:flex items-center space-x-1">
              <NavContent />
            </div>
          )}

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {/* Mobile Menu */}
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex flex-col space-y-4 mt-8">
                    <NavContent />
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={handleLogout}
                      >
                        Logout
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            
            {/* Desktop Logout */}
            {!isMobile && (
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;