"use client";

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import DashboardLayout from '../../components/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState({
    visitsByType: [] as any[],
    vaccinationsByStatus: [] as any[],
    patientsByVillage: [] as any[],
    monthlyVisits: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      // Get all visits
      const visitsSnapshot = await getDocs(collection(db, 'visits'));
      const visitsData = visitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get all vaccinations
      const vaccinationsSnapshot = await getDocs(collection(db, 'vaccinations'));
      const vaccinationsData = vaccinationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get all patients
      const patientsSnapshot = await getDocs(collection(db, 'patients'));
      const patientsData = patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Process visits by type
      const visitsByType = visitsData.reduce((acc: any, visit: any) => {
        acc[visit.type] = (acc[visit.type] || 0) + 1;
        return acc;
      }, {});

      const visitsByTypeChart = Object.entries(visitsByType).map(([type, count]) => ({
        type: type.toUpperCase(),
        count
      }));

      // Process vaccinations by status
      const vaccinationsByStatus = vaccinationsData.reduce((acc: any, vaccination: any) => {
        acc[vaccination.status] = (acc[vaccination.status] || 0) + 1;
        return acc;
      }, {});

      const vaccinationsByStatusChart = Object.entries(vaccinationsByStatus).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count
      }));

      // Process patients by village
      const patientsByVillage = patientsData.reduce((acc: any, patient: any) => {
        acc[patient.village] = (acc[patient.village] || 0) + 1;
        return acc;
      }, {});

      const patientsByVillageChart = Object.entries(patientsByVillage)
        .map(([village, count]) => ({ village, count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 10); // Top 10 villages

      // Process monthly visits
      const monthlyVisits = visitsData.reduce((acc: any, visit: any) => {
        const month = new Date(visit.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

      const monthlyVisitsChart = Object.entries(monthlyVisits)
        .map(([month, count]) => ({ month, count }))
        .sort((a: any, b: any) => new Date(a.month).getTime() - new Date(b.month).getTime());

      setAnalyticsData({
        visitsByType: visitsByTypeChart,
        vaccinationsByStatus: vaccinationsByStatusChart,
        patientsByVillage: patientsByVillageChart,
        monthlyVisits: monthlyVisitsChart
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">Data insights and trends</p>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Visits by Type */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Visits by Type</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.visitsByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3498db" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Vaccinations by Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vaccinations by Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.vaccinationsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData.vaccinationsByStatus.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Patients by Village */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Villages by Patient Count</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.patientsByVillage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="village" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#27ae60" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Visits Trend */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Visits Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.monthlyVisits}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#e74c3c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analyticsData.visitsByType.reduce((sum: number, item: any) => sum + item.count, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Visits</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analyticsData.vaccinationsByStatus.reduce((sum: number, item: any) => sum + item.count, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Vaccinations</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {analyticsData.patientsByVillage.reduce((sum: number, item: any) => sum + item.count, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Patients</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {analyticsData.patientsByVillage.length}
              </div>
              <div className="text-sm text-gray-600">Villages Covered</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
