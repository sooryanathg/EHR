import db from './schema';
import * as Notifications from 'expo-notifications';
import { SyncQueueService } from './syncQueueService';
import { differenceInWeeks, addWeeks, addDays, parseISO, format } from 'date-fns';

// ANC visit schedule configuration
const ANC_SCHEDULE = [
  { week: 12, name: 'ANC1', windowBefore: 2, windowAfter: 2 },
  { week: 20, name: 'ANC2', windowBefore: 2, windowAfter: 2 },
  { week: 28, name: 'ANC3', windowBefore: 2, windowAfter: 2 },
  { week: 36, name: 'ANC4', windowBefore: 1, windowAfter: 1 }
];

// Immunization schedule configuration (age in weeks)
const IMMUNIZATION_SCHEDULE = [
  { week: 0, name: 'BCG', windowBefore: 0, windowAfter: 2 },
  { week: 6, name: 'OPV1', windowBefore: 0, windowAfter: 2 },
  { week: 6, name: 'DPT1', windowBefore: 0, windowAfter: 2 },
  { week: 10, name: 'OPV2', windowBefore: 1, windowAfter: 2 },
  { week: 10, name: 'DPT2', windowBefore: 1, windowAfter: 2 },
  { week: 14, name: 'OPV3', windowBefore: 1, windowAfter: 2 },
  { week: 14, name: 'DPT3', windowBefore: 1, windowAfter: 2 },
  { week: 36, name: 'MMR', windowBefore: 2, windowAfter: 4 }
];

// Create pregnancy schedule
export const createPregnancySchedule = async (patientId, lmpDate) => {
      const lmp = parseISO(lmpDate);

      if (!patientId) {
        console.error('createPregnancySchedule called with empty patientId', { patientId, lmpDate });
        throw new Error('Invalid patientId for pregnancy schedule creation');
      }

      // Calculate EDD (40 weeks from LMP)
      const eddDate = addWeeks(lmp, 40);

      try {
        // If scheduled_visits already exist for this patient (ANC), skip creating schedules to avoid duplicates
        const existingANC = await db.getFirstAsync(`SELECT id FROM scheduled_visits WHERE patient_id = ? AND visit_type = 'anc' LIMIT 1`, [patientId]);
        let insertedPdId = null;
        if (existingANC && existingANC.id) {
          console.log('ANC schedule already exists for patient, skipping creation', patientId);
          // Try to find existing pregnancy_details if any
          const pd = await db.getFirstAsync(`SELECT id FROM pregnancy_details WHERE patient_id = ? LIMIT 1`, [patientId]);
          insertedPdId = pd && pd.id;
        } else {
          // Insert pregnancy details
          const result = await db.runAsync(
            `INSERT INTO pregnancy_details (patient_id, lmp_date, edd_date) VALUES (?, ?, ?)`,
            [patientId, format(lmp, 'yyyy-MM-dd'), format(eddDate, 'yyyy-MM-dd')]
          );
          insertedPdId = result && (result.insertId || result.lastInsertRowId || result.lastID || null);
          console.log('Inserted pregnancy_details id ->', insertedPdId, 'rawResult:', result);

          // Create ANC visit schedule (deduplicate per schedule_type)
          for (const schedule of ANC_SCHEDULE) {
            const dueDate = addWeeks(lmp, schedule.week);
            const windowStart = addDays(dueDate, -7 * schedule.windowBefore);
            const windowEnd = addDays(dueDate, 7 * schedule.windowAfter);

            const existingSV = await db.getFirstAsync(`SELECT id FROM scheduled_visits WHERE patient_id = ? AND schedule_type = ? AND visit_type = 'anc' LIMIT 1`, [patientId, schedule.name]);
            if (existingSV && existingSV.id) {
              console.log('Skipping duplicate scheduled_visit for', { patientId, schedule: schedule.name });
              continue;
            }

            const insertResult = await db.runAsync(
              `INSERT INTO scheduled_visits (patient_id, visit_type, schedule_type, due_date, window_start, window_end) VALUES (?, ?, ?, ?, ?, ?)`,
              [
                patientId,
                'anc',
                schedule.name,
                format(dueDate, 'yyyy-MM-dd'),
                format(windowStart, 'yyyy-MM-dd'),
                format(windowEnd, 'yyyy-MM-dd')
              ]
            );

            // Queue scheduled visit for sync
            try {
              const svId = insertResult && (insertResult.insertId || insertResult.lastInsertRowId || insertResult.lastID || null);
              console.log('Inserted scheduled_visit id ->', svId, 'for schedule:', schedule.name, 'due:', format(dueDate, 'yyyy-MM-dd'));
              if (svId) {
                const fullSchedule = {
                  id: svId,
                  patient_id: patientId,
                  visit_type: 'anc',
                  schedule_type: schedule.name,
                  due_date: format(dueDate, 'yyyy-MM-dd'),
                  window_start: format(windowStart, 'yyyy-MM-dd'),
                  window_end: format(windowEnd, 'yyyy-MM-dd'),
                  created_at: new Date().toISOString()
                };
                await SyncQueueService.addToSyncQueue('scheduled_visits', svId, 'create', fullSchedule);
                console.log('Enqueued scheduled_visit id ->', svId, 'to sync queue');
              }
            } catch (e) {
              console.warn('Failed to add scheduled_visit to sync queue', e.message);
            }
          }
        }

        // Queue notifications for each visit
        console.log('Creating visit notifications for patient', patientId);
        await createVisitNotifications(patientId);

        // Add pregnancy details to sync queue if we have an id
        if (insertedPdId) {
          console.log('Enqueuing pregnancy_details id ->', insertedPdId, 'to sync queue');
          await SyncQueueService.addToSyncQueue('pregnancy_details', insertedPdId, 'create');
        }

        // Trigger a background sync so newly created notifications/pregnancy details are uploaded
        try {
          const { syncManager } = require('../services/syncManager');
          syncManager.syncData().catch((e) => console.warn('Background sync after schedule creation failed:', e));
        } catch (e) {
          console.warn('Failed to invoke syncManager after schedule creation:', e.message || e);
        }

        return true;
      } catch (error) {
        console.error('Error creating pregnancy schedule:', error);
        return false;
      }
    };

    // Create immunization schedule for a child
    export const createImmunizationSchedule = async (patientId, dobDate) => {
      const dob = parseISO(dobDate);

      if (!patientId) {
        console.error('createImmunizationSchedule called with empty patientId', { patientId, dobDate });
        throw new Error('Invalid patientId for immunization schedule creation');
      }

      try {
        // If immunization scheduled_visits already exist for this patient, skip creating to avoid duplicates
        const existingImm = await db.getFirstAsync(`SELECT id FROM scheduled_visits WHERE patient_id = ? AND visit_type = 'immunization' LIMIT 1`, [patientId]);
        if (existingImm && existingImm.id) {
          console.log('Immunization schedule already exists for patient, skipping creation', patientId);
          return true;
        }

        // Create vaccination schedule
        for (const schedule of IMMUNIZATION_SCHEDULE) {
          const dueDate = addWeeks(dob, schedule.week);
          const windowStart = addDays(dueDate, -7 * schedule.windowBefore);
          const windowEnd = addDays(dueDate, 7 * schedule.windowAfter);

          // Deduplicate per schedule_type
          const existingSV = await db.getFirstAsync(`SELECT id FROM scheduled_visits WHERE patient_id = ? AND schedule_type = ? AND visit_type = 'immunization' LIMIT 1`, [patientId, schedule.name]);
          if (existingSV && existingSV.id) {
            console.log('Skipping duplicate scheduled_visit for immunization', { patientId, schedule: schedule.name });
            continue;
          }

          const insertResult = await db.runAsync(
            `INSERT INTO scheduled_visits (patient_id, visit_type, schedule_type, due_date, window_start, window_end) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              patientId,
              'immunization',
              schedule.name,
              format(dueDate, 'yyyy-MM-dd'),
              format(windowStart, 'yyyy-MM-dd'),
              format(windowEnd, 'yyyy-MM-dd')
            ]
          );

          // Queue scheduled visit for sync
          try {
            const svId = insertResult && (insertResult.insertId || insertResult.lastInsertRowId || insertResult.lastID || null);
            console.log('Inserted scheduled_visit id ->', svId, 'for immunization:', schedule.name, 'due:', format(dueDate, 'yyyy-MM-dd'));
            if (svId) {
              const fullSchedule = {
                id: svId,
                patient_id: patientId,
                visit_type: 'immunization',
                schedule_type: schedule.name,
                due_date: format(dueDate, 'yyyy-MM-dd'),
                window_start: format(windowStart, 'yyyy-MM-dd'),
                window_end: format(windowEnd, 'yyyy-MM-dd'),
                created_at: new Date().toISOString()
              };
              await SyncQueueService.addToSyncQueue('scheduled_visits', svId, 'create', fullSchedule);
              console.log('Enqueued scheduled_visit id ->', svId, 'to sync queue');
            }
          } catch (e) {
            console.warn('Failed to add scheduled_visit to sync queue', e.message);
          }
        }

        // Queue notifications
        await createVisitNotifications(patientId);

        return true;
      } catch (error) {
        console.error('Error creating immunization schedule:', error);
        return false;
      }
    };

// Create notifications for scheduled visits
export const createVisitNotifications = async (patientId) => {
  try {
    // Get patient details
    const patient = await db.getFirstAsync(`SELECT name, type FROM patients WHERE id = ?`, [patientId]);

    // Get pending scheduled visits
    const visits = await db.getAllAsync(`SELECT id, visit_type, schedule_type, due_date FROM scheduled_visits WHERE patient_id = ? AND status = 'pending'`, [patientId]);

    // Create notifications for each visit
    for (const visit of visits) {
      const dueDate = parseISO(visit.due_date);

      // Create reminders: 1 week before and on the day
      const reminders = [
        { days: -7, type: 'reminder' },
        { days: 0, type: 'reminder' },
        { days: 1, type: 'overdue' }
      ];

      for (const reminder of reminders) {
        const scheduledTime = addDays(dueDate, reminder.days);

        const title = reminder.type === 'overdue'
          ? `Overdue: ${visit.schedule_type} for ${patient.name}`
          : `Upcoming: ${visit.schedule_type} for ${patient.name}`;

        const message = reminder.type === 'overdue'
          ? `${visit.schedule_type} visit was due yesterday. Please follow up.`
          : `${visit.schedule_type} visit is scheduled for ${format(dueDate, 'PP')}`;

        if (scheduledTime > new Date()) {
          // Future notification: schedule OS notification and persist with identifier
          try {
            const trigger = { type: 'date', date: scheduledTime };
            const id = await Notifications.scheduleNotificationAsync({
              content: { title, body: message, data: { patientId, scheduleId: visit.id } },
              trigger,
            });

            console.log('Scheduled OS notification id ->', id, 'for patient', patientId, 'schedule', visit.id);

            const schedStr = format(scheduledTime, 'yyyy-MM-dd HH:mm:ss');
            const existRow = await db.getFirstAsync(`SELECT id FROM notification_queue WHERE patient_id = ? AND schedule_id = ? AND type = ? AND scheduled_time = ?`, [patientId, visit.id, reminder.type, schedStr]);
            if (existRow && existRow.id) {
              console.log('Duplicate notification exists, skipping insert', { patientId, scheduleId: visit.id, type: reminder.type, scheduled_time: schedStr });
            } else {
              const notifInsert = await db.runAsync(
                `INSERT INTO notification_queue (patient_id, schedule_id, type, title, message, scheduled_time, status, notification_identifier) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
                [
                  patientId,
                  visit.id,
                  reminder.type,
                  title,
                  message,
                  schedStr,
                  id
                ]
              );

              const notifId = notifInsert && (notifInsert.insertId || notifInsert.lastInsertRowId || notifInsert.lastID || null);
              console.log('Inserted notification_queue id ->', notifId, 'notification_identifier ->', id);

              if (notifId) {
                const fullNotif = {
                  id: notifId,
                  patient_id: patientId,
                  schedule_id: visit.id,
                  type: reminder.type,
                  title,
                  message,
                  scheduled_time: schedStr,
                  notification_identifier: id,
                  created_at: new Date().toISOString()
                };
                await SyncQueueService.addToSyncQueue('notifications', notifId, 'create', fullNotif);
              }
            }
          } catch (err) {
            // OS scheduling failed: persist notification without identifier so it can be synced
            console.warn('OS notification scheduling failed, saving to queue instead', err.message);
            try {
              const schedStr = format(scheduledTime, 'yyyy-MM-dd HH:mm:ss');
              const existRow2 = await db.getFirstAsync(`SELECT id FROM notification_queue WHERE patient_id = ? AND schedule_id = ? AND type = ? AND scheduled_time = ?`, [patientId, visit.id, reminder.type, schedStr]);
              if (existRow2 && existRow2.id) {
                console.log('Duplicate notification (OS-fallback) exists, skipping insert', { patientId, scheduleId: visit.id, type: reminder.type, scheduled_time: schedStr });
              } else {
                const notifInsert = await db.runAsync(
                  `INSERT INTO notification_queue (patient_id, schedule_id, type, title, message, scheduled_time, status) VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    patientId,
                    visit.id,
                    reminder.type,
                    title,
                    message,
                    schedStr
                  ]
                );

                const notifId = notifInsert && (notifInsert.insertId || notifInsert.lastInsertRowId || notifInsert.lastID || null);
                if (notifId) {
                  const fullNotif = {
                    id: notifId,
                    patient_id: patientId,
                    schedule_id: visit.id,
                    type: reminder.type,
                    title,
                    message,
                    scheduled_time: schedStr,
                    created_at: new Date().toISOString()
                  };
                  await SyncQueueService.addToSyncQueue('notifications', notifId, 'create', fullNotif);
                }
              }
            } catch (e) {
              console.warn('Failed to add notification to sync queue', e.message);
            }
          }
        } else {
          // Past notification: create queued notification (no OS scheduling) so it is visible on the dashboard
          try {
            const schedStr = format(scheduledTime, 'yyyy-MM-dd HH:mm:ss');
            const existRow3 = await db.getFirstAsync(`SELECT id FROM notification_queue WHERE patient_id = ? AND schedule_id = ? AND type = ? AND scheduled_time = ?`, [patientId, visit.id, reminder.type, schedStr]);
            if (existRow3 && existRow3.id) {
              console.log('Duplicate past-due notification exists, skipping insert', { patientId, scheduleId: visit.id, type: reminder.type, scheduled_time: schedStr });
            } else {
              const notifInsert = await db.runAsync(
                `INSERT INTO notification_queue (patient_id, schedule_id, type, title, message, scheduled_time, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
                [
                  patientId,
                  visit.id,
                  reminder.type,
                  title,
                  message,
                  schedStr
                ]
              );

              const notifId = notifInsert && (notifInsert.insertId || notifInsert.lastInsertRowId || notifInsert.lastID || null);
              if (notifId) {
                const fullNotif = {
                  id: notifId,
                  patient_id: patientId,
                  schedule_id: visit.id,
                  type: reminder.type,
                  title,
                  message,
                  scheduled_time: schedStr,
                  created_at: new Date().toISOString()
                };
                await SyncQueueService.addToSyncQueue('notifications', notifId, 'create', fullNotif);
                console.log('Inserted past-due notification_queue id ->', notifId, 'for patient', patientId, 'schedule', visit.id);
              }
            }
          } catch (e) {
            console.warn('Failed to create past-due notification_queue row', e.message);
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error creating notifications:', error);
    return false;
  }
};

// Process pending notifications
export const processNotifications = async () => {
  try {
    // Get pending notifications that are due
    const notifications = await db.getAllAsync(`SELECT * FROM notification_queue WHERE status = 'pending' AND (notification_identifier IS NULL OR notification_identifier = '') AND datetime(scheduled_time) <= datetime('now')`);

    // Schedule each notification
    for (const notification of notifications) {
      try {
        // Show immediately
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.message,
            data: {
              patientId: notification.patient_id,
              scheduleId: notification.schedule_id
            }
          },
          trigger: null
        });

        // Mark as sent
        await db.runAsync(`UPDATE notification_queue SET status = 'sent' WHERE id = ?`, [notification.id]);

        // Add to sync queue for dashboard
        await SyncQueueService.addToSyncQueue('notifications', notification.id, 'create');
      } catch (error) {
        console.error('Error sending notification:', error);
        await db.runAsync(`UPDATE notification_queue SET status = 'failed' WHERE id = ?`, [notification.id]);
      }
    }

    return true;
  } catch (error) {
    console.error('Error processing notifications:', error);
    return false;
  }
};

// Mark a scheduled visit as completed
export const completeScheduledVisit = async (scheduleId, visitId) => {
  try {
    await db.runAsync(`UPDATE scheduled_visits SET status = 'completed', completed_date = datetime('now'), visit_id = ? WHERE id = ?`, [visitId, scheduleId]);

    // Add completion notification
    const schedule = await db.getFirstAsync(`SELECT sv.*, p.name FROM scheduled_visits sv JOIN patients p ON p.id = sv.patient_id WHERE sv.id = ?`, [scheduleId]);

    await db.runAsync(`INSERT INTO notification_queue (patient_id, schedule_id, type, title, message, scheduled_time) VALUES (?, ?, 'completed', ?, ?, datetime('now'))`, [
      schedule.patient_id,
      scheduleId,
      `Completed: ${schedule.schedule_type}`,
      `${schedule.schedule_type} visit completed for ${schedule.name}`
    ]);

  // Add to sync queue
  await SyncQueueService.addToSyncQueue('scheduled_visits', scheduleId, 'update');

    return true;
  } catch (error) {
    console.error('Error completing scheduled visit:', error);
    return false;
  }
};

// Setup background notification check
export const setupNotificationCheck = async () => {
  // Request notification permissions
  await Notifications.requestPermissionsAsync();
  
  // Set up notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  
  // Schedule periodic notification check
  const checkInterval = 15 * 60 * 1000; // 15 minutes
  
  setInterval(async () => {
    await processNotifications();
  }, checkInterval);
};