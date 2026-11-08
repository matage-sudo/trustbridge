export const mockMessages = [
  { id: 1, sender: "Dr. A. Smith", role: "DOCTOR", text: "Hello John, your latest blood test results are in. Everything looks normal.", time: "10:30 AM", isMine: false },
  { id: 2, sender: "You", role: "PATIENT", text: "Thank you Doctor. Do I need to change my diet?", time: "10:32 AM", isMine: true },
  { id: 3, sender: "Dr. A. Smith", role: "DOCTOR", text: "No changes needed. Keep up the good work. This message will self-destruct in 24 hours for your privacy.", time: "10:35 AM", isMine: false, ephemeral: true },
];
