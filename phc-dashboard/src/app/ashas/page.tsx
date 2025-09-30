"use client";

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import DashboardLayout from '../../components/DashboardLayout';
import Link from 'next/link';
import AshaProfileCard from '../../components/AshaProfileCard';

export default function ASHAs() {
  const [ashaList, setAshaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      // Find distinct asha_ids from patients
      const patientsSnapshot = await getDocs(query(collection(db, 'patients'), orderBy('created_at', 'desc')));
      const ashaSet = new Set<string>();
      patientsSnapshot.docs.forEach(d => {
        const data: any = d.data(); if (data?.asha_id) ashaSet.add(data.asha_id);
      });

      const ashaIds = Array.from(ashaSet);
      // For each ashaId, fetch counts and profile (if users collection exists)
      const results: any[] = await Promise.all(ashaIds.map(async (ashaId) => {
        const patientsForAsha = await getDocs(query(collection(db, 'patients'), where('asha_id', '==', ashaId), orderBy('created_at', 'desc'), ));
        const visitsForAsha = await getDocs(query(collection(db, 'visits'), where('asha_id', '==', ashaId)));
        const vacForAsha = await getDocs(query(collection(db, 'vaccinations'), where('asha_id', '==', ashaId)));

        // try to fetch profile from users collection
        let profile = { id: ashaId };
        try {
          const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', ashaId)));
          if (!userSnap.empty) profile = { id: ashaId, ...userSnap.docs[0].data() };
        } catch (e) {
          // users collection may not exist or readable; ignore
        }

        return {
          ashaId,
          profile,
          counts: {
            patients: patientsForAsha.size,
            visits: visitsForAsha.size,
            vaccinations: vacForAsha.size,
          }
        };
      }));

      setAshaList(results);
    } catch (error) {
      console.error('Error loading ASHAs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ASHAs</h1>
          <p className="text-gray-600 mt-2">Click an ASHA to view her patients, visits and vaccinations</p>
        </div>

        {ashaList.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">No ASHA activity found yet</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ashaList.map(item => (
              <Link key={item.ashaId} href={`/ashas/${item.ashaId}`} className="block">
                <AshaProfileCard profile={item.profile} counts={item.counts} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
