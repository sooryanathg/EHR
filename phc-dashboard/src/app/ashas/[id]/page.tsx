"use client";

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import DashboardLayout from '../../../components/DashboardLayout';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AshaProfileCard from '../../../components/AshaProfileCard';
import { 
  UsersIcon, ClockIcon, BeakerIcon,
  MapPinIcon, IdentificationIcon, UserIcon,
  CalendarIcon, ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

export default function ASHADetail() {
  const params = useParams() as { id: string };
  const ashaId = params?.id;
  const [patients, setPatients] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [ashaProfile, setAshaProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'patients'|'visits'|'vaccinations'>('patients');
  const [patientsLimit, setPatientsLimit] = useState(20);
  const [visitsLimit, setVisitsLimit] = useState(20);
  const [vaccinationsLimit, setVaccinationsLimit] = useState(20);

  const tabs = [
    { id: 'patients', label: 'Patients', icon: UsersIcon, count: patients.length, setLimit: setPatientsLimit, limit: patientsLimit },
    { id: 'visits', label: 'Visits', icon: ClipboardDocumentCheckIcon, count: visits.length, setLimit: setVisitsLimit, limit: visitsLimit },
    { id: 'vaccinations', label: 'Vaccinations', icon: BeakerIcon, count: vaccinations.length, setLimit: setVaccinationsLimit, limit: vaccinationsLimit },
  ];

  useEffect(() => {
    if (ashaId) loadData();
  }, [ashaId, patientsLimit, visitsLimit, vaccinationsLimit]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // load asha profile (users/{id}) if present
      try {
        const uDoc = await getDoc(doc(db, 'users', ashaId));
        if (uDoc.exists()) setAshaProfile({ id: uDoc.id, ...uDoc.data() });
      } catch (e) {
        console.warn('Could not load ASHA profile', e);
      }
      const pSnap = await getDocs(query(collection(db, 'patients'), where('asha_id', '==', ashaId), orderBy('created_at', 'desc'), limit(patientsLimit)));
      setPatients(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const vSnap = await getDocs(query(collection(db, 'visits'), where('asha_id', '==', ashaId), orderBy('created_at', 'desc'), limit(visitsLimit)));
      setVisits(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const vacSnap = await getDocs(query(collection(db, 'vaccinations'), where('asha_id', '==', ashaId), orderBy('due_date', 'asc'), limit(vaccinationsLimit)));
      setVaccinations(vacSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error: any) {
      console.error('Error loading ASHA data:', error);
      setError(error?.message || 'Failed to load data');
      setPatients([]);
      setVisits([]);
      setVaccinations([]);
    } finally {
      setLoading(false);
    }
  };

  if (!ashaId) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-800 rounded-lg">
            <IdentificationIcon className="h-5 w-5" />
            <span>No ASHA selected</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-800 rounded-lg">
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadData()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Try again
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <p className="text-sm text-gray-500">Loading ASHA data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <div className="col-span-1">
          <AshaProfileCard
            profile={ashaProfile ?? { id: ashaId }}
            counts={{ patients: patients.length, visits: visits.length, vaccinations: vaccinations.length }}
          />
        </div>

        <div className="col-span-1 lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{ashaProfile?.name || `ASHA: ${ashaId}`}</h1>
                <p className="text-sm text-gray-500 mt-1">Activity overview and records</p>
              </div>
              <div className="flex items-center bg-gray-50 p-1 rounded-lg shadow-sm">
                {tabs.map(({ id, label, icon: Icon, count }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                      tab === id 
                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                    <span className="text-sm text-gray-500">({count})</span>
                  </button>
                ))}
              </div>
            </div>

            {tab === 'patients' && (
              <div className="animate-in slide-in-from-right">
                <div className="grid gap-4">
                  {patients.map(p => (
                    <div key={p.id} className="group p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-full">
                          <UserIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{p.name || '—'}</h3>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">{p.gender || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <MapPinIcon className="h-4 w-4" />
                            <span>{p.village || '—'}</span>
                          </div>
                        </div>
                        <Link href={`/patients/${p.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                            View Profile
                          </button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'visits' && (
              <div className="animate-in slide-in-from-right">
                <div className="grid gap-4">
                  {visits.map(v => {
                    const patient = patients.find(pt => pt.id === v.patient_id);
                    return (
                      <div key={v.id} className="group p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-green-50 rounded-full">
                            <ClipboardDocumentCheckIcon className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{v.type || 'Visit'}</h3>
                              <span className="text-sm text-gray-500">•</span>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <CalendarIcon className="h-4 w-4" />
                                <span>{v.date || v.created_at || '—'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              <UserIcon className="h-4 w-4" />
                              <span>Patient: {patient?.name || v.patient_id}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/visits/${v.id}`}>
                              <button className="px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-md transition-colors">
                                View Details
                              </button>
                            </Link>
                            <button
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'visits', v.id), { validated: true });
                                  // reload data
                                  loadData();
                                } catch (e) {
                                  console.error('Failed to validate visit', e);
                                }
                              }}
                              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                            >
                              Validate
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === 'vaccinations' && (
              <div className="animate-in slide-in-from-right">
                <div className="grid gap-4">
                  {vaccinations.map(vc => {
                    const patient = patients.find(pt => pt.id === vc.patient_id);
                    return (
                      <div key={vc.id} className="group p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-purple-50 rounded-full">
                            <BeakerIcon className="h-6 w-6 text-purple-600" />
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{vc.vaccine_name || 'Vaccine'}</h3>
                              <span className="text-sm text-gray-500">•</span>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <CalendarIcon className="h-4 w-4" />
                                <span>Due: {vc.due_date || '—'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              <UserIcon className="h-4 w-4" />
                              <span>Patient: {patient?.name || vc.patient_id}</span>
                            </div>
                          </div>
                          <Link href={`/vaccinations/${vc.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-md transition-colors">
                              View Details
                            </button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Load More Button */}
            {(() => {
              const currentTab = tabs.find(t => t.id === tab);
              if (!currentTab) return null;
              return (
                <div className="mt-6 flex justify-center">
                  <button 
                    onClick={() => currentTab.setLimit(l => l + 20)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Load more
                    <ClockIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
