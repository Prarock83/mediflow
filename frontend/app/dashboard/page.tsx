import PatientLayout from "@/components/patient/PatientLayout";
import DashboardHeader from "@/components/patient/DashboardHeader";
import DashboardStats from "@/components/patient/DashboardStats";
import UpcomingAppointmentCard from "@/components/patient/UpcomingAppointmentCard";
import QuickActions from "@/components/patient/QuickActions";
import RecentActivity from "@/components/patient/RecentActivity";
import RecommendedDoctors from "@/components/patient/RecommendedDoctors";

export default function PatientDashboardPage() {
  return (
    <PatientLayout unreadNotificationsCount={2}>
      <div className="flex flex-col w-full gap-space-lg max-w-7xl mx-auto">
        {/* Top Welcome Banner */}
        <DashboardHeader />

        {/* Key Metric Overview Row */}
        <DashboardStats />

        {/* Main Two-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* Left Column: ~65% (8 of 12 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            {/* 1. Next Scheduled Appointment */}
            <UpcomingAppointmentCard />

            {/* 2. Quick Clinical Actions */}
            <QuickActions />

            {/* 3. Recent Medical Activity */}
            <RecentActivity />
          </div>

          {/* Right Column: ~35% (4 of 12 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-space-lg">
            {/* Recommended Doctors */}
            <RecommendedDoctors />
          </div>
        </div>
      </div>
    </PatientLayout>
  );
}
