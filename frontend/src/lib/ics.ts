/**
 * iCalendar (.ics) generation utilities for appointment exports.
 *
 * Generates RFC 5545-compliant VCALENDAR content from appointment data.
 * No external dependencies — uses native Date and Blob APIs.
 */

import type { AppointmentResponse } from '@/hooks/use-providers';

/** Format an ISO 8601 date string to iCalendar UTC format: YYYYMMDDTHHMMSSZ */
function formatICSDate(isoString: string): string {
  return new Date(isoString)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** Escape special characters per RFC 5545 TEXT encoding */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function buildVEvent(appt: AppointmentResponse, uid: string, stamp: string): string {
  const dtStart = formatICSDate(appt.appointmentStart);
  const dtEnd = appt.appointmentEnd
    ? formatICSDate(appt.appointmentEnd)
    : formatICSDate(new Date(new Date(appt.appointmentStart).getTime() + 60 * 60 * 1000).toISOString());

  const descParts = [
    appt.contactPerson ? `Contact: ${appt.contactPerson}` : null,
    appt.result ? `Result: ${appt.result}` : null,
    appt.notes ? `Notes: ${appt.notes}` : null,
  ].filter(Boolean) as string[];

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICSText(appt.entityName)}`,
  ];

  if (descParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeICSText(descParts.join('\n'))}`);
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

export function generateICSContent(appointments: AppointmentResponse[]): string {
  const stamp = formatICSDate(new Date().toISOString());
  const vevents = appointments.map((appt, i) => {
    const uid = `planloo-appt-${appt.id}-${Date.now()}-${i}@planloo.app`;
    return buildVEvent(appt, uid, stamp);
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planloo//Appointments//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
