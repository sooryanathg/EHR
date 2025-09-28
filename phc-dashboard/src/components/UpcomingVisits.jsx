"use client";

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

const UpcomingVisits = () => {
  const [upcomingVisits, setUpcomingVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingVisits();
  }, []);

  const loadUpcomingVisits = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Get visits with next_visit in the next 7 days
      const visitsSnapshot = await getDocs(collection(db, 'visits'));
      const visitsData = visitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const upcoming = visitsData.filter(visit => 
        visit.next_visit && visit.next_visit >= today && visit.next_visit <= nextWeek
      );

      // Get patient names for upcoming visits
      const upcomingWithNames = await Promise.all(
        upcoming.map(async (visit) => {
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

      // Sort by next_visit date
      upcomingWithNames.sort((a, b) => new Date(a.next_visit) - new Date(b.next_visit));
      
      setUpcomingVisits(upcomingWithNames.slice(0, 5)); // Show only next 5
    } catch (error) {
      console.error('Error loading upcoming visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilVisit = (dateString) => {
    const today = new Date();
    const visitDate = new Date(dateString);
    const diffTime = visitDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getVisitIcon = (type) => {
    switch (type) {
      case 'anc': return '🤱';
      case 'immunization': return '💉';
      case 'general': return '🏥';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Visits</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Visits</h2>
      <div className="space-y-4">
        {upcomingVisits.length > 0 ? (
          upcomingVisits.map((visit) => {
            const daysUntil = getDaysUntilVisit(visit.next_visit);
            return (
              <div key={visit.id} className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{getVisitIcon(visit.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {visit.patient_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {visit.patient_village} • {formatDate(visit.next_visit)}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      daysUntil === 0 ? 'bg-red-100 text-red-800' :
                      daysUntil === 1 ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {daysUntil === 0 ? 'Today' : 
                       daysUntil === 1 ? 'Tomorrow' : 
                       `${daysUntil} days`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500 text-center py-4">No upcoming visits</p>
        )}
      </div>
    </div>
  );
};

export default UpcomingVisits;
