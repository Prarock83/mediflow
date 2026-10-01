"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PatientLayout from "@/components/patient/PatientLayout";
import {
  NotificationItem,
  fetchPatientNotifications,
  markNotificationAsRead,
  deleteNotification,
} from "@/lib/api";

function formatNotificationTime(dateStrOrIso: string): string {
  if (!dateStrOrIso) return "";
  const d = new Date(dateStrOrIso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ToastMessage {
  id: string;
  type: "success" | "error";
  message: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Controls
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Delete Confirmation modal/popover state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  // Toast feedback state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: "success" | "error" = "success") => {
    const toastId = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3000);
  };

  const loadNotifications = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchPatientNotifications()
      .then((data) => {
        setNotifications(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch notifications:", err);
        setError("We couldn't retrieve your notifications right now. Please try again.");
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Derived Metrics
  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;

  // Filter Tab base
  let tabFiltered = notifications;
  if (activeTab === "unread") {
    tabFiltered = notifications.filter((n) => !n.isRead);
  } else if (activeTab === "read") {
    tabFiltered = notifications.filter((n) => n.isRead);
  }

  // Search filter
  const searchFiltered = tabFiltered.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const titleMatch = n.title?.toLowerCase().includes(q);
    const messageMatch = n.message?.toLowerCase().includes(q);
    return titleMatch || messageMatch;
  });

  // Sorting
  const sortedNotifications = [...searchFiltered].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (sortOrder === "oldest") {
      return timeA - timeB;
    }
    return timeB - timeA;
  });

  // Pagination (10 per page)
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(sortedNotifications.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, sortedNotifications.length);
  const currentNotifications = sortedNotifications.slice(startIndex, endIndex);

  // Actions
  const handleMarkSingleAsRead = async (id: string) => {
    try {
      const updated = await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      addToast("Notification marked as read.", "success");
    } catch (err: any) {
      console.error("Mark as read error:", err);
      addToast(err?.message || "Failed to mark notification as read.", "error");
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadItems = notifications.filter((n) => !n.isRead);
    if (unreadItems.length === 0) return;

    setIsProcessingAction(true);
    const results = await Promise.allSettled(
      unreadItems.map((n) => markNotificationAsRead(n.id))
    );

    let successCount = 0;
    let failCount = 0;

    const successfulIds = new Set<string>();

    results.forEach((res, idx) => {
      if (res.status === "fulfilled") {
        successCount++;
        successfulIds.add(unreadItems[idx].id);
      } else {
        failCount++;
      }
    });

    if (successfulIds.size > 0) {
      setNotifications((prev) =>
        prev.map((n) => (successfulIds.has(n.id) ? { ...n, isRead: true } : n))
      );
    }

    setIsProcessingAction(false);

    if (failCount === 0) {
      addToast("All notifications marked as read.", "success");
    } else if (successCount > 0) {
      addToast(`Marked ${successCount} notifications as read. (${failCount} failed)`, "error");
    } else {
      addToast("Failed to mark notifications as read.", "error");
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setConfirmDeleteId(null);
      addToast("Notification deleted successfully.", "success");
    } catch (err: any) {
      console.error("Delete notification error:", err);
      addToast(err?.message || "Failed to delete notification.", "error");
    }
  };

  const handleResetSearchAndFilters = () => {
    setSearchQuery("");
    setActiveTab("all");
    setSortOrder("newest");
    setCurrentPage(1);
  };

  return (
    <PatientLayout>
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-space-xl pb-12 relative">
        {/* Toast Notification Stack */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl font-label-md text-label-md transition-all duration-300 ${
                t.type === "success"
                  ? "bg-slate-900 text-white"
                  : "bg-rose-600 text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {t.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{t.message}</span>
            </div>
          ))}
        </div>

        {/* Breadcrumb & Header */}
        <div className="flex flex-col gap-space-xs">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 font-label-sm text-label-sm text-secondary">
            <Link href="/dashboard" className="hover:text-primary transition-colors cursor-pointer">
              Portal
            </Link>
            <span className="material-symbols-outlined text-[14px] text-outline-variant">chevron_right</span>
            <span className="text-primary font-semibold">Notifications</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-1">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                Notifications
              </h1>
              <p className="font-body-md text-body-md text-secondary mt-1">
                Stay updated on your appointments, prescriptions, and important account activity.
              </p>
            </div>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex flex-col gap-space-xl animate-pulse">
            {/* Skeleton Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-slate-200/80 flex items-start justify-between">
                <div className="flex flex-col gap-2 w-3/4">
                  <div className="h-3 bg-surface-container rounded w-32" />
                  <div className="h-8 bg-surface-container-high rounded w-16" />
                </div>
                <div className="w-12 h-12 rounded-full bg-surface-container shrink-0" />
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-slate-200/80 flex items-start justify-between">
                <div className="flex flex-col gap-2 w-3/4">
                  <div className="h-3 bg-surface-container rounded w-32" />
                  <div className="h-8 bg-surface-container-high rounded w-16" />
                </div>
                <div className="w-12 h-12 rounded-full bg-surface-container shrink-0" />
              </div>
            </div>

            {/* Skeleton Controls */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-slate-200/80 flex items-center justify-between">
              <div className="h-9 bg-surface-container rounded-lg w-64" />
              <div className="h-9 bg-surface-container rounded-lg w-48" />
            </div>

            {/* Skeleton Notification Items */}
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-slate-200/80 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-surface-container shrink-0" />
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="h-4 bg-surface-container rounded w-48" />
                      <div className="h-3.5 bg-surface-container-high rounded w-full" />
                      <div className="h-3 bg-surface-container rounded w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API ERROR STATE */}
        {!isLoading && error && (
          <div className="bg-surface-container-lowest border border-slate-200/80 rounded-2xl p-10 lg:p-16 shadow-sm flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-6">
            <div className="w-20 h-20 rounded-full bg-error-container text-error flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-[36px]">error</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              Unable to load notifications
            </h2>
            <p className="font-body-md text-body-md text-secondary mt-2 max-w-md">
              We couldn't retrieve your notifications right now. Please try again.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={loadNotifications}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-medium transition-all shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                <span>Try Again</span>
              </button>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-medium transition-all"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* ZERO NOTIFICATIONS EMPTY STATE */}
        {!isLoading && !error && totalCount === 0 && (
          <div className="bg-surface-container-lowest border border-slate-200/80 rounded-2xl p-10 lg:p-16 shadow-sm flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-[36px]">mark_email_read</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              You're all caught up
            </h2>
            <p className="font-body-md text-body-md text-secondary mt-2 max-w-md">
              You don't have any notifications right now. We'll let you know when something important happens.
            </p>
          </div>
        )}

        {/* MAIN NOTIFICATION CONTENT */}
        {!isLoading && !error && totalCount > 0 && (
          <>
            {/* Notification Summary Metrics (2-Card Row) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              {/* Card 1: Unread Notifications */}
              <div className="relative overflow-hidden bg-surface-container-lowest border border-slate-200/80 rounded-xl p-space-lg shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold text-secondary">
                    Unread Notifications
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-data-metric text-data-metric text-on-surface font-bold">
                      {unreadCount}
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-error-container text-on-error-container">
                        Requires Attention
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[24px]">notifications_active</span>
                </div>
              </div>

              {/* Card 2: Total Received */}
              <div className="relative overflow-hidden bg-surface-container-lowest border border-slate-200/80 rounded-xl p-space-lg shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold text-secondary">
                    Total Notifications
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-data-metric text-data-metric text-on-surface font-bold">
                      {totalCount}
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm font-medium bg-surface-container text-on-surface-variant">
                      Total Inbox Records
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-secondary-container shrink-0">
                  <span className="material-symbols-outlined text-[24px]">inbox</span>
                </div>
              </div>
            </div>

            {/* Controls & Filter Bar */}
            <div className="bg-surface-container-lowest border border-slate-200/80 rounded-xl p-space-md shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("all");
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-1.5 rounded-md font-label-md text-label-md font-semibold transition-all whitespace-nowrap ${
                    activeTab === "all"
                      ? "bg-surface-container-lowest text-primary shadow-sm"
                      : "text-secondary hover:text-on-surface"
                  }`}
                >
                  All{" "}
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold text-xs">
                    {totalCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("unread");
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-1.5 rounded-md font-label-md text-label-md font-medium transition-all whitespace-nowrap ${
                    activeTab === "unread"
                      ? "bg-surface-container-lowest text-primary shadow-sm font-semibold"
                      : "text-secondary hover:text-on-surface"
                  }`}
                >
                  Unread{" "}
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-error-container text-on-error-container font-bold text-xs">
                    {unreadCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("read");
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-1.5 rounded-md font-label-md text-label-md font-medium transition-all whitespace-nowrap ${
                    activeTab === "read"
                      ? "bg-surface-container-lowest text-primary shadow-sm font-semibold"
                      : "text-secondary hover:text-on-surface"
                  }`}
                >
                  Read{" "}
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-surface-container text-secondary font-bold text-xs">
                    {readCount}
                  </span>
                </button>
              </div>

              {/* Search, Sort & Mark All Read */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-space-sm w-full lg:w-auto">
                {/* Search Input */}
                <div className="relative flex-1 sm:w-64">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search notifications..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-slate-200/60"
                  />
                </div>

                {/* Sort Dropdown */}
                <div className="relative shrink-0">
                  <select
                    value={sortOrder}
                    onChange={(e) => {
                      setSortOrder(e.target.value as "newest" | "oldest");
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-surface-container-low pl-3 pr-8 py-2 rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all border border-slate-200/60"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary text-[16px] pointer-events-none">
                    expand_more
                  </span>
                </div>

                {/* Mark All as Read */}
                <button
                  type="button"
                  disabled={unreadCount === 0 || isProcessingAction}
                  onClick={handleMarkAllAsRead}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-label-md text-label-md font-medium transition-all shrink-0 ${
                    unreadCount === 0 || isProcessingAction
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-surface-container-low hover:bg-surface-container text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">done_all</span>
                  <span className="hidden sm:inline">Mark All as Read</span>
                  <span className="sm:hidden">Mark Read</span>
                </button>
              </div>
            </div>

            {/* UNREAD EMPTY STATE */}
            {activeTab === "unread" && tabFiltered.length === 0 && (
              <div className="bg-surface-container-lowest border border-slate-200/80 rounded-2xl p-10 lg:p-16 shadow-sm flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-6">
                <div className="w-20 h-20 rounded-full bg-surface-container text-secondary flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-[36px]">done_all</span>
                </div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  No unread notifications
                </h2>
                <p className="font-body-md text-body-md text-secondary mt-2 max-w-md">
                  You're all caught up.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("all");
                    setCurrentPage(1);
                  }}
                  className="mt-6 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-medium transition-all shadow-sm"
                >
                  View All Notifications
                </button>
              </div>
            )}

            {/* SEARCH EMPTY STATE */}
            {searchQuery.trim() !== "" && sortedNotifications.length === 0 && (
              <div className="bg-surface-container-lowest border border-slate-200/80 rounded-2xl p-10 lg:p-16 shadow-sm flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-6">
                <div className="w-20 h-20 rounded-full bg-surface-container text-secondary flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-[36px]">search_off</span>
                </div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  No matching notifications
                </h2>
                <p className="font-body-md text-body-md text-secondary mt-2 max-w-md">
                  Try adjusting your search or clearing your filters.
                </p>
                <button
                  type="button"
                  onClick={handleResetSearchAndFilters}
                  className="mt-6 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-medium transition-all"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* NOTIFICATION CARDS LIST */}
            {sortedNotifications.length > 0 && (
              <div className="flex flex-col gap-3">
                {currentNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`relative rounded-xl p-4 sm:p-5 shadow-sm transition-all hover:shadow-md flex flex-col sm:flex-row items-start justify-between gap-4 border ${
                      !notif.isRead
                        ? "bg-surface-container-lowest border-slate-200/80"
                        : "bg-surface-container-lowest/80 border-slate-200/60"
                    }`}
                  >
                    {/* Subtle Teal Left Accent Indicator for Unread */}
                    {!notif.isRead && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r" />
                    )}

                    <div className="flex items-start gap-3.5 pl-1.5 sm:pl-2 min-w-0 flex-1">
                      {/* Generic Info/Notification Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          !notif.isRead
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-container text-secondary"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[22px]">
                          {!notif.isRead ? "notifications_active" : "notifications"}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          )}
                          <h2
                            className={`font-headline-sm text-headline-sm tracking-tight ${
                              !notif.isRead
                                ? "font-semibold text-on-surface"
                                : "font-medium text-secondary"
                            }`}
                          >
                            {notif.title}
                          </h2>
                        </div>
                        <p
                          className={`font-body-md text-body-md mt-1 leading-relaxed ${
                            !notif.isRead ? "text-on-surface" : "text-secondary"
                          }`}
                        >
                          {notif.message}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2.5 font-label-sm text-label-sm text-secondary">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            <span>{formatNotificationTime(notif.createdAt)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end w-full sm:w-auto gap-2 shrink-0 pt-2 sm:pt-0">
                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkSingleAsRead(notif.id)}
                          title="Mark as read"
                          className="p-1.5 rounded-lg hover:bg-surface-container-low text-secondary hover:text-primary transition-colors flex items-center"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </button>
                      )}

                      {confirmDeleteId === notif.id ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-lg border border-rose-200 animate-fadeIn">
                          <span className="font-label-sm text-xs text-rose-700 font-semibold px-1">Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteNotification(notif.id)}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-label-sm text-xs rounded transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-label-sm text-xs rounded transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(notif.id)}
                          title="Delete notification"
                          className="p-1.5 rounded-lg hover:bg-error-container text-secondary hover:text-error transition-colors flex items-center"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* PAGINATION */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-space-sm bg-surface-container-lowest px-space-lg rounded-xl shadow-sm border border-slate-200/80 mt-2">
                  <span className="font-label-sm text-label-sm text-secondary">
                    Showing <span className="font-semibold text-on-surface">{startIndex + 1}–{endIndex}</span> of{" "}
                    <span className="font-semibold text-on-surface">{sortedNotifications.length}</span> notifications
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Previous Page"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-secondary transition-colors ${
                        currentPage === 1
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-surface-container text-on-surface cursor-pointer"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>

                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-label-md text-label-md transition-colors ${
                          currentPage === pageNum
                            ? "bg-primary text-on-primary font-semibold shadow-sm"
                            : "text-secondary hover:bg-surface-container"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      type="button"
                      aria-label="Next Page"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-secondary transition-colors ${
                        currentPage === totalPages
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-surface-container text-on-surface cursor-pointer"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PatientLayout>
  );
}
