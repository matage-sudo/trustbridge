export const mockRecords = [
  { id: "REC-001", date: "2026-10-15", type: "Laboratory", title: "Complete Blood Count (CBC)", doctor: "Dr. A. Smith", status: "Final" },
  { id: "REC-002", date: "2026-09-02", type: "Radiology", title: "Chest X-Ray", doctor: "Dr. J. Wanjiku", status: "Final" },
  { id: "REC-003", date: "2026-11-01", type: "Prescription", title: "Amoxicillin 500mg", doctor: "Dr. A. Smith", status: "Active" },
];

export const mockConsents = [
  { id: "CNS-001", purpose: "Treatment", scope: "All Records", grantedTo: "Dr. A. Smith", date: "2026-10-15", status: "ACTIVE" },
  { id: "CNS-002", purpose: "Insurance Claim", scope: "Laboratory Results", grantedTo: "Jubilee Health", date: "2026-09-02", status: "ACTIVE" },
  { id: "CNS-003", purpose: "Research", scope: "Anonymized Data", grantedTo: "KEMRI", date: "2026-08-10", status: "REVOKED" },
];
