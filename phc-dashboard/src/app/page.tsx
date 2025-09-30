"use client";

import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Link from 'next/link';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  UserGroupIcon, ClockIcon, BeakerIcon, ExclamationCircleIcon, 
  ArrowPathIcon, UsersIcon, PresentationChartLineIcon,
  ChartBarSquareIcon
} from '@heroicons/react/24/outline';

function StatCard({ title, value, icon, accentColor = 'blue', loading }: { 
  title: string; 
  value: number | string;
  icon: React.ReactNode;
  accentColor?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-8 w-8 rounded-lg bg-gray-200 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden group hover:shadow-lg transition duration-300">
      <div className={`inline-flex p-2 rounded-lg ${colors[accentColor]} mb-4`}>
        {icon}
      </div>
      <div className="text-sm font-medium text-gray-600 mb-2">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className={`absolute inset-0 ${colors[accentColor].split(' ')[0]} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
    </div>
  );
}

export default function Dashboard() {
  const [counts, setCounts] = useState({
    patients: 0,
    visits: 0,
    vaccinations: 0,
    pendingVaccinations: 0,
    overdueVisits: 0,
  });

  useEffect(() => {
    let mounted = true;
    const loadCounts = async () => {
      try {
        const patientsCount = await getCountFromServer(query(collection(db, 'patients')));
        const visitsCount = await getCountFromServer(query(collection(db, 'visits')));
        const vacCount = await getCountFromServer(query(collection(db, 'vaccinations')));
        const pendingVac = await getCountFromServer(query(collection(db, 'vaccinations'), where('status', '==', 'pending')));

        // Overdue visits: compare next_visit < today (assumes ISO date string storage yyyy-mm-dd)
        const today = new Date().toISOString().split('T')[0];
        const overdue = await getCountFromServer(query(collection(db, 'visits'), where('next_visit', '<', today)));

        if (!mounted) return;
        setCounts({
          patients: patientsCount.data().count,
          visits: visitsCount.data().count,
          vaccinations: vacCount.data().count,
          pendingVaccinations: pendingVac.data().count,
          overdueVisits: overdue.data().count,
        });
      } catch (error) {
        console.error('Error loading counts:', error);
      }
    };

    loadCounts();
    return () => { mounted = false; };
  }, []);

  const loading = counts.patients === 0; // Simple loading check

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="bg-gradient-to-br from-blue-50 via-blue-50/50 to-white -mx-6 -mt-6 px-6 py-8 border-b">
          <h1 className="text-3xl font-bold text-gray-900">PHC Dashboard</h1>
          <p className="text-gray-600 mt-2 max-w-3xl">
            Primary Health Center management dashboard with real-time insights and activity tracking
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard 
            title="Total Patients" 
            value={counts.patients} 
            icon={<UserGroupIcon className="w-6 h-6" />}
            accentColor="blue"
            loading={loading}
          />
          <StatCard 
            title="Total Visits" 
            value={counts.visits} 
            icon={<ClockIcon className="w-6 h-6" />}
            accentColor="green"
            loading={loading}
          />
          <StatCard 
            title="Total Vaccinations" 
            value={counts.vaccinations} 
            icon={<BeakerIcon className="w-6 h-6" />}
            accentColor="purple"
            loading={loading}
          />
          <StatCard 
            title="Pending Vaccinations" 
            value={counts.pendingVaccinations} 
            icon={<ArrowPathIcon className="w-6 h-6" />}
            accentColor="yellow"
            loading={loading}
          />
          <StatCard 
            title="Overdue Visits" 
            value={counts.overdueVisits} 
            icon={<ExclamationCircleIcon className="w-6 h-6" />}
            accentColor="red"
            loading={loading}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link 
              href="/patients" 
              className="group flex items-start p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 relative overflow-hidden"
            >
              <div className="flex-shrink-0 p-3 rounded-lg bg-blue-50 text-blue-600 mr-4">
                <UsersIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">Patients</h2>
                <p className="text-sm text-gray-500 mt-2">Manage patient records and track health status</p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-blue-50/0 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>

            <Link 
              href="/ashas" 
              className="group flex items-start p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 relative overflow-hidden"
            >
              <div className="flex-shrink-0 p-3 rounded-lg bg-green-50 text-green-600 mr-4">
                <UserGroupIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold group-hover:text-green-600 transition-colors">ASHAs</h2>
                <p className="text-sm text-gray-500 mt-2">View ASHA workers and their activity records</p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/0 via-green-50/0 to-green-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>

            <Link 
              href="/analytics" 
              className="group flex items-start p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 relative overflow-hidden"
            >
              <div className="flex-shrink-0 p-3 rounded-lg bg-purple-50 text-purple-600 mr-4">
                <ChartBarSquareIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold group-hover:text-purple-600 transition-colors">Analytics</h2>
                <p className="text-sm text-gray-500 mt-2">Review health metrics and population insights</p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/0 via-purple-50/0 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}