import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Heart, Bell, User, LogOut, Gavel, Menu, X, RefreshCw, CheckCheck, ChevronDown, LayoutDashboard, HeartHandshake, PackageSearch, Settings, HandHeart, Gift, Package, CreditCard } from "lucide-react";
import { supabase } from "../supabaseClient";
import BankDetailsForm from "./BankDetailsForm";

function AuthenticatedNavbar() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedNotification, setExpandedNotification] = useState(null);
  const [showBankDetailsForm, setShowBankDetailsForm] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [submittedPaymentNotifications, setSubmittedPaymentNotifications] = useState(new Set());

  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    if (user) {
      const userData = JSON.parse(user);
      setCurrentUser(userData);
      loadNotifications(userData.id);
    }
  }, []);

  // Refresh notifications periodically and when tab becomes visible
  useEffect(() => {
    if (!currentUser) return;

    const refreshNotifications = () => {
      loadNotifications(currentUser.id);
    };

    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Refresh every 30 seconds
    const interval = setInterval(refreshNotifications, 30000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [currentUser]);

  const loadNotifications = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error loading notifications:", error);
        // If table doesn't exist, just log and continue
        if (error.code === "PGRST116" || error.message.includes("does not exist")) {
          console.log("Notifications table not created yet.");
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        throw error;
      }

      setNotifications(data || []);
      const unread = (data || []).filter((n) => !n.is_read).length;
      setUnreadCount(unread);

      // Check which payment notifications have already been submitted
      await checkSubmittedPaymentNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const checkSubmittedPaymentNotifications = async (notifications) => {
    const paymentNotifications = notifications.filter(n => n.type === "request_approved_bank_details");
    const submittedIds = new Set();

    for (const notification of paymentNotifications) {
      try {
        const { data, error } = await supabase
          .from("bank_details")
          .select("*")
          .eq("related_notification_id", notification.id)
          .single();

        if (data && !error) {
          submittedIds.add(notification.id.toString());
        }
      } catch (err) {
        // Table doesn't exist or other error, skip
      }
    }

    setSubmittedPaymentNotifications(submittedIds);
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleBankDetailsSubmit = async (bankDetails) => {
    try {
      console.log("=== BANK DETAILS SUBMISSION START ===");
      
      const insertData = {
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_email: currentUser.email,
        account_holder_name: bankDetails.accountHolderName,
        payment_method: bankDetails.paymentMethod,
        related_notification_id: bankDetails.relatedNotificationId,
        created_at: new Date().toISOString()
      };

      if (bankDetails.paymentMethod === 'mobile') {
        insertData.mobile_number = bankDetails.mobileNumber;
      } else {
        insertData.bank_details = bankDetails.bankDetails;
      }

      const { data, error } = await supabase
        .from("bank_details")
        .insert([insertData])
        .select();

      if (error) throw error;

      // Create admin notification
      await supabase
        .from("notifications")
        .insert([{
          user_id: 1,
          type: "bank_details_submitted",
          title: "Payment Details Submitted",
          message: `User ${currentUser.name} submitted bank details for request #${bankDetails.relatedNotificationId}`,
          related_id: bankDetails.relatedNotificationId,
          is_read: false,
          created_at: new Date().toISOString()
        }]);

      // Mark as read
      if (bankDetails.relatedNotificationId) {
        await markAsRead(bankDetails.relatedNotificationId);
      }

      setSubmittedPaymentNotifications(prev => new Set([...prev, bankDetails.relatedNotificationId.toString()]));
      setShowBankDetailsForm(false);
    } catch (error) {
      console.error("Error in handleBankDetailsSubmit:", error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUser.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // Navigation links specific to logged-in users
  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Donations', path: '/dashboard', tab: 'donations', icon: HeartHandshake },
    { name: 'My Requests', path: '/dashboard', tab: 'requests', icon: PackageSearch },
    { name: 'Live Bidding', path: '/bidding-gallery', icon: Gavel },
  ];

  const isActive = (path, tab) => {
    if (tab) {
      const searchParams = new URLSearchParams(location.search);
      return location.pathname === path && searchParams.get('tab') === tab;
    }
    return location.pathname === path && !location.search.includes('tab=');
  };

  const handleNavClick = (path, tab, e) => {
    if (tab) {
      e.preventDefault();
      const searchParams = new URLSearchParams(location.search);
      const currentTab = searchParams.get('tab');

      // If already on the same tab, just scroll to history section
      if (currentTab === tab && location.pathname === path) {
        setTimeout(() => {
          const historySection = document.getElementById('history-section');
          if (historySection) {
            historySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        // Navigate to the tab
        navigate(`${path}?tab=${tab}`);
      }
    } else if (path === '/dashboard') {
      // If clicking Dashboard, clear tab and scroll to top
      e.preventDefault();
      navigate('/dashboard');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const quickActionLinks = [
    { name: "Request Now", path: "/request-donation", icon: HandHeart },
    { name: "Donate Now", path: "/donate", icon: Gift },
    { name: "Browse Product", path: "/browse", icon: Package },
    { name: "View Bidding", path: "/bidding-gallery", icon: Gavel },
  ];

  useEffect(() => {
    setSideMenuOpen(false);
  }, [location.pathname, location.search]);

  if (!currentUser) return null;

  return (
    <>
      {/* Side Drawer Backdrop */}
      {sideMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[65]"
          onClick={() => setSideMenuOpen(false)}
        />
      )}

      {/* Side Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl border-r border-gray-200 z-[70] transform transition-transform duration-300 ease-out ${sideMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="p-5 border-b border-gray-100 bg-primary-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center shadow-sm ring-1 ring-primary-700/20">
                <Heart className="w-5 h-5 text-white" fill="white" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-poppins text-gray-900">
                  Share<span className="text-primary-500">4</span>Good
                </h3>
              </div>
            </div>
            <button
              onClick={() => setSideMenuOpen(false)}
              className="p-2 rounded-xl hover:bg-white/70 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2">
          {quickActionLinks.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSideMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 text-left text-gray-700 hover:text-primary-700 transition-all duration-200 group"
              >
                <span className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="font-semibold">{item.name}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <nav className="bg-white/95 backdrop-blur-md shadow-soft sticky top-0 z-50">
        <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-5 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Menu & Logo Container */}
            <div className="flex items-center space-x-3 sm:space-x-5">
              {/* Sidebar Menu Button */}
              <button
                onClick={() => setSideMenuOpen(true)}
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100 hover:text-primary-700 border border-primary-100 transition-all duration-200 flex items-center justify-center shrink-0"
                title="Quick Actions"
              >
                <Menu className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>

              {/* Logo */}
              <div
                onClick={() => navigate("/dashboard")}
                className="flex items-center space-x-3 group cursor-pointer"
              >
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary-600 flex items-center justify-center shadow-md ring-1 ring-primary-700/20 group-hover:shadow-lg transition-all duration-300">
                  <Heart className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg lg:text-xl font-bold font-poppins text-gray-900 leading-none">
                    Share<span className="text-primary-500">4</span>Good
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path + (link.tab || '')}
                    to={link.tab ? `${link.path}?tab=${link.tab}` : link.path}
                    onClick={(e) => handleNavClick(link.path, link.tab, e)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isActive(link.path, link.tab)
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Desktop Right Side */}
            <div className="hidden lg:flex items-center space-x-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors duration-200"
                  title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* User Menu Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-primary-600 font-medium transition-colors duration-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white text-xs font-bold">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="max-w-[120px] truncate">{currentUser.name}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-card border border-gray-200 py-2 z-50 animate-slide-up">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{currentUser.name}</p>
                      <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigate("/dashboard");
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        navigate("/profile");
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        navigate("/profile?tab=settings");
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
            }`}
        >
          <div className="px-4 py-4 space-y-2 bg-white border-t border-gray-100">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path + (link.tab || '')}
                  to={link.tab ? `${link.path}?tab=${link.tab}` : link.path}
                  onClick={(e) => {
                    handleNavClick(link.path, link.tab, e);
                    setMobileMenuOpen(false);
                  }}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive(link.path, link.tab)
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {link.name}
                  </span>
                </Link>
              );
            })}
            <div className="pt-4 space-y-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setMobileMenuOpen(false);
                }}
                className="relative block w-full text-left px-4 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => {
                  navigate("/profile");
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Profile
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="block w-full text-center btn-secondary !py-3"
              >
                <span className="flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Logout
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed top-20 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-card border border-gray-200 z-50 max-h-[calc(100vh-6rem)] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold font-poppins text-gray-900">
                Notifications {unreadCount > 0 && (
                  <span className="text-primary-600">({unreadCount} unread)</span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (currentUser) loadNotifications(currentUser.id);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-primary-600 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 font-medium mb-2">No notifications yet</p>
                  <p className="text-sm text-gray-500">
                    Notifications will appear here when admin approves or rejects your requests/donations
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => {
                    const isRejected = notification.type && notification.type.includes("rejected");
                    const isPositive = notification.type && (
                      notification.type.includes("approved") ||
                      ["bid_won", "payment_verified", "delivery_arranged"].includes(notification.type)
                    );
                    const hasReason = notification.rejection_reason;
                    const isExpanded = expandedNotification === notification.id;
                    const isUnread = !notification.is_read;

                    let displayMessage = notification.message || "";
                    if (isRejected && hasReason && typeof notification.message === "string") {
                      const parts = notification.message.split("Reason:");
                      displayMessage = parts[0].trim();
                    }

                    const isBankDetailsRequest = notification.type === "request_approved_bank_details";
                    const isPaymentSubmitted = submittedPaymentNotifications.has(notification.id.toString());

                    return (
                      <div
                        key={notification.id}
                        onClick={async () => {
                          if (isBankDetailsRequest && !isPaymentSubmitted) {
                            setSelectedNotification(notification);
                            setShowBankDetailsForm(true);
                            setShowNotifications(false);
                          } else if (isUnread) {
                            markAsRead(notification.id);
                          }
                        }}
                        className={`p-4 transition-colors ${isPaymentSubmitted
                            ? 'bg-gray-100 cursor-not-allowed opacity-60 pointer-events-none'
                            : 'hover:bg-gray-50 cursor-pointer'
                          } ${isUnread && !isPaymentSubmitted ? 'bg-primary-50/30' : ''
                          } ${isRejected ? 'border-l-4 border-red-500' : ''} ${isPositive ? 'border-l-4 border-green-500' : ''} ${isBankDetailsRequest ? 'border-l-4 border-blue-500' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                              isBankDetailsRequest ? 'bg-blue-100 text-blue-600' :
                              isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                            {isBankDetailsRequest ? (
                              <CreditCard className="w-5 h-5" />
                            ) : isPositive ? (
                              <span className="text-xl">✅</span>
                            ) : (
                              <span className="text-xl">❌</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 font-poppins text-sm">
                                {notification.title}
                              </h4>
                              {isUnread && (
                                <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1"></div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {displayMessage}
                              {isRejected && hasReason && !isExpanded && (
                                <span className="text-primary-600 font-medium"> (Reason available)</span>
                              )}
                            </p>
                            {isRejected && hasReason && (
                              <div className="mt-2">
                                {isExpanded ? (
                                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                    <strong className="text-sm text-red-700 block mb-2">Rejection Reason:</strong>
                                    <p className="text-sm text-red-600 mb-3">{notification.rejection_reason}</p>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedNotification(null);
                                      }}
                                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                                    >
                                      Hide Reason
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedNotification(notification.id);
                                    }}
                                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                                  >
                                    📋 View Rejection Reason
                                  </button>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showBankDetailsForm && (
        <BankDetailsForm
          notification={selectedNotification}
          onClose={() => {
            setShowBankDetailsForm(false);
            setSelectedNotification(null);
          }}
          onSubmit={handleBankDetailsSubmit}
        />
      )}
    </>
  );
}

export default AuthenticatedNavbar;
