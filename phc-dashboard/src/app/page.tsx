"use client";

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, Firestore } from 'firebase/firestore';
import { Auth, User } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';
import StatsCard from '../components/StatsCard';
import RecentActivity from '../components/RecentActivity';
import UpcomingVisits from '../components/UpcomingVisits';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalVisits: 0,
    pendingVaccinations: 0,
    overdueVisits: 0
  });
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    // Check authentication state
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
        if (user) {
          loadDashboardData();
        } else {
          router.push('/login');
        }
      });

      return () => unsubscribe();
    } else {
      // If auth is not available, redirect to login
      router.push('/login');
    }
  }, [router]);

  const loadDashboardData = async () => {
    if (!auth?.currentUser) {
      router.push('/login');
      return;
    }

    setLoading(true);

    try {
      // Get all patients
      const patientsSnapshot = await getDocs(collection(db, 'patients'));
      const totalPatients = patientsSnapshot.size;

      // Get all visits
      const visitsSnapshot = await getDocs(collection(db, 'visits'));
      const totalVisits = visitsSnapshot.size;

      // Get pending vaccinations
      const vaccinationsSnapshot = await getDocs(
        query(collection(db, 'vaccinations'), where('status', '==', 'pending'))
      );
      const pendingVaccinations = vaccinationsSnapshot.size;

      // Get overdue visits (visits with next_visit in the past)
      const today = new Date().toISOString().split('T')[0];
      const visitsData = visitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const overdueVisits = visitsData.filter(visit => 
        visit.next_visit && visit.next_visit < today
      ).length;

      setStats({
        totalPatients,
        totalVisits,
        pendingVaccinations,
        overdueVisits
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of ASHA EHR data</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Patients"
            value={stats.totalPatients}
            icon="👥"
            color="blue"
          />
          <StatsCard
            title="Total Visits"
            value={stats.totalVisits}
            icon="🏥"
            color="green"
          />
          <StatsCard
            title="Pending Vaccinations"
            value={stats.pendingVaccinations}
            icon="💉"
            color="yellow"
          />
          <StatsCard
            title="Overdue Visits"
            value={stats.overdueVisits}
            icon="⚠️"
            color="red"
          />
        </div>

        {/* Recent Activity and Upcoming Visits */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RecentActivity />
          <UpcomingVisits />
        </div>
      </div>
    </DashboardLayout>
  );
}