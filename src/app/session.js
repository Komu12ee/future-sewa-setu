/**
 * In-Memory Session Store
 * Preserves privacy: No disk or database persistence.
 * Completely wiped on session reset or timeout.
 */

export class SessionStore {
  constructor() {
    this.reset();
  }

  reset() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    this.profile = {
      name: '',
      district: '',
      mobile: '',
      email: 'komendra25302@iiitnr.edu.in'
    };

    this.formData = {};
    this.uploadedDocs = [];
    this.currentService = null;
    this.serviceConfig = null;
    this.currentStep = 1;

    // Generated dummy reference values
    this.applicationDate = `${day}-${month}-${year}`;
    this.applicationTimestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${ms}`;
    this.referenceNumber = `0706012622000102`;
    this.transactionId = `TXN-${year}${month}${day}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Due date (20 days from now)
    const due = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
    const dueDay = String(due.getDate()).padStart(2, '0');
    const dueMonth = String(due.getMonth() + 1).padStart(2, '0');
    const dueYear = due.getFullYear();
    this.dueDate = `${dueDay}-${dueMonth}-${dueYear}`;
  }

  setProfileField(field, value) {
    this.profile[field] = value;
  }

  setFormField(key, value) {
    this.formData[key] = value;
  }

  getFormField(key) {
    return this.formData[key];
  }
}

export const session = new SessionStore();
