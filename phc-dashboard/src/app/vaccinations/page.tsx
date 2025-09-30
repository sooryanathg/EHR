"use client";

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import DashboardLayout from '../../components/DashboardLayout';

export default function Vaccinations() {
  const [vaccinations, setVaccinations] = useState([] as any[]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadVaccinations();
  }, []);

  const loadVaccinations = async () => {
    try {
      const vaccinationsSnapshot = await getDocs(
        query(collection(db, 'vaccinations'), orderBy('due_date', 'asc'))
      );
      
      const vaccinationsData = vaccinationsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // Fetch all patients once and build a map to avoid N+1 queries
      const patientsSnapshot = await getDocs(query(collection(db, 'patients')));
      const patientMap = new Map<string, any>();
      patientsSnapshot.docs.forEach(doc => {
        const data = doc.data() as any;
        if (data?.local_id) patientMap.set(data.local_id, data);
      });

      const vaccinationsWithNames = vaccinationsData.map((vaccination: any) => {
        const patient = patientMap.get(vaccination.patient_id);
        return {
          ...vaccination,
          patient_name: patient?.name || 'Unknown Patient',
          patient_village: patient?.village || 'Unknown Village'
        };
      });

      setVaccinations(vaccinationsWithNames);
    } catch (error) {
      console.error('Error loading vaccinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVaccinations = vaccinations.filter((vaccination: any) => {
    const matchesSearch = 
      vaccination.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaccination.patient_village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaccination.vaccine_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || vaccination.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'given': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'given': return '✅';
      case 'pending': return '⏳';
      case 'overdue': return '⚠️';
      default: return '❓';
    }
  };

  const isOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vaccinations</h1>
            <p className="text-gray-600 mt-2">Track vaccination schedules and status</p>
          </div>
          <div className="text-sm text-gray-500">
            Total: {vaccinations.length} vaccinations
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search vaccinations by patient name, village, or vaccine name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="given">Given</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vaccinations List */}
        <div className="space-y-4">
          {filteredVaccinations.length > 0 ? (
            filteredVaccinations.map((vaccination: any) => {
              const isOverdueVaccination = isOverdue(vaccination.due_date);
              const daysUntil = getDaysUntilDue(vaccination.due_date);
              
              return (
                <div key={vaccination.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <span className="text-3xl">💉</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {vaccination.vaccine_name}
                          </h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vaccination.status)}`}>
                            {getStatusIcon(vaccination.status)} {vaccination.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {vaccination.patient_name} • {vaccination.patient_village}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span>Due: {formatDate(vaccination.due_date)}</span>
                          {vaccination.given_date && (
                            <span className="text-green-600">
                              Given: {formatDate(vaccination.given_date)}
                            </span>
                          )}
                          {vaccination.status === 'pending' && !isOverdueVaccination && (
                            <span className="text-blue-600">
                              {daysUntil === 0 ? 'Due today' : 
                               daysUntil === 1 ? 'Due tomorrow' : 
                               `${daysUntil} days remaining`}
                            </span>
                          )}
                          {isOverdueVaccination && vaccination.status === 'pending' && (
                            <span className="text-red-600 font-medium">
                              {Math.abs(daysUntil)} days overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>Due Date</div>
                      <div className="font-medium">{formatDate(vaccination.due_date)}</div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">💉</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'all' ? 'No vaccinations found' : 'No vaccinations recorded yet'}
              </h3>
              <p className="text-gray-500">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Vaccinations will appear here once ASHA workers start recording them'
                }
              </p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {vaccinations.filter((v: any) => v.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {vaccinations.filter((v: any) => v.status === 'given').length}
              </div>
              <div className="text-sm text-gray-600">Given</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {vaccinations.filter((v: any) => v.status === 'overdue' || (v.status === 'pending' && isOverdue(v.due_date))).length}
              </div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {vaccinations.length}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
