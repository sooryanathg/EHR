"use client";

import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, limit, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    try {
      // Get recent visits
      const visitsSnapshot = await getDocs(
        query(collection(db, 'visits'), orderBy('created_at', 'desc'), limit(5))
      );
      
      const visitsData = visitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Get patient names for visits
      const activitiesWithNames = await Promise.all(
        visitsData.map(async (visit) => {
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

      setActivities(activitiesWithNames);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type) => {
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
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
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <span className="text-2xl">{getActivityIcon(activity.type)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {activity.patient_name} - {activity.type.toUpperCase()} Visit
                </p>
                <p className="text-sm text-gray-500">
                  {activity.patient_village} • {formatDate(activity.created_at)}
                </p>
                {activity.notes && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {activity.notes}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-4">No recent activity</p>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;
