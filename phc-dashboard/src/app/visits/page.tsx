"use client";

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import DashboardLayout from '../../components/DashboardLayout';

export default function Visits() {
  const [visits, setVisits] = useState([] as any[]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    try {
      const visitsSnapshot = await getDocs(
        query(collection(db, 'visits'), orderBy('created_at', 'desc'))
      );
      
      const visitsData = visitsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // Get patient names for visits
      const visitsWithNames = await Promise.all(
        visitsData.map(async (visit: any) => {
          const patientSnapshot = await getDocs(
            query(collection(db, 'patients'), where('local_id', '==', visit.patient_id))
          );
          const patient = patientSnapshot.docs[0]?.data();
          return {
            ...visit,
            patient_name: patient?.name || 'Unknown Patient',
            patient_village: patient?.village || 'Unknown Village'
          };
        })
      );
      
      setVisits(visitsWithNames);
    } catch (error) {
      console.error('Error loading visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisits = visits.filter((visit: any) => {
    const matchesSearch = 
      visit.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.patient_village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || visit.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVisitIcon = (type: string) => {
    switch (type) {
      case 'anc': return '🤱';
      case 'immunization': return '💉';
      case 'general': return '🏥';
      default: return '📋';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'anc': return 'bg-pink-100 text-pink-800';
      case 'immunization': return 'bg-blue-100 text-blue-800';
      case 'general': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visits</h1>
            <p className="text-gray-600 mt-2">View all health visits</p>
          </div>
          <div className="text-sm text-gray-500">
            Total: {visits.length} visits
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search visits by patient name, village, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="anc">ANC</option>
                <option value="immunization">Immunization</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
        </div>

        {/* Visits List */}
        <div className="space-y-4">
          {filteredVisits.length > 0 ? (
            filteredVisits.map((visit: any) => (
              <div key={visit.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <span className="text-3xl">{getVisitIcon(visit.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {visit.patient_name}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(visit.type)}`}>
                          {visit.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {visit.patient_village} • {formatDate(visit.date)}
                      </p>
                      {visit.notes && (
                        <p className="text-sm text-gray-700 mb-2">
                          {visit.notes}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        {visit.bp_systolic && visit.bp_diastolic && (
                          <span>BP: {visit.bp_systolic}/{visit.bp_diastolic}</span>
                        )}
                        {visit.weight && (
                          <span>Weight: {visit.weight} kg</span>
                        )}
                        {visit.next_visit && (
                          <span className="text-green-600">
                            Next visit: {new Date(visit.next_visit).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>Visit Date</div>
                    <div className="font-medium">{formatDate(visit.date)}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterType !== 'all' ? 'No visits found' : 'No visits recorded yet'}
              </h3>
              <p className="text-gray-500">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Visits will appear here once ASHA workers start recording them'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
