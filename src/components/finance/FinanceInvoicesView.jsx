'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { WeeklyUpdateSection } from './WeeklyUpdateSection';
import { BillRaisedSection } from './BillRaisedSection';
import { BillClearedSection } from './BillClearedSection';
import { TotalConsolidatedSection } from './TotalConsolidatedSection';
import { sortItemsByCurrentMonthFirst } from '@/lib/finance-data';
import {
  Download,
  Plus,
  Search,
  Bell,
  Building2,
  FileText,
  Printer,
  X,
  Edit3,
  Trash2,
  Lock,
  Calendar,
  Send,
  Copy,
  Check,
  Users,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Mail,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Settings,
  Key,
  Eye,
} from 'lucide-react';

function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

// Canonical Client Name Normalizer (Eliminates duplicates across all sources)
export function normalizeClientName(rawName) {
  if (!rawName) return '';
  const trimmed = String(rawName).trim().replace(/\s+/g, ' ');
  const lower = trimmed.toLowerCase();

  if (lower.startsWith('ison') || lower.includes('ison xperiences')) {
    return 'ISON XPERIENCES INDIA PRIVATE LIMITED';
  }
  if (lower.includes('five splash') || lower.includes('fivesplash') || lower.includes('fives digital') || lower.includes('fivesdigital')) {
    return 'Five Splash Infotech Pvt. Ltd- Bangalore';
  }
  if (lower.includes('altruist') && (lower.includes('gb') || lower.includes('garvebhavi') || lower.includes('begur'))) {
    return 'Altruist GB';
  }
  if (lower.includes('altruist')) {
    return 'Altruist Technologies Pvt. Ltd.';
  }
  if (lower.includes('one point one') || lower.includes('1point1') || lower.includes('onepointone')) {
    return 'One Point One Solutions Ltd';
  }
  if (lower.includes('radical minds') || lower.includes('radicalminds')) {
    return 'Radical Minds Technologies Pvt Ltd';
  }
  if (lower.includes('startek')) {
    return 'Startek';
  }
  if (lower === 'apex' || lower.includes('apex corp')) {
    return 'Apex Corp';
  }
  if (lower.includes('nexus media')) {
    return 'Nexus Media';
  }
  if (lower.includes('starlight tech')) {
    return 'Starlight Tech';
  }
  if (lower.includes('techcorp')) {
    return 'TechCorp Solutions';
  }
  if (lower.includes('cegs global') || lower === 'cegs') {
    return 'CEGS Global';
  }
  if (lower === 'codevate') {
    return 'Codevate';
  }
  return trimmed;
}

// Official Client Company Email Addresses & Contacts
export const CLIENT_OFFICIAL_CONTACTS = {
  'ISON XPERIENCES INDIA PRIVATE LIMITED': [
    { name: 'Sudheesh Kumar', email: 'sudheesh.kumar@isonxperiences.com' },
    { name: 'Maqsood Khan', email: 'maqsood.khan@isonxperiences.com' },
    { name: 'Navaneetha Krishnan', email: 'navaneetha.krishnan@isonxperiences.com' },
    { name: 'Preethi S.', email: 'Preethi.s@isonxperiences.com' },
  ],
  'Altruist Technologies Pvt. Ltd.': [
    { name: 'Jyotiranjan Nayak', email: 'jyotiranjan.nayak@altruistindia.com' },
    { name: 'Hiring Partner BLR', email: 'Hiringpartner.blr@altruistindia.com' },
  ],
  'Altruist GB': [
    { name: 'Abhilash Nair', email: 'Abhilash.Nair@altruistindia.com' },
    { name: 'Prachi Kadam', email: 'prachi.kadam@altruistindia.com' },
  ],
  'Five Splash Infotech Pvt. Ltd- Bangalore': [
    { name: 'Jyotiranjan Nayak', email: 'jyotiranjan.nayak@fivesdigital.com' },
  ],
  'Radical Minds Technologies Pvt Ltd': [
    { name: 'Vishal Yadawad', email: 'vishal.yadawad@radicalminds.net' },
    { name: 'Rupak Chatterjee', email: 'rupak.chatterjee@radicalminds.net' },
  ],
  'One Point One Solutions Ltd': [
    { name: 'Sandeep K.', email: 'Sandeep.k@1point1.com' },
    { name: 'Shibabrata Lenka', email: 'shibabrata.lenka@1point1.com' },
  ],
  'Startek': [
    { name: 'Rohit Pal', email: 'rohit.pal@startek.com' },
    { name: 'Sangana Bala', email: 'Sangana.bala@startek.com' },
  ],
};

export function getClientContacts(rawName) {
  if (!rawName) return [];
  const norm = normalizeClientName(rawName);
  if (CLIENT_OFFICIAL_CONTACTS[norm]) {
    return CLIENT_OFFICIAL_CONTACTS[norm];
  }
  const lower = String(rawName).toLowerCase();
  if (lower.includes('ison')) return CLIENT_OFFICIAL_CONTACTS['ISON XPERIENCES INDIA PRIVATE LIMITED'];
  if (lower.includes('altruist') && (lower.includes('gb') || lower.includes('garvebhavi'))) return CLIENT_OFFICIAL_CONTACTS['Altruist GB'];
  if (lower.includes('altruist')) return CLIENT_OFFICIAL_CONTACTS['Altruist Technologies Pvt. Ltd.'];
  if (lower.includes('five') || lower.includes('splash') || lower.includes('fives')) return CLIENT_OFFICIAL_CONTACTS['Five Splash Infotech Pvt. Ltd- Bangalore'];
  if (lower.includes('radical')) return CLIENT_OFFICIAL_CONTACTS['Radical Minds Technologies Pvt Ltd'];
  if (lower.includes('point') || lower.includes('1point1')) return CLIENT_OFFICIAL_CONTACTS['One Point One Solutions Ltd'];
  if (lower.includes('startek')) return CLIENT_OFFICIAL_CONTACTS['Startek'];
  return [];
}

export function getClientDefaultEmails(rawName) {
  const contacts = getClientContacts(rawName);
  if (contacts.length > 0) {
    return contacts.map((c) => c.email).join(', ');
  }
  return '';
}

// Helper: Clean email list from string or array
function cleanEmailList(input) {
  if (!input) return [];
  let list = [];
  if (Array.isArray(input)) {
    list = input;
  } else if (typeof input === 'string') {
    list = input.split(/[,;\s\n\r]+/).filter(Boolean);
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return Array.from(
    new Set(
      list
        .map((e) => String(e).trim().toLowerCase())
        .filter((e) => emailRegex.test(e))
    )
  );
}

// Helper: Extract YYYY-MM key from invoice
function getInvoiceMonthKey(inv) {
  const dStr = inv?.invoiceDate || inv?.paidDate || inv?.createdAt;
  if (dStr && typeof dStr === 'string') {
    const match = dStr.match(/^(\d{4})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}`;
    const parsed = new Date(dStr);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      if (y >= 2020 && y <= 2035) return `${y}-${m}`;
    }
  }
  if (inv?.dueDate && typeof inv.dueDate === 'string') {
    const months = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const lower = inv.dueDate.toLowerCase();
    for (const [mName, mNum] of Object.entries(months)) {
      if (lower.includes(mName)) {
        return `2026-${mNum}`;
      }
    }
  }
  return '2026-10';
}

function formatMonthLabel(key) {
  if (!key || typeof key !== 'string') return key || '';
  const parts = key.split('-');
  if (parts.length === 2) {
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const d = new Date(y, m, 1);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
  }
  return key;
}

// Sample candidate seat items matching ISON XPERIENCES Form GST INV – 1
const ISON_SAMPLE_ITEMS = [
  { empId: 'CEGS-101', employeeName: 'Mohammed Imran', doj: '12/10/2026', processLob: '101', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
  { empId: 'CEGS-102', employeeName: 'Farhan Pasha', doj: '14/10/2026', processLob: 'Etisalat', ratePerSeat: 7000, sacCode: '99851', amount: 7000 },
  { empId: 'CEGS-103', employeeName: 'Syed Tanveer', doj: '15/10/2026', processLob: 'CNR', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
  { empId: 'CEGS-104', employeeName: 'Ayesha Siddiqua', doj: '18/10/2026', processLob: 'I-CAD', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
  { empId: 'CEGS-105', employeeName: 'Zeeshan Ali', doj: '20/10/2026', processLob: 'E-Money', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
  { empId: 'CEGS-106', employeeName: 'Tabassum Khan', doj: '22/10/2026', processLob: 'universal', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
  { empId: 'CEGS-107', employeeName: 'Kashif Ahmed', doj: '24/10/2026', processLob: 'SMB', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
];

// Sample items matching Five Splash Infotech Pvt. Ltd- Bangalore
const FIVE_SPLASH_SAMPLE_ITEMS = [
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'JFL', doj: 'xx/xx/xxxx', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'CoinDCX', doj: 'xx/xx/xxxx', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'EFL', doj: 'xx/xx/xxxx', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'TVS', doj: 'xx/xx/xxxx', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
];

// Sample items matching Altruist Technologies Pvt. Ltd. (Kudlu Gate)
const ALTRUIST_SAMPLE_ITEMS = [
  { sno: '01', empId: 'xxxxx', employeeName: 'xyz', designation: 'Business AssociateOperation.', doj: 'x/x/xx-', processLob: 'IBL', sacCode: 'BPO', ratePerSeat: 4500, amount: 4500 },
  { sno: '02', empId: 'xxxxx', employeeName: 'xyz', designation: 'Business AssociateOperation', doj: 'x/x/xx', processLob: 'Titan', sacCode: 'BPO', ratePerSeat: 10000, amount: 10000 },
  { sno: '03', empId: 'xxxxx', employeeName: 'xyz', designation: 'Business AssociateOperation.', doj: 'x/x/xx-', processLob: 'Toyota', sacCode: 'BPO', ratePerSeat: 5000, amount: 5000 },
  { sno: '04', empId: 'xxxxx', employeeName: 'xyz', designation: 'Business AssociateOperation.', doj: 'x/x/xx-', processLob: 'Leap Finance', sacCode: 'BPO', ratePerSeat: 5000, amount: 5000 },
  { sno: '05', empId: 'xxxxx', employeeName: 'xyz', designation: 'Business AssociateOperation.', doj: 'x/x/xx-', processLob: 'RM- Leap Finance', sacCode: 'BPO', ratePerSeat: 5000, amount: 5000 },
  { sno: '06', empId: 'xxxxx', employeeName: 'xyz', designation: 'Business AssociateOperation.', doj: 'x/x/xx-', processLob: 'Amazon', sacCode: 'BPO', ratePerSeat: 5000, amount: 5000 },
  { sno: '07', empId: 'xxxxx', employeeName: 'xyz', designation: 'Business AssociateOperation.', doj: 'x/x/xx-', processLob: 'Indus Bank', sacCode: 'BPO', ratePerSeat: 3000, amount: 3000 },
  { sno: '08', empId: 'xxxxx', employeeName: 'xyz', designation: 'Business AssociateOperation.', doj: 'x/x/xx-', processLob: 'EZE tap', sacCode: 'BPO', ratePerSeat: 4500, amount: 4500 },
  { sno: '09', empId: 'xxxxx', employeeName: 'xyz', designation: 'Business AssociateOperation.', doj: 'x/x/xx-', processLob: 'BOB', sacCode: 'BPO', ratePerSeat: 4500, amount: 4500 },
  { sno: '10', empId: 'xxxxx', employeeName: 'xyz', designation: 'Business AssociateOperation.', doj: 'x/x/xx-', processLob: 'TBSS', sacCode: 'BPO', ratePerSeat: 4500, amount: 4500 },
  { sno: '11', empId: 'xxxxx', employeeName: 'xyz', designation: 'Business AssociateOperation.', doj: 'x/x/xx-', processLob: 'Switch Mobility', sacCode: 'BPO', ratePerSeat: 5000, amount: 5000 },
];

// Sample items matching Altruist GB (Garvebhavi palya)
const ALTRUIST_GB_SAMPLE_ITEMS = [
  { sno: '01', empId: 'xxxx', employeeName: 'XYZ', designation: 'Business AssociateOperation', doj: 'xx/x/xx', processLob: 'Airtel Black', sacCode: 'BPO', ratePerSeat: 12000, amount: 12000 },
  { sno: '02', empId: 'xxxx', employeeName: 'XYZ', designation: 'Business AssociateOperation', doj: 'xx/x/xx', processLob: 'BB Gold', sacCode: 'BPO', ratePerSeat: 10000, amount: 10000 },
  { sno: '03', empId: 'xxxx', employeeName: 'XYZ', designation: 'Business AssociateOperation', doj: 'xx/x/xx', processLob: 'Mobility', sacCode: 'BPO', ratePerSeat: 10000, amount: 10000 },
  { sno: '04', empId: 'xxxx', employeeName: 'XYZ', designation: 'Business AssociateOperation', doj: 'xx/x/xx', processLob: 'Platinum', sacCode: 'BPO', ratePerSeat: 10000, amount: 10000 },
  { sno: '05', empId: 'xxxx', employeeName: 'XYZ', designation: 'Business AssociateOperation', doj: 'xx/x/xx', processLob: 'DTH', sacCode: 'BPO', ratePerSeat: 4500, amount: 4500 },
  { sno: '06', empId: 'xxxx', employeeName: 'XYZ', designation: 'Business AssociateOperation', doj: 'xx/x/xx', processLob: 'IPRU', sacCode: 'BPO', ratePerSeat: 3000, amount: 3000 },
  { sno: '07', empId: 'xxxx', employeeName: 'XYZ', designation: 'Business AssociateOperation', doj: 'xx/x/xx', processLob: '121', sacCode: 'BPO', ratePerSeat: 4500, amount: 4500 },
  { sno: '08', empId: 'xxxx', employeeName: 'XYZ', designation: 'Business AssociateOperation', doj: 'xx/x/xx', processLob: 'WCC', sacCode: 'BPO', ratePerSeat: 4000, amount: 4000 },
  { sno: '09', empId: 'xxxx', employeeName: 'XYZ', designation: 'Business AssociateOperation', doj: 'xx/x/xx', processLob: 'ICICI', sacCode: 'BPO', ratePerSeat: 3000, amount: 3000 },
  { sno: '10', empId: 'xxxx', employeeName: 'XYZ', designation: 'Business AssociateOperation', doj: 'xx/x/xx', processLob: 'airtel prepaid KK', sacCode: 'BPO', ratePerSeat: 4000, amount: 4000 },
  { sno: '11', empId: 'xxxx', employeeName: 'XYZ', designation: 'Business AssociateOperation', doj: 'xx/x/xx', processLob: 'TN Postpaid', sacCode: 'BPO', ratePerSeat: 4000, amount: 4000 },
  { sno: '12', empId: 'xxxx', employeeName: 'XYZ', designation: 'Business AssociateOperation', doj: 'xx/x/xx', processLob: 'OB Collection', sacCode: 'BPO', ratePerSeat: 4000, amount: 4000 },
  { sno: '13', empId: 'xxxx', employeeName: 'XYZ', designation: 'Business AssociateOperation', doj: 'xx/x/xx', processLob: 'MLob', sacCode: 'BPO', ratePerSeat: 10000, amount: 10000 },
];

// Sample items matching One Point One Solutions Ltd
const ONE_POINT_ONE_SAMPLE_ITEMS = [
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'Razorpay', doj: 'xx/xx/xxxx', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'TATA Premium', doj: 'xx/xx/xxxx', ratePerSeat: 7000, sacCode: '99851', amount: 7000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'TATA Standard', doj: 'xx/xx/xxxx', ratePerSeat: 7000, sacCode: '99851', amount: 7000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'ICICI', doj: 'xx/xx/xxxx', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'SBI', doj: 'xx/xx/xxxx', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'JFL(domino\'s)', doj: 'xx/xx/xxxx', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'Ujjivan finance', doj: 'xx/xx/xxxx', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'Xiaomi - Hotline', doj: 'xx/xx/xxxx', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'Edelweiss', doj: 'xx/xx/xxxx', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'DRA', doj: 'xx/xx/xxxx', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'DMI', doj: 'xx/xx/xxxx', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'Chola', doj: 'xx/xx/xxxx', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'TMB', doj: 'xx/xx/xxxx', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'Lateral', doj: 'xx/xx/xxxx', ratePerSeat: 0, sacCode: '99851', amount: 0 },
];

// Sample items matching Radical Minds Technologies Pvt Ltd (From real data in PDF)
const RADICAL_MINDS_SAMPLE_ITEMS = [
  { empId: 'RMB98010', employeeName: 'BINDUSHWARI B', phone: '8497811576', status: 'Active', doj: '28-April-25', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'RMB98022', employeeName: 'Umar Paridar', phone: '7892483114', status: 'Active', doj: '30-April-25', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'RNB98027', employeeName: 'Vijay Kumar', phone: '9113583897', status: 'Active', doj: '01-May-25', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'RMB98026', employeeName: 'Eda Begum', phone: '9380229469', status: 'Active', doj: '01-May-25', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
  { empId: 'RMB98054', employeeName: 'Sandhya', phone: '9663460270', status: 'Active', doj: '15-May-25', ratePerSeat: 6000, sacCode: '99851', amount: 6000 },
  { empId: 'RMB98058', employeeName: 'Janani', phone: '7411774844', status: 'Active', doj: '15-May-25', ratePerSeat: 6000, sacCode: '99851', amount: 6000 },
  { empId: 'RMB98046', employeeName: 'Nandhini', phone: '9912311295', status: 'Active', doj: '12-May-25', ratePerSeat: 6000, sacCode: '99851', amount: 6000 },
  { empId: 'RMB97624', employeeName: 'JHUNNU BABU', phone: '8340795702', status: 'Active', doj: '18/01/2025', ratePerSeat: 4000, sacCode: '99851', amount: 4000 },
  { empId: 'RMB97756', employeeName: 'KAMALESH', phone: '7259121032', status: 'Active', doj: '6/02/2025', ratePerSeat: 4000, sacCode: '99851', amount: 4000 },
  { empId: 'RMB97762', employeeName: 'SUHAIL CHOUDHARY', phone: '8744869587', status: 'Active', doj: '6/02/2025', ratePerSeat: 4000, sacCode: '99851', amount: 4000 },
  { empId: 'RMB97817', employeeName: 'SIDDHRAJ', phone: '8088085997', status: 'Active', doj: '17/02/2025', ratePerSeat: 4000, sacCode: '99851', amount: 4000 },
  { empId: 'RMB97883', employeeName: 'SHASHANK', phone: '6362965610', status: 'Active', doj: '12/03/2025', ratePerSeat: 6000, sacCode: '99851', amount: 6000 },
  { empId: 'RMB97922', employeeName: 'MUDASSIR', phone: '9380112271', status: 'Active', doj: '10/04/2025', ratePerSeat: 4000, sacCode: '99851', amount: 4000 },
  { empId: 'RMB97921', employeeName: 'NAVEED AHAMED ARNI', phone: '7892979591', status: 'Active', doj: '10/04/2025', ratePerSeat: 4000, sacCode: '99851', amount: 4000 },
  { empId: 'RMB97906', employeeName: 'MOHAMMED YOUSUF', phone: '8217848124/7975119960', status: 'Active', doj: '07/04/2025', ratePerSeat: 10000, sacCode: '99851', amount: 10000 },
  { empId: 'RMB97938', employeeName: 'SUNIL SAUD', phone: '8660631961', status: 'Active', doj: '12/04/2025', ratePerSeat: 3000, sacCode: '99851', amount: 3000 },
];

// Configuration registry for all 6 official client templates
const CLIENT_CONFIGS = {
  GST_INV_1: {
    key: 'GST_INV_1',
    name: 'ISON XPERIENCES INDIA PRIVATE LIMITED',
    label: 'Form GST INV – 1 (ISON Official)',
    badge: 'ISON',
    defaultAddress: 'Building No. H208, 1st & 2nd Floor, 36/5 Somyasundarpalya, 27th Main Road, Sector 2 HSR Layout, Bengaluru, Karnataka-560102',
    defaultGstin: '29AADCI1246E1ZT',
    defaultPan: 'AADCI1246E',
    sampleItems: ISON_SAMPLE_ITEMS,
    sampleBasic: 37000,
    sampleSgst: 3330,
    sampleCgst: 3330,
    sampleTotal: 43660,
    words: 'Forty-Three thousand Six Hundred Sixty only.',
  },
  FIVE_SPLASH: {
    key: 'FIVE_SPLASH',
    name: 'Five Splash Infotech Pvt. Ltd- Bangalore',
    label: 'Five Splash Infotech Official',
    badge: 'Five Splash',
    defaultAddress: '46/4, Novel Tech Park, Hosur Rd, Kudlugate, Krishna Reddy Industrial Area, Behind HSR, Bengaluru, Karnataka 560068.',
    defaultGstin: '29AABCF3991K1Z5',
    defaultPan: 'AABCF3991K',
    sampleItems: FIVE_SPLASH_SAMPLE_ITEMS,
    sampleBasic: 20000,
    sampleSgst: 1800,
    sampleCgst: 1800,
    sampleTotal: 23600,
    words: 'Twenty-Three Thousand Six Hundred only.',
  },
  ALTRUIST: {
    key: 'ALTRUIST',
    name: 'Altruist Technologies Pvt. Ltd.',
    label: 'Altruist Technologies (Kudlu Gate)',
    badge: 'Altruist',
    defaultAddress: 'AKR Tech Park, 46/1, NH 44, near Krishna Reddy Industrial Area, Kudlu Gate, Bengaluru – 560068.',
    defaultGstin: '29AAFCA3725N1ZC',
    defaultPan: 'AAFCA3725N',
    sampleItems: ALTRUIST_SAMPLE_ITEMS,
    sampleBasic: 56000,
    sampleSgst: 5040,
    sampleCgst: 5040,
    sampleTotal: 66080,
    words: 'Sixty Six Thousand Eighty only.',
  },
  ALTRUIST_GB: {
    key: 'ALTRUIST_GB',
    name: 'Altruist GB',
    label: 'Altruist GB (Garvebhavi palya)',
    badge: 'Altruist GB',
    defaultAddress: 'Garvebhavi palya, Behind RNS Motors, HGSL Chambers NO 4,5,6, Begur Hobli, Hosur Main Road, Bangalore, Hongasandra Village, Bengaluru (Bangalore) Urban, Karnataka, 560068',
    defaultGstin: '29AAFCA3725N1ZC',
    defaultPan: 'AAFCA3725N',
    sampleItems: ALTRUIST_GB_SAMPLE_ITEMS,
    sampleBasic: 83000,
    sampleSgst: 7470,
    sampleCgst: 7470,
    sampleTotal: 97940,
    words: 'Ninety-Seven Thousand Nine Hundred Forty only.',
  },
  ONE_POINT_ONE: {
    key: 'ONE_POINT_ONE',
    name: 'One Point One Solutions Ltd',
    label: 'One Point One Solutions Official',
    badge: 'One Point One',
    defaultAddress: '3rd Floor, AKR Infinity, Sy No. 113, Krishna Reddy Industrial Area, 7th Mile Hosur Road Bangalore, Karnataka 560068 India.',
    defaultGstin: '29AACCD9158MIZZ',
    defaultPan: 'AACCD9158M',
    sampleItems: ONE_POINT_ONE_SAMPLE_ITEMS,
    sampleBasic: 49000,
    sampleSgst: 4410,
    sampleCgst: 4410,
    sampleTotal: 57820,
    words: 'Fifty-Seven Thousand Eight Hundred Twenty only.',
  },
  RADICAL_MINDS: {
    key: 'RADICAL_MINDS',
    name: 'Radical Minds Technologies Pvt Ltd',
    label: 'Radical Minds Technologies Official',
    badge: 'Radical Minds',
    defaultAddress: 'Krimson Square, 31/9, Aayee Matha Temple Rd, Muneswara Nagar, Sector 6, HSR Layout, Bengaluru, Karnataka 560102',
    defaultGstin: '29AAFCR0597P1ZJ',
    defaultPan: 'AAFCR0597P',
    sampleItems: RADICAL_MINDS_SAMPLE_ITEMS,
    sampleBasic: 73000,
    sampleSgst: 6570,
    sampleCgst: 6570,
    sampleTotal: 86140,
    words: 'Eighty Six Thousand One Hundred and Forty only.',
  },
};

// Helper: Determine the best template key for a client / invoice
export function getClientTemplate(clientName = '', templateType = '') {
  if (templateType && CLIENT_CONFIGS[templateType]) {
    return templateType;
  }
  const c = String(clientName || '').toLowerCase();
  if (c.includes('five splash') || c.includes('fivesplash')) return 'FIVE_SPLASH';
  if (c.includes('altruist') && (c.includes('gb') || c.includes('garvebhavi') || c.includes('begur'))) return 'ALTRUIST_GB';
  if (c.includes('altruist')) return 'ALTRUIST';
  if (c.includes('one point one') || c.includes('1point1') || c.includes('onepointone')) return 'ONE_POINT_ONE';
  if (c.includes('radical minds') || c.includes('radicalminds')) return 'RADICAL_MINDS';
  if (c.includes('ison')) return 'GST_INV_1';
  return 'GST_INV_1';
}

// Digital Signature Stamp / Badge Component
function DigitalSignatureBadge({ name = 'MOHAMMED USMAN ZABI', date = '', customImage = null }) {
  if (customImage && customImage !== '/signatures/usman-zabi-digital-signature.jpg') {
    return (
      <div style={{ textAlign: 'right', display: 'inline-block' }}>
        <img
          src={customImage}
          alt={`Digital Signature of ${name}`}
          style={{ maxHeight: 68, maxWidth: 220, objectFit: 'contain', display: 'block', marginLeft: 'auto' }}
        />
      </div>
    );
  }

  const stampDate = date || '19/09/2026';
  const stampTime = '2:15 PM';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        border: '1.5px solid #CBD5E1',
        borderRadius: 8,
        padding: '6px 12px',
        background: '#FAFBFD',
        fontFamily: 'Arial, "Helvetica Neue", sans-serif',
        textAlign: 'left',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ width: 26, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
          <path d="M12 2L3 6V13C3 18.5 6.8 23.7 12 25C17.2 23.7 21 18.5 21 13V6L12 2Z" fill="#FEE2E2" stroke="#DC2626" strokeWidth="1.5" />
          <path d="M8 13.5L10.5 16L16 10" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 900, color: '#0F172A', letterSpacing: '0.04em', lineHeight: 1.15 }}>
          {name}
        </div>
        <div style={{ fontSize: 9.5, color: '#475569', fontWeight: 600, marginTop: 2 }}>
          Digitally signed by <span style={{ color: '#0F172A', fontWeight: 800 }}>{name}</span>
        </div>
        <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'monospace', marginTop: 1 }}>
          Date: {stampDate} · Time: {stampTime}
        </div>
      </div>
    </div>
  );
}

function numberToWordsINR(num) {
  num = Math.round(Number(num) || 0);
  if (num === 0) return 'Zero Rupees only';

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n === 0) return '';
    if (n < 20) return a[n];
    const tens = b[Math.floor(n / 10)];
    const units = a[n % 10];
    return tens + (units ? `-${units}` : '');
  }

  function convertThreeDigits(n) {
    let str = '';
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    if (hundreds > 0) {
      str += `${a[hundreds]} Hundred `;
    }
    if (rest > 0) {
      str += convertTwoDigits(rest);
    }
    return str.trim();
  }

  let result = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remaining = num;

  if (crore > 0) {
    result += `${convertThreeDigits(crore)} Crore `;
  }
  if (lakh > 0) {
    result += `${convertThreeDigits(lakh)} Lakh `;
  }
  if (thousand > 0) {
    result += `${convertThreeDigits(thousand)} Thousand `;
  }
  if (remaining > 0) {
    result += `${convertThreeDigits(remaining)} `;
  }

  return `${result.trim()} only.`;
}

function authHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('cegs_token') : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Default official digital signature stamp (Mohammed Usman Zabi)
const DEFAULT_SIGNATURE_STAMP = '/signatures/usman-zabi-digital-signature.jpg';

// Fallback seed invoices matching the official client templates
const DEFAULT_INVOICES = [
  {
    id: 'seed-ison-1',
    _id: 'seed-ison-1',
    invoiceNo: 'INV-2026-ISON-01',
    client: 'ISON XPERIENCES INDIA PRIVATE LIMITED',
    projectMilestone: 'Employee & Seat Billing · 7 Seats (Etisalat, CNR, ICAD, EMoney, SMB)',
    amount: 43660,
    basicAmount: 37000,
    sgstAmount: 3330,
    cgstAmount: 3330,
    dueDate: '30 days',
    status: 'Pending',
    paidDate: '',
    invoiceDate: '2026-10-14',
    notes: 'Official Form GST INV – 1 candidate placement and seat billing.',
    clientGstin: '29AADCI1246E1ZT',
    clientAddress: 'Building No. H208, 1st & 2nd Floor, 36/5 Somyasundarpalya, 27th Main Road, Sector 2 HSR Layout, Bengaluru, Karnataka-560102',
    clientState: 'Karnataka',
    clientStateCode: '29',
    poNo: 'PO-2026-9812',
    modeOfTransport: 'Digital Services',
    vehicleNo: 'N/A',
    dateTimeOfService: 'October 2026',
    placeOfService: 'Bangalore',
    templateType: 'GST_INV_1',
    amountInWords: 'Forty-Three thousand Six Hundred Sixty only.',
    signatureImage: DEFAULT_SIGNATURE_STAMP,
    items: ISON_SAMPLE_ITEMS,
  },
  {
    id: 'seed-fivesplash-1',
    _id: 'seed-fivesplash-1',
    invoiceNo: 'INV-2026-FS-01',
    client: 'Five Splash Infotech Pvt. Ltd- Bangalore',
    projectMilestone: 'Candidate Placement & Process Billing · 4 Candidates (JFL, CoinDCX, EFL, TVS)',
    amount: 23600,
    basicAmount: 20000,
    sgstAmount: 1800,
    cgstAmount: 1800,
    dueDate: '30 days',
    status: 'Pending',
    paidDate: '',
    invoiceDate: '2026-10-15',
    notes: 'Novel Tech Park Kudlugate candidate placement invoice.',
    clientGstin: '29AABCF3991K1Z5',
    clientAddress: '46/4, Novel Tech Park, Hosur Rd, Kudlugate, Krishna Reddy Industrial Area, Behind HSR, Bengaluru, Karnataka 560068.',
    clientState: 'Karnataka',
    clientStateCode: '29',
    templateType: 'FIVE_SPLASH',
    amountInWords: 'Twenty-Three Thousand Six Hundred only.',
    signatureImage: DEFAULT_SIGNATURE_STAMP,
    items: FIVE_SPLASH_SAMPLE_ITEMS,
  },
  {
    id: 'seed-altruist-1',
    _id: 'seed-altruist-1',
    invoiceNo: 'INV-2026-ALT-01',
    client: 'Altruist Technologies Pvt. Ltd.',
    projectMilestone: 'Operations Placement & Billing · 11 Candidates (IBL, Titan, Toyota, Leap, Amazon...)',
    amount: 66080,
    basicAmount: 56000,
    sgstAmount: 5040,
    cgstAmount: 5040,
    dueDate: '30 days',
    status: 'Pending',
    paidDate: '',
    invoiceDate: '2026-10-15',
    notes: 'Altruist Technologies Kudlu Gate Tax Invoice.',
    clientGstin: '29AAFCA3725N1ZC',
    clientAddress: 'AKR Tech Park, 46/1, NH 44, near Krishna Reddy Industrial Area, Kudlu Gate, Bengaluru – 560068.',
    clientState: 'Karnataka',
    clientStateCode: '29',
    templateType: 'ALTRUIST',
    amountInWords: 'Sixty Six Thousand Eighty only.',
    signatureImage: DEFAULT_SIGNATURE_STAMP,
    items: ALTRUIST_SAMPLE_ITEMS,
  },
  {
    id: 'seed-altruist-gb-1',
    _id: 'seed-altruist-gb-1',
    invoiceNo: 'INV-2026-ALT-GB-01',
    client: 'Altruist GB',
    projectMilestone: 'Operations Placement & Billing · 13 Candidates (Airtel Black, BB Gold, Mobility, MLob...)',
    amount: 97940,
    basicAmount: 83000,
    sgstAmount: 7470,
    cgstAmount: 7470,
    dueDate: '30 days',
    status: 'Pending',
    paidDate: '',
    invoiceDate: '2026-10-15',
    notes: 'Altruist GB Garvebhavi palya Tax Invoice.',
    clientGstin: '29AAFCA3725N1ZC',
    clientAddress: 'Garvebhavi palya, Behind RNS Motors, HGSL Chambers NO 4,5,6, Begur Hobli, Hosur Main Road, Bangalore, Hongasandra Village, Bengaluru (Bangalore) Urban, Karnataka, 560068',
    clientState: 'Karnataka',
    clientStateCode: '29',
    templateType: 'ALTRUIST_GB',
    amountInWords: 'Ninety-Seven Thousand Nine Hundred Forty only.',
    signatureImage: DEFAULT_SIGNATURE_STAMP,
    items: ALTRUIST_GB_SAMPLE_ITEMS,
  },
  {
    id: 'seed-onepointone-1',
    _id: 'seed-onepointone-1',
    invoiceNo: 'INV-247',
    client: 'One Point One Solutions Ltd',
    projectMilestone: 'Candidate Placement & Process Billing · 14 Processes (Razorpay, TATA, ICICI, SBI, Domino\'s...)',
    amount: 57820,
    basicAmount: 49000,
    sgstAmount: 4410,
    cgstAmount: 4410,
    dueDate: '30 days',
    status: 'Pending',
    paidDate: '',
    invoiceDate: '2026-10-15',
    notes: 'AKR Infinity 7th Mile Hosur Road candidate billing.',
    clientGstin: '29AACCD9158MIZZ',
    clientAddress: '3rd Floor, AKR Infinity, Sy No. 113, Krishna Reddy Industrial Area, 7th Mile Hosur Road Bangalore, Karnataka 560068 India.',
    clientState: 'Karnataka',
    clientStateCode: '29',
    templateType: 'ONE_POINT_ONE',
    amountInWords: 'Fifty-Seven Thousand Eight Hundred Twenty only.',
    signatureImage: DEFAULT_SIGNATURE_STAMP,
    items: ONE_POINT_ONE_SAMPLE_ITEMS,
  },
  {
    id: 'seed-radicalminds-1',
    _id: 'seed-radicalminds-1',
    invoiceNo: 'INV-01',
    client: 'Radical Minds Technologies Pvt Ltd',
    projectMilestone: 'Candidate Placement & Billing · 16 Candidates',
    amount: 86140,
    basicAmount: 73000,
    sgstAmount: 6570,
    cgstAmount: 6570,
    dueDate: '30 days',
    status: 'Pending',
    paidDate: '',
    invoiceDate: '2025-09-04',
    notes: 'Krimson Square HSR Layout candidate placement invoice.',
    clientGstin: '29AAFCR0597P1ZJ',
    clientAddress: 'Krimson Square, 31/9, Aayee Matha Temple Rd, Muneswara Nagar, Sector 6, HSR Layout, Bengaluru, Karnataka 560102',
    clientState: 'Karnataka',
    clientStateCode: '29',
    templateType: 'RADICAL_MINDS',
    amountInWords: 'Eighty Six Thousand One Hundred and Forty only.',
    signatureImage: DEFAULT_SIGNATURE_STAMP,
    items: RADICAL_MINDS_SAMPLE_ITEMS,
  },
  {
    id: 'seed-1',
    _id: 'seed-1',
    invoiceNo: 'INV-001',
    client: 'Apex Corp',
    projectMilestone: 'Brand Identity · Kickoff',
    amount: 29500,
    dueDate: '10 May',
    status: 'Paid',
    paidDate: '2026-05-10',
    invoiceDate: '2026-05-01',
    notes: 'Kickoff milestone paid via wire transfer.',
  },
  {
    id: 'seed-2',
    _id: 'seed-2',
    invoiceNo: 'INV-002',
    client: 'Apex Corp',
    projectMilestone: 'Brand Identity · Design Delivery',
    amount: 47200,
    dueDate: '24 May',
    status: 'Pending',
    invoiceDate: '2026-05-10',
    notes: 'Design review completed. Invoice sent for approval.',
  },
  {
    id: 'seed-3',
    _id: 'seed-3',
    invoiceNo: 'INV-003',
    client: 'Apex Corp',
    projectMilestone: 'Brand Identity · Development',
    amount: 53100,
    dueDate: '15 Jun',
    status: 'Pending',
    invoiceDate: '2026-05-15',
    notes: 'Frontend & UI engineering phase.',
  },
  {
    id: 'seed-4',
    _id: 'seed-4',
    invoiceNo: 'INV-000A',
    client: 'Nexus Media',
    projectMilestone: 'Digital Brand Activation · Retainer',
    amount: 185000,
    dueDate: '28 Apr',
    status: 'Paid',
    paidDate: '2026-04-28',
    invoiceDate: '2026-04-10',
    notes: 'Retainer payment cleared in full.',
  },
  {
    id: 'seed-5',
    _id: 'seed-5',
    invoiceNo: 'INV-000B',
    client: 'Starlight Tech',
    projectMilestone: 'UX Design System Architecture',
    amount: 115000,
    dueDate: '14 Apr',
    status: 'Paid',
    paidDate: '2026-04-14',
    invoiceDate: '2026-04-01',
    notes: 'Cleared via NEFT.',
  },
  {
    id: 'seed-6',
    _id: 'seed-6',
    invoiceNo: 'INV-000C',
    client: 'TechCorp Solutions',
    projectMilestone: 'Enterprise Integration Advisory',
    amount: 90500,
    dueDate: '02 Apr',
    status: 'Paid',
    paidDate: '2026-04-02',
    invoiceDate: '2026-03-25',
    notes: 'Payment confirmed on receipt.',
  },
];

const DEFAULT_CLIENTS = [
  {
    id: 'c-ison',
    name: 'ISON XPERIENCES INDIA PRIVATE LIMITED',
    email: 'sudheesh.kumar@isonxperiences.com, maqsood.khan@isonxperiences.com, navaneetha.krishnan@isonxperiences.com, Preethi.s@isonxperiences.com',
    contactPerson: 'Sudheesh Kumar, Maqsood Khan, Navaneetha Krishnan, Preethi S.',
    phone: '+91 80 4912 3400',
    gstin: '29AADCI1246E1ZT',
    address: 'Building No. H208, 1st & 2nd Floor, 36/5 Somyasundarpalya, 27th Main Road, Sector 2 HSR Layout, Bengaluru, Karnataka-560102',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'Customer Experience & BPO Services',
    paymentTerms: 'Net 30',
    templateType: 'GST_INV_1',
  },
  {
    id: 'c-fivesplash',
    name: 'Five Splash Infotech Pvt. Ltd- Bangalore',
    email: 'jyotiranjan.nayak@fivesdigital.com',
    contactPerson: 'Jyotiranjan Nayak',
    phone: '+91 80 4600 5000',
    gstin: '29AABCF3991K1Z5',
    address: '46/4, Novel Tech Park, Hosur Rd, Kudlugate, Krishna Reddy Industrial Area, Behind HSR, Bengaluru, Karnataka 560068.',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'BPO & IT Enabled Services',
    paymentTerms: 'Net 30',
    templateType: 'FIVE_SPLASH',
  },
  {
    id: 'c-altruist',
    name: 'Altruist Technologies Pvt. Ltd.',
    email: 'jyotiranjan.nayak@altruistindia.com, Hiringpartner.blr@altruistindia.com',
    contactPerson: 'Jyotiranjan Nayak, Hiring Partner BLR',
    phone: '+91 80 4900 1200',
    gstin: '29AAFCA3725N1ZC',
    address: 'AKR Tech Park, 46/1, NH 44, near Krishna Reddy Industrial Area, Kudlu Gate, Bengaluru – 560068.',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'BPO & Telecom VAS',
    paymentTerms: 'Net 30',
    templateType: 'ALTRUIST',
  },
  {
    id: 'c-altruist-gb',
    name: 'Altruist GB',
    email: 'Abhilash.Nair@altruistindia.com, prachi.kadam@altruistindia.com',
    contactPerson: 'Abhilash Nair, Prachi Kadam',
    phone: '+91 80 4900 1250',
    gstin: '29AAFCA3725N1ZC',
    address: 'Garvebhavi palya, Behind RNS Motors, HGSL Chambers NO 4,5,6, Begur Hobli, Hosur Main Road, Bangalore, Hongasandra Village, Bengaluru (Bangalore) Urban, Karnataka, 560068',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'BPO & Telecom VAS',
    paymentTerms: 'Net 30',
    templateType: 'ALTRUIST_GB',
  },
  {
    id: 'c-onepointone',
    name: 'One Point One Solutions Ltd',
    email: 'Sandeep.k@1point1.com, shibabrata.lenka@1point1.com',
    contactPerson: 'Sandeep K., Shibabrata Lenka',
    phone: '+91 80 6790 3300',
    gstin: '29AACCD9158MIZZ',
    address: '3rd Floor, AKR Infinity, Sy No. 113, Krishna Reddy Industrial Area, 7th Mile Hosur Road Bangalore, Karnataka 560068 India.',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'BPO & Customer Experience',
    paymentTerms: 'Net 30',
    templateType: 'ONE_POINT_ONE',
  },
  {
    id: 'c-radicalminds',
    name: 'Radical Minds Technologies Pvt Ltd',
    email: 'vishal.yadawad@radicalminds.net, rupak.chatterjee@radicalminds.net',
    contactPerson: 'Vishal Yadawad, Rupak Chatterjee',
    phone: '+91 80 4321 8800',
    gstin: '29AAFCR0597P1ZJ',
    address: 'Krimson Square, 31/9, Aayee Matha Temple Rd, Muneswara Nagar, Sector 6, HSR Layout, Bengaluru, Karnataka 560102',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'BPO & Customer Management Services',
    paymentTerms: 'Net 30',
    templateType: 'RADICAL_MINDS',
  },
  {
    id: 'c-startek',
    name: 'Startek',
    email: 'rohit.pal@startek.com, Sangana.bala@startek.com',
    contactPerson: 'Rohit Pal, Sangana Bala',
    phone: '+91 80 4000 6000',
    gstin: '29AAECS4930J1ZO',
    address: 'Novel Tech Park, 46/4, Garvebhavipalya, Kudlu Gate, Bengaluru, Karnataka 560068',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'BPO & Customer Experience',
    paymentTerms: 'Net 30',
    templateType: 'MODERN',
  },
  { id: 'c-1', name: 'Apex Corp', email: 'billing@apexcorp.com', phone: '+91 98201 44521', industry: 'Branding & Tech' },
  { id: 'c-2', name: 'Nexus Media', email: 'finance@nexusmedia.com', phone: '+91 97110 33912', industry: 'Digital Media' },
  { id: 'c-3', name: 'Starlight Tech', email: 'accounts@starlighttech.io', phone: '+91 99400 88214', industry: 'Cloud & AI' },
  { id: 'c-4', name: 'TechCorp Solutions', email: 'ap@techcorp.com', phone: '+91 98450 11984', industry: 'Enterprise Software' },
  { id: 'c-5', name: 'CEGS Global', email: 'finance@cegs.in', phone: '+91 80 4123 9900', industry: 'Staffing & HR' },
];

// ============================================================================
// TEMPLATE 1: FIVE SPLASH INFOTECH PVT. LTD - BANGALORE
// ============================================================================
function FiveSplashInvoiceTemplate({ invoice, items, basicAmt, cgstAmt, sgstAmt, totalBill, amountInWords, onSignatureUpload }) {
  return (
    <div style={{ padding: '24px 28px', background: '#FFFFFF', color: '#000000', fontSize: 11, fontFamily: 'Arial, "Helvetica Neue", sans-serif' }}>
      {/* HEADER: USER COMMAND: "remove that logo and as ison keep our company and at last digital sigature upload option" */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          CAREER EXPERTS GLOBAL SOLUTIONS
        </div>
        <div style={{ fontSize: 11, color: '#333333', marginTop: 2 }}>
          #1, Masjid Street, Neelasandra, Bengaluru – 560047, Karnataka, India.
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, margin: '12px 0 2px' }}>
          Invoice
        </div>
      </div>

      <div style={{ textAlign: 'right', fontSize: 11.5, fontWeight: 700, marginBottom: 12 }}>
        Date:{invoice.invoiceDate || 'xx/xx/xxxx.'}
      </div>

      {/* TO / CLIENT SECTION */}
      <div style={{ fontSize: 11.5, lineHeight: 1.55, marginBottom: 14 }}>
        <div style={{ fontWeight: 700 }}>To,</div>
        <div style={{ fontWeight: 800 }}>Five Splash Infotech Pvt. Ltd- Bangalore</div>
        <div>GST : {invoice.clientGstin || '29AABCF3991K1Z5'}</div>
        <div>46/4, Novel Tech Park,</div>
        <div>Hosur Rd, Kudlugate, Krishna Reddy Industrial Area,</div>
        <div>Behind HSR, Bengaluru, Karnataka 560068.</div>
        <div>PAN No. AABCF3991K</div>
      </div>

      {/* 6-COLUMN CANDIDATE & SERVICE TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 11, border: '1.5px solid #000000' }}>
        <thead>
          <tr>
            <th colSpan={6} style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 800, fontSize: 11.5 }}>
              Invoice No.{invoice.invoiceNo || 'xxx'}
            </th>
          </tr>
          <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '15%' }}>Emp ID</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '20%' }}>Name</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '18%' }}>Phone Number</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '18%' }}>Process</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '14%' }}>DOJ</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '15%' }}>Billing Amt</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #000000', padding: '5px 4px' }}>{row.empId || 'xxxx'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 4px' }}>{row.employeeName || 'xxxx'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 4px' }}>{row.phone || 'xxxx'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 4px', fontWeight: 600 }}>{row.processLob || 'Process'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 4px' }}>{row.doj || 'xx/xx/xxxx'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
                ₹{Number(row.amount || row.ratePerSeat || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          ))}

          {/* TOTAL */}
          <tr style={{ fontWeight: 800 }}>
            <td colSpan={5} style={{ border: '1px solid #000000', padding: '6px 12px', textAlign: 'right' }}>TOTAL</td>
            <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900 }}>
              ₹{Number(basicAmt).toLocaleString('en-IN')}
            </td>
          </tr>
          {/* CGST */}
          <tr>
            <td colSpan={5} style={{ border: '1px solid #000000', padding: '5px 12px', textAlign: 'right', fontWeight: 700 }}>CGST 9%</td>
            <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
              ₹{Number(cgstAmt).toLocaleString('en-IN')}
            </td>
          </tr>
          {/* SGST */}
          <tr>
            <td colSpan={5} style={{ border: '1px solid #000000', padding: '5px 12px', textAlign: 'right', fontWeight: 700 }}>SGST 9%</td>
            <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
              ₹{Number(sgstAmt).toLocaleString('en-IN')}
            </td>
          </tr>
          {/* GRAND TOTAL */}
          <tr style={{ fontWeight: 900 }}>
            <td colSpan={5} style={{ border: '1px solid #000000', padding: '7px 12px', textAlign: 'right', fontSize: 11.5 }}>Grand Total</td>
            <td style={{ border: '1px solid #000000', padding: '7px 8px', textAlign: 'right', fontSize: 12, fontWeight: 900 }}>
              ₹{Number(totalBill).toLocaleString('en-IN')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* RUPEES IN WORDS & TAX IDS */}
      <div style={{ marginTop: 14, fontSize: 11, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700 }}>Rupees in words: <span style={{ fontWeight: 800 }}>{amountInWords}</span></div>
        <div style={{ marginTop: 6 }}><strong>GST No. :</strong> 29DWCPM8081C2ZB</div>
        <div><strong>SAC No. :</strong> 99851</div>
        <div><strong>PAN no:</strong> DWCPM8081C</div>
      </div>

      {/* PAYMENT DETAILS & SIGNATURE (WITH UPLOAD OPTION) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', marginTop: 18, alignItems: 'flex-end', gap: 16 }}>
        <div style={{ fontSize: 11, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Please make the Payments in favor Of</div>
          <div style={{ fontWeight: 800, textDecoration: 'underline' }}>Payment Details:</div>
          <div>Account Number: <strong>50200080303100</strong></div>
          <div>Account Holder Name: <strong>Career Experts Global solutions</strong></div>
          <div>Bank Name: <strong>HDFC</strong></div>
          <div>IFSC Code: <strong>HDFC0000509</strong></div>
          <div>Account Type: <strong>Current Account.</strong></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: 6 }}>
            <DigitalSignatureBadge
              name="MOHAMMED USMAN ZABI"
              date={invoice.invoiceDate || '19/09/2026'}
              customImage={invoice.signatureImage}
            />
          </div>
          <div style={{ fontWeight: 800, fontSize: 11 }}>
            Authorized Signature with stamp.
          </div>
          {/* USER COMMAND: "and at last digital sigature upload option" */}
          {onSignatureUpload && (
            <div className="no-print-zone" style={{ marginTop: 8 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#F1F5F9', border: '1px dashed #64748B', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#334155' }}>
                <Upload size={12} />
                <span>Upload Digital Signature</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onSignatureUpload} />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ marginTop: 28, paddingTop: 10, borderTop: '1px solid #000000', textAlign: 'center', fontSize: 10.5, lineHeight: 1.5 }}>
        <div>#1, Masjid Street, Neelasandra, Bengaluru – 560047, Karnataka, India.</div>
        <div style={{ fontWeight: 800, textDecoration: 'underline' }}>Career Experts Global Solutions</div>
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATE 2 & 3: ALTRUIST TECHNOLOGIES (KUDLU GATE) & ALTRUIST GB (GARVEBHAVI)
// ============================================================================
function AltruistInvoiceTemplate({ invoice, items, basicAmt, cgstAmt, sgstAmt, totalBill, amountInWords, isGB }) {
  const clientAddr = isGB
    ? 'Garvebhavi palya, Behind RNS Motors, HGSL Chambers NO 4,5,6, Begur Hobli, Hosur Main Road, Bangalore, Hongasandra Village, Bengaluru ( Bangalore) Urban, Karnataka, 560068'
    : 'AKR Tech Park, 46/1, NH 44, near Krishna Reddy Industrial Area, Kudlu Gate, Bengaluru – 560068.';
  const consigneeAddr = isGB
    ? 'Garvebhavi palya, Behind RNS Motors, HGSL Chambers NO 4,5,6, Begur Hobli, Hosur Main Road, Bangalore, Hongasandra Village, Bengaluru (Bangalore) Urban, Karnataka, 560068'
    : 'AKR Tech Park, 46/1, NH 44, near Krishna Reddy Industrial Area, Kudlu Gate, Bengaluru – 560068';

  return (
    <div style={{ background: '#FFFFFF', color: '#000000', fontSize: 11, fontFamily: 'Arial, "Helvetica Neue", sans-serif', border: '1.5px solid #000000' }}>
      {/* ROW 1: HEADER TITLE */}
      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 13, padding: '7px 10px', borderBottom: '1.5px solid #000000' }}>
        Invoice
      </div>

      {/* ROW 2: SUPPLIER DETAILS & SERIAL / DATE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', borderBottom: '1.5px solid #000000' }}>
        <div style={{ padding: '8px 12px', borderRight: '1.5px solid #000000', lineHeight: 1.55 }}>
          <div><strong>GST ID:</strong>(29DWCPM8081C2ZB)</div>
          <div><strong>Name:</strong> Career Experts Global Solutions.</div>
          <div><strong>Address:</strong> #1, Masjid Street, Neelasandra, Bangalore – 560047.</div>
          <div><strong>State:</strong> Karnataka.</div>
          <div><strong>Contact No:</strong>7892220496.</div>
          <div><strong>PAN Card No:</strong> DWCPM8081C.</div>
          <div><strong>Email:</strong> zabiusman@careerexpertglobalsolution.com</div>
        </div>
        <div style={{ padding: '8px 12px', lineHeight: 1.6 }}>
          <div><strong>Serial No. of Invoice:</strong> {invoice.invoiceNo || '----.'}</div>
          <div><strong>Date of Invoice:</strong> {invoice.invoiceDate || '------.'}</div>
        </div>
      </div>

      {/* ROW 3: RECEIVER & CONSIGNEE BOXES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1.5px solid #000000' }}>
        <div style={{ padding: '8px 12px', borderRight: '1.5px solid #000000', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 800, textDecoration: 'underline', marginBottom: 3 }}>Details of Receiver (Billed to)</div>
          <div><strong>Name:</strong> Altruist Technologies Pvt. Ltd.</div>
          <div><strong>Address:</strong> {clientAddr}</div>
          <div><strong>State:</strong> Karnataka</div>
          <div><strong>PAN:</strong> AAFCA3725N</div>
          <div><strong>State Code:</strong></div>
          <div><strong>GST ID:</strong> 29AAFCA3725N1ZC</div>
        </div>
        <div style={{ padding: '8px 12px', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 800, textDecoration: 'underline', marginBottom: 3 }}>Details of Consignee (Shipped to)</div>
          <div><strong>Name:</strong> Altruist Technologies Pvt. Ltd.</div>
          <div><strong>Address:</strong> {consigneeAddr}</div>
          <div><strong>State:</strong> Karnataka</div>
          <div><strong>PAN:</strong> AAFCA3725N</div>
          <div><strong>State Code:</strong></div>
          <div><strong>GST ID:</strong> 29AAFCA3725N1ZC</div>
        </div>
      </div>

      {/* ROW 4: INVOICE SUB-HEADER */}
      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 12, padding: '5px', borderBottom: '1.5px solid #000000' }}>
        INVOICE:{invoice.invoiceNo || 'xxx'}
      </div>

      {/* ROW 5: 9-COLUMN SERVICE TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 10.5 }}>
        <thead>
          <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #000000', textAlign: 'center', fontWeight: 800 }}>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 4px', width: '5%' }}>S.No.</th>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 4px', width: '9%' }}>Emp. Code</th>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 4px', width: '9%' }}>Emp. Name</th>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 6px', width: '25%' }}>Designation</th>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 4px', width: '9%' }}>DOJ</th>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 6px', width: '15%' }}>Process</th>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 4px', width: '8%' }}>HSN/SAC</th>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 6px', width: '10%' }}>Rate as per Contract</th>
            <th style={{ padding: '6px 6px', width: '10%' }}>Total Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #000000' }}>
              <td style={{ borderRight: '1px solid #000000', padding: '5px 4px', textAlign: 'center' }}>
                {row.sno || String(idx + 1).padStart(2, '0')}
              </td>
              <td style={{ borderRight: '1px solid #000000', padding: '5px 4px', textAlign: 'center' }}>{row.empId || 'xxxxx'}</td>
              <td style={{ borderRight: '1px solid #000000', padding: '5px 4px', textAlign: 'center' }}>{row.employeeName || 'xyz'}</td>
              <td style={{ borderRight: '1px solid #000000', padding: '5px 6px', fontSize: 10 }}>{row.designation || 'Business AssociateOperation.'}</td>
              <td style={{ borderRight: '1px solid #000000', padding: '5px 4px', textAlign: 'center' }}>{row.doj || 'x/x/xx-'}</td>
              <td style={{ borderRight: '1px solid #000000', padding: '5px 6px', textAlign: 'center', fontWeight: 600 }}>{row.processLob || 'Process'}</td>
              <td style={{ borderRight: '1px solid #000000', padding: '5px 4px', textAlign: 'center' }}>{row.sacCode || 'BPO'}</td>
              <td style={{ borderRight: '1px solid #000000', padding: '5px 6px', textAlign: 'right' }}>
                ₹{Number(row.ratePerSeat || row.amount || 0).toLocaleString('en-IN')}
              </td>
              <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700 }}>
                ₹{Number(row.amount || row.ratePerSeat || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          ))}

          {/* TOTAL INVOICE VALUE */}
          <tr style={{ borderBottom: '1px solid #000000', fontWeight: 800 }}>
            <td colSpan={7} style={{ borderRight: '1px solid #000000', padding: '6px 12px', textAlign: 'right' }}>
              Total Invoice Value
            </td>
            <td style={{ borderRight: '1px solid #000000', padding: '6px 6px', textAlign: 'right' }}>
              ₹{Number(basicAmt).toLocaleString('en-IN')}
            </td>
            <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 900 }}>
              ₹{Number(basicAmt).toLocaleString('en-IN')}
            </td>
          </tr>
          {/* CGST */}
          <tr style={{ borderBottom: '1px solid #000000' }}>
            <td colSpan={7} style={{ borderRight: '1px solid #000000', padding: '5px 12px', textAlign: 'right', fontWeight: 700 }}>
              CGST @ 09%
            </td>
            <td style={{ borderRight: '1px solid #000000', padding: '5px 6px', textAlign: 'right' }}>
              ₹{Number(cgstAmt).toLocaleString('en-IN')}
            </td>
            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700 }}>
              ₹{Number(cgstAmt).toLocaleString('en-IN')}
            </td>
          </tr>
          {/* SGST */}
          <tr style={{ borderBottom: '1px solid #000000' }}>
            <td colSpan={7} style={{ borderRight: '1px solid #000000', padding: '5px 12px', textAlign: 'right', fontWeight: 700 }}>
              SGST @ 09%
            </td>
            <td style={{ borderRight: '1px solid #000000', padding: '5px 6px', textAlign: 'right' }}>
              ₹{Number(sgstAmt).toLocaleString('en-IN')}
            </td>
            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700 }}>
              ₹{Number(sgstAmt).toLocaleString('en-IN')}
            </td>
          </tr>
          {/* GRAND TOTAL */}
          <tr style={{ fontWeight: 900 }}>
            <td colSpan={7} style={{ borderRight: '1px solid #000000', padding: '7px 12px', textAlign: 'right', fontSize: 11.5 }}>
              Grand Total
            </td>
            <td style={{ borderRight: '1px solid #000000', padding: '7px 6px', textAlign: 'right', fontSize: 12 }}>
              ₹{Number(totalBill).toLocaleString('en-IN')}
            </td>
            <td style={{ padding: '7px 6px', textAlign: 'right', fontSize: 12, fontWeight: 900 }}>
              ₹{Number(totalBill).toLocaleString('en-IN')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ROW 6: AMOUNT IN WORDS */}
      <div style={{ padding: '7px 12px', borderBottom: '1.5px solid #000000', fontSize: 11, fontWeight: 700 }}>
        Invoice Amount in words : <span style={{ fontWeight: 800 }}>{amountInWords}</span>
      </div>

      {/* ROW 7: BANK & SIGNATURE BLOCK */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr' }}>
        <div style={{ padding: '10px 12px', borderRight: '1.5px solid #000000', fontSize: 11, lineHeight: 1.6 }}>
          {isGB && <div style={{ fontWeight: 800, textDecoration: 'underline', marginBottom: 2 }}>Bank Transfer Details</div>}
          <div><strong>Favoring Name:</strong> Career Experts Global Solutions.</div>
          <div><strong>Bank Name:</strong> HDFC Bank.</div>
          <div><strong>Bank Account No.:</strong>50200080303100.</div>
          <div><strong>IFSC :</strong>HDFC0000509</div>
        </div>
        <div style={{ padding: '10px 14px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 96 }}>
          {isGB && <div style={{ fontSize: 11, fontWeight: 800, width: '100%', textAlign: 'left' }}>For:</div>}
          <div style={{ margin: '4px 0' }}>
            <DigitalSignatureBadge
              name="MOHAMMED USMAN ZABI"
              date={invoice.invoiceDate || '19/09/2026'}
              customImage={invoice.signatureImage}
            />
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span>Stamp</span>
            <span>Authorized Signatory</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATE 4: ONE POINT ONE SOLUTIONS LTD
// ============================================================================
function OnePointOneInvoiceTemplate({ invoice, items, basicAmt, cgstAmt, sgstAmt, totalBill, amountInWords }) {
  return (
    <div style={{ padding: '24px 28px', background: '#FFFFFF', color: '#000000', fontSize: 11, fontFamily: 'Arial, "Helvetica Neue", sans-serif' }}>
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 16.5, fontWeight: 900, color: '#000000' }}>
          Career Expert Global Solution,
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#333333', marginTop: 2 }}>
          #1, Masjid Street, Richard Xavier Colony, Neelasandra, Bangalore - 560047
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 800, margin: '8px 0 2px' }}>
          Invoice
        </div>
      </div>

      <div style={{ textAlign: 'right', fontSize: 11.5, fontWeight: 700, marginBottom: 12 }}>
        Date: {invoice.invoiceDate || 'xx/xx/xxxx.'}
      </div>

      {/* BILL TO */}
      <div style={{ fontSize: 11.5, lineHeight: 1.5, marginBottom: 14 }}>
        <div style={{ fontWeight: 700 }}>To,</div>
        <div style={{ fontWeight: 800 }}>One Point One Solutions Ltd,</div>
        <div>CIN: 29AACCD9158MIZZ.</div>
        <div>3rd Floor, AKR Infinity, Sy No. 113,</div>
        <div>Krishna Reddy Industrial Area, 7th Mile Hosur Road</div>
        <div>Bangalore,</div>
        <div>Karnataka 560068 India.</div>
      </div>

      {/* 6-COLUMN TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 11, border: '1.5px solid #000000' }}>
        <thead>
          <tr>
            <th colSpan={6} style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 800, fontSize: 11.5 }}>
              Invoice No.{invoice.invoiceNo || '247'}
            </th>
          </tr>
          <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '14%' }}>Emp ID</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '19%' }}>Name</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '17%' }}>Phone Number</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '20%' }}>Process</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '14%' }}>DOJ</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '16%' }}>Billing Amt</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #000000', padding: '5px 4px' }}>{row.empId || 'xxxx'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 4px' }}>{row.employeeName || 'xxxx'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 4px' }}>{row.phone || 'xxxx'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 4px', fontWeight: 600 }}>
                {row.processLob || 'Process'}
                {row.notes ? <div style={{ fontSize: 9.5, color: '#555' }}>{row.notes}</div> : null}
              </td>
              <td style={{ border: '1px solid #000000', padding: '5px 4px' }}>{row.doj || 'xx/xx/xxxx'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
                {Number(row.amount || row.ratePerSeat || 0) > 0
                  ? Number(row.amount || row.ratePerSeat || 0).toLocaleString('en-IN')
                  : '7.33% / 8.33%'}
              </td>
            </tr>
          ))}

          {/* TOTAL */}
          <tr style={{ fontWeight: 800 }}>
            <td colSpan={5} style={{ border: '1px solid #000000', padding: '6px 12px', textAlign: 'right' }}>Total</td>
            <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900 }}>
              {Number(basicAmt).toLocaleString('en-IN')}
            </td>
          </tr>
          {/* CGST */}
          <tr>
            <td colSpan={5} style={{ border: '1px solid #000000', padding: '5px 12px', textAlign: 'right', fontWeight: 700 }}>CGST 9%</td>
            <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
              ₹{Number(cgstAmt).toLocaleString('en-IN')}
            </td>
          </tr>
          {/* SGST */}
          <tr>
            <td colSpan={5} style={{ border: '1px solid #000000', padding: '5px 12px', textAlign: 'right', fontWeight: 700 }}>SGST 9%</td>
            <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
              ₹{Number(sgstAmt).toLocaleString('en-IN')}
            </td>
          </tr>
          {/* GRAND TOTAL */}
          <tr style={{ fontWeight: 900 }}>
            <td colSpan={5} style={{ border: '1px solid #000000', padding: '7px 12px', textAlign: 'right', fontSize: 11.5 }}>Grand Total</td>
            <td style={{ border: '1px solid #000000', padding: '7px 8px', textAlign: 'right', fontSize: 12, fontWeight: 900 }}>
              ₹{Number(totalBill).toLocaleString('en-IN')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* METADATA UNDER TABLE */}
      <div style={{ marginTop: 14, fontSize: 11, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700 }}>Rupees in words: <span style={{ fontWeight: 800 }}>{amountInWords}</span></div>
        <div style={{ marginTop: 6 }}><strong>GST No. :</strong> 29DWCPM8081C2ZB</div>
        <div><strong>SAC No. :</strong> 99851</div>
        <div><strong>PAN no:</strong> DWCPM8081C</div>
      </div>

      {/* PAYMENT DETAILS & SIGNATURE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', marginTop: 18, alignItems: 'flex-end', gap: 16 }}>
        <div style={{ fontSize: 11, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Please make the Payments in favor Of</div>
          <div style={{ fontWeight: 800, textDecoration: 'underline' }}>Payment Details:</div>
          <div>Account Number: <strong>50200080303100</strong></div>
          <div>Account Holder Name: <strong>Career Experts Global solutions</strong></div>
          <div>Bank Name: <strong>HDFC</strong> IFSC Code: <strong>HDFC0000509</strong></div>
          <div>Account Type: <strong>Current Account</strong></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: 6 }}>
            <DigitalSignatureBadge
              name="MOHAMMED USMAN ZABI"
              date={invoice.invoiceDate || '02/09/2026'}
              customImage={invoice.signatureImage}
            />
          </div>
          <div style={{ fontWeight: 800, fontSize: 11 }}>
            Authorized Signature.
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATE 5: RADICAL MINDS TECHNOLOGIES PVT LTD
// ============================================================================
function RadicalMindsInvoiceTemplate({ invoice, items, basicAmt, cgstAmt, sgstAmt, totalBill, amountInWords }) {
  return (
    <div style={{ padding: '24px 28px', background: '#FFFFFF', color: '#000000', fontSize: 11, fontFamily: 'Arial, "Helvetica Neue", sans-serif' }}>
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 15.5, fontWeight: 900, color: '#000000' }}>
          Career Expert Global Solution, #1, Masjid Street, Richard Xavier Colony,
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#333333', marginTop: 2 }}>
          Neelasandra, Bangalore - 560047
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 800, margin: '8px 0 2px' }}>
          Invoice
        </div>
      </div>

      <div style={{ textAlign: 'right', fontSize: 11.5, fontWeight: 700, marginBottom: 12 }}>
        Date: {invoice.invoiceDate || '04/09/2025'}
      </div>

      {/* BILL TO */}
      <div style={{ fontSize: 11.5, lineHeight: 1.5, marginBottom: 14 }}>
        <div style={{ fontWeight: 700 }}>To,</div>
        <div style={{ fontWeight: 800 }}>Radical Minds Technologies Pvt Ltd</div>
        <div>Krimson Square, 31/9, Aayee Matha Temple Rd,</div>
        <div>Muneswara Nagar, Sector 6, HSR Layout,</div>
        <div>Bengaluru, Karnataka 560102</div>
        <div>GST : 29AAFCR0597P1ZJ</div>
      </div>

      {/* 6-COLUMN TABLE (WITH STATUS COLUMN) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 10.5, border: '1.5px solid #000000' }}>
        <thead>
          <tr>
            <th colSpan={6} style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 800, fontSize: 11.5 }}>
              Invoice No. {invoice.invoiceNo || '1'}
            </th>
          </tr>
          <tr style={{ background: '#F8FAFC', fontWeight: 800 }}>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '15%' }}>Emp ID</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '22%' }}>Name</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '22%' }}>Phone Number</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '12%' }}>Status</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '14%' }}>DOJ</th>
            <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '15%' }}>Billing Amt</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #000000', padding: '5px 4px' }}>{row.empId || 'xxxx'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 4px', fontWeight: 600 }}>{row.employeeName || 'xxxx'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 4px' }}>{row.phone || 'xxxx'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 4px' }}>{row.status || 'Active'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 4px' }}>{row.doj || 'xx/xx/xxxx'}</td>
              <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
                ₹ {Number(row.amount || row.ratePerSeat || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          ))}

          {/* TOTAL */}
          <tr style={{ fontWeight: 800 }}>
            <td colSpan={5} style={{ border: '1px solid #000000', padding: '6px 12px', textAlign: 'right' }}>TOTAL</td>
            <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900 }}>
              ₹ {Number(basicAmt).toLocaleString('en-IN')}
            </td>
          </tr>
          {/* CGST */}
          <tr>
            <td colSpan={5} style={{ border: '1px solid #000000', padding: '5px 12px', textAlign: 'right', fontWeight: 700 }}>CGST 9%</td>
            <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
              ₹ {Number(cgstAmt).toLocaleString('en-IN')}
            </td>
          </tr>
          {/* SGST */}
          <tr>
            <td colSpan={5} style={{ border: '1px solid #000000', padding: '5px 12px', textAlign: 'right', fontWeight: 700 }}>SGST 9%</td>
            <td style={{ border: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
              ₹ {Number(sgstAmt).toLocaleString('en-IN')}
            </td>
          </tr>
          {/* GRAND TOTAL */}
          <tr style={{ fontWeight: 900 }}>
            <td colSpan={5} style={{ border: '1px solid #000000', padding: '7px 12px', textAlign: 'right', fontSize: 11.5 }}>Grand Total</td>
            <td style={{ border: '1px solid #000000', padding: '7px 8px', textAlign: 'right', fontSize: 12, fontWeight: 900 }}>
              ₹ {Number(totalBill).toLocaleString('en-IN')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* METADATA UNDER TABLE */}
      <div style={{ marginTop: 14, fontSize: 11, lineHeight: 1.6 }}>
        <div style={{ fontSize: 10.5, color: '#444', marginBottom: 4 }}>
          Career Expert Global Solution, #1, Masjid Street, Richard Xavier Colony, Neelasandra, Bangalore - 560047
        </div>
        <div style={{ fontWeight: 700 }}>Rupees in words: <span style={{ fontWeight: 800 }}>{amountInWords}</span></div>
        <div style={{ marginTop: 6 }}><strong>GST No. :</strong> 29DWCPM8081C2ZB</div>
        <div><strong>SAC No. :</strong> 99851</div>
        <div><strong>PAN no:</strong> DWCPM8081C</div>
      </div>

      {/* PAYMENT DETAILS & SIGNATURE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', marginTop: 18, alignItems: 'flex-end', gap: 16 }}>
        <div style={{ fontSize: 11, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Please make the Payments in favor Of</div>
          <div style={{ fontWeight: 800, textDecoration: 'underline' }}>Payment Details:</div>
          <div>Account Number: <strong>50200080303100</strong></div>
          <div>Account Holder Name: <strong>Career Experts Global Solutions</strong></div>
          <div>Bank Name: <strong>HDFC</strong></div>
          <div>IFSC Code: <strong>HDFC0000509</strong></div>
          <div>Account Type: <strong>Current Account.</strong></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: 6 }}>
            <DigitalSignatureBadge
              name="MOHAMMED USMAN ZABI"
              date={invoice.invoiceDate || '2025.09.04'}
              customImage={invoice.signatureImage}
            />
          </div>
          <div style={{ fontWeight: 800, fontSize: 11 }}>
            Authorized Signature with stamp.
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATE 6: ISON XPERIENCES (FORM GST INV - 1)
// ============================================================================
function IsonInvoiceTemplate({ invoice, items, basicAmt, cgstAmt, sgstAmt, totalBill, amountInWords }) {
  return (
    <div style={{ background: '#FFFFFF', color: '#000000', border: '1.5px solid #000000', fontFamily: 'Arial, "Helvetica Neue", sans-serif', fontSize: 11, lineHeight: 1.45 }}>
      {/* HEADER BLOCK */}
      <div style={{ textAlign: 'center', padding: '12px 14px', borderBottom: '1.5px solid #000000' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          Form GST INV – 1
        </div>
        <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.04em', margin: '4px 0 2px' }}>
          CAREER EXPERTS GLOBAL SOLUTIONS
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 600 }}>
          #1, Masjid Street neelasandra, Bengaluru, Karnataka-560047. <strong>INVOICE</strong>
        </div>
      </div>

      {/* ROW 1: SUPPLIER METADATA & TRANSPORT DETAILS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', borderBottom: '1.5px solid #000000' }}>
        <div style={{ padding: '8px 12px', borderRight: '1.5px solid #000000', lineHeight: 1.6 }}>
          <div><strong>GSTIN:</strong> 29DWCPM8081C2ZB</div>
          <div><strong>PAN No:</strong> DWCPM8081C</div>
          <div>
            <strong>Invoice No.:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{invoice.invoiceNo || 'INV-2026-ISON-01'}</span>
          </div>
          <div><strong>PO NO :</strong> {invoice.poNo || '—'}</div>
          <div><strong>Date:</strong> {invoice.invoiceDate || 'xx/xx/xxxx.'}</div>
          <div><strong>Due By:</strong> {invoice.dueDate || '30 days'}</div>
        </div>
        <div style={{ padding: '8px 12px', lineHeight: 1.6 }}>
          <div><strong>Mode of Transport:</strong> {invoice.modeOfTransport || '—'}</div>
          <div><strong>Vehicle No:</strong> {invoice.vehicleNo || '—'}</div>
          <div><strong>Date & Time of Service:</strong> {invoice.dateTimeOfService || invoice.invoiceDate || '—'}</div>
          <div><strong>Place of Service:</strong> <span style={{ fontWeight: 700 }}>{invoice.placeOfService || 'Bangalore'}</span></div>
        </div>
      </div>

      {/* ROW 2: RECEIVER & CONSIGNEE DETAILS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', borderBottom: '1.5px solid #000000' }}>
        <div style={{ padding: '10px 12px', borderRight: '1.5px solid #000000', lineHeight: 1.55 }}>
          <div style={{ fontWeight: 800, fontSize: 11.5, textDecoration: 'underline', marginBottom: 4 }}>
            Details of Receiver (Billed to)
          </div>
          <div style={{ fontWeight: 900, fontSize: 12, color: '#000000' }}>
            {invoice.client || 'ISON XPERIENCES INDIA PRIVATE LIMITED'}
          </div>
          <div style={{ margin: '2px 0' }}>
            {invoice.clientAddress || 'Building No. H208,1st & 2nd Floor, 36/5 Somyasundarpalya,27th Main Road, Sector 2 HSR Layout, Bengaluru, Karnataka-560102'}
          </div>
          <div><strong>State:</strong> {invoice.clientState || 'Karnataka'}</div>
          <div><strong>State Code :</strong> {invoice.clientStateCode || '29'}</div>
          <div><strong>GSTIN/Unique ID:</strong> <span style={{ fontWeight: 700 }}>{invoice.clientGstin || '29AADCI1246E1ZT'}</span></div>
        </div>
        <div style={{ padding: '10px 12px', lineHeight: 1.55 }}>
          <div style={{ fontWeight: 800, fontSize: 11.5, textDecoration: 'underline', marginBottom: 4 }}>
            Details of Consignee (Shipped to)
          </div>
          <div style={{ fontWeight: 700 }}>Name: Career Experts Global Solutions</div>
          <div>#1, Masjid Street, Neelasandra, Bangalore - 560047.</div>
          <div><strong>State:</strong> Karnataka</div>
          <div><strong>State Code :</strong> 29</div>
          <div><strong>GSTIN/Unique ID:</strong> 29DWCPM8081C2ZB</div>
        </div>
      </div>

      {/* ROW 3: SEAT / EMPLOYEE BILLING TABLE (WITH YELLOW HEADER) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#FFF000', borderBottom: '1.5px solid #000000', textAlign: 'center' }}>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 4px', fontWeight: 800, width: '11%' }}>EMP ID</th>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 4px', fontWeight: 800, width: '22%' }}>Employee Name</th>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 4px', fontWeight: 800, width: '11%' }}>DOJ</th>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 4px', fontWeight: 800, width: '17%' }}>Process /LOB</th>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 4px', fontWeight: 800, width: '15%' }}>Rate Per Seat IN Rs.</th>
            <th style={{ borderRight: '1px solid #000000', padding: '6px 4px', fontWeight: 800, width: '10%' }}>SAC Code</th>
            <th style={{ padding: '6px 4px', fontWeight: 800, width: '14%' }}>Amount Rs.</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #000000' }}>
              <td style={{ borderRight: '1px solid #000000', padding: '6px 6px', textAlign: 'center' }}>{row.empId || 'xxxx'}</td>
              <td style={{ borderRight: '1px solid #000000', padding: '6px 6px' }}>{row.employeeName || 'xxxx'}</td>
              <td style={{ borderRight: '1px solid #000000', padding: '6px 6px', textAlign: 'center' }}>{row.doj || 'xx/xx/xxxx'}</td>
              <td style={{ borderRight: '1px solid #000000', padding: '6px 6px', textAlign: 'center', fontWeight: 600 }}>{row.processLob || 'Process'}</td>
              <td style={{ borderRight: '1px solid #000000', padding: '6px 8px', textAlign: 'right' }}>{Number(row.ratePerSeat || 0).toLocaleString('en-IN')}</td>
              <td style={{ borderRight: '1px solid #000000', padding: '6px 6px', textAlign: 'center' }}>{row.sacCode || '99851'}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{Number(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}

          {/* TOTAL AMOUNT ROW */}
          <tr style={{ borderBottom: '1.5px solid #000000', fontWeight: 800 }}>
            <td colSpan={6} style={{ borderRight: '1px solid #000000', padding: '7px 12px', textAlign: 'right', textTransform: 'uppercase' }}>
              TOTAL AMOUNT - IN Rs.
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 900 }}>
              {Number(basicAmt).toLocaleString('en-IN')}
            </td>
          </tr>

          {/* SGST ROW */}
          <tr style={{ borderBottom: '1px solid #000000' }}>
            <td colSpan={5} style={{ borderRight: '1px solid #000000' }}></td>
            <td style={{ borderRight: '1px solid #000000', padding: '6px 8px', fontWeight: 700, fontSize: 10.5 }}>
              SGST @ 9%
            </td>
            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
              {Number(sgstAmt).toLocaleString('en-IN')}
            </td>
          </tr>

          {/* CGST ROW */}
          <tr style={{ borderBottom: '1px solid #000000' }}>
            <td colSpan={5} style={{ borderRight: '1px solid #000000' }}></td>
            <td style={{ borderRight: '1px solid #000000', padding: '6px 8px', fontWeight: 700, fontSize: 10.5 }}>
              CGST @ 9 %
            </td>
            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
              {Number(cgstAmt).toLocaleString('en-IN')}
            </td>
          </tr>

          {/* TOTAL BILL AMOUNT */}
          <tr style={{ borderBottom: '1.5px solid #000000', fontWeight: 900, background: '#FAFAFA' }}>
            <td colSpan={6} style={{ borderRight: '1px solid #000000', padding: '8px 12px', textAlign: 'right', textTransform: 'uppercase', fontSize: 11.5 }}>
              TOTAL BILL AMOUNT - IN Rs.
            </td>
            <td style={{ padding: '8px 8px', textAlign: 'right', fontSize: 12.5, fontWeight: 900 }}>
              {Number(totalBill).toLocaleString('en-IN')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ROW 4: AMOUNT IN WORDS */}
      <div style={{ padding: '8px 12px', borderBottom: '1.5px solid #000000', fontSize: 11.5, fontWeight: 700 }}>
        Amount in Words: <span style={{ fontWeight: 800 }}>{amountInWords}</span>
      </div>

      {/* ROW 5: SIGNATORY BLOCK */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1.5px solid #000000' }}>
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 10.5, color: '#444' }}>{invoice.notes || ''}</div>
        </div>
        <div style={{ padding: '10px 14px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 112 }}>
          <div style={{ fontWeight: 800, fontSize: 11 }}>For CAREER EXPERTS GLOBAL SOLUTIONS</div>
          <div style={{ margin: '4px 0', textAlign: 'right' }}>
            <DigitalSignatureBadge
              name="MOHAMMED USMAN ZABI"
              date={invoice.invoiceDate || '19/09/2026'}
              customImage={invoice.signatureImage}
            />
          </div>
          <div style={{ fontWeight: 800, fontSize: 11 }}>Authorised Signatory</div>
        </div>
      </div>

      {/* ROW 6: PAYMENT INSTRUCTIONS */}
      <div style={{ padding: '10px 12px', fontSize: 10.5, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 800, textDecoration: 'underline', marginBottom: 2 }}>Payment Instructions:</div>
        <div><strong>Name of the Bank:</strong> HDFC</div>
        <div><strong>Banificiary Name:</strong> Career Experts Global Solutions <strong>Bank Account No:</strong> 50200080303100.</div>
        <div><strong>Bank Address:</strong> East Wing, KHB Building, KG Road, Bangalore - 560009.</div>
        <div><strong>IFSC Code:</strong> HDFC0000509.</div>
        <div><strong>RTGS/NEFT Code:</strong> HDFC0000509.</div>
        <div style={{ marginTop: 6, fontWeight: 700 }}>E. & O. E.</div>
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATE 7: MODERN CLEAN EXECUTIVE SUMMARY VIEW
// ============================================================================
function ModernInvoiceTemplate({ invoice, items, basicAmt, cgstAmt, sgstAmt, totalBill, amountInWords }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '32px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #F1F5F9', paddingBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A' }}>
            CAREER EXPERTS GLOBAL SOLUTIONS
          </div>
          <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
            Official Corporate Invoice · Tax Document
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent, #7C3AED)', fontFamily: 'monospace' }}>
            {invoice.invoiceNo || 'INV-001'}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            Date: <strong>{invoice.invoiceDate || '2026-10-15'}</strong> · Due: <strong>{invoice.dueDate || '30 days'}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '20px 0', padding: '16px', background: '#F8FAFC', borderRadius: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Billed To</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{invoice.client}</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{invoice.clientAddress}</div>
          <div style={{ fontSize: 11.5, color: '#0369A1', marginTop: 4, fontWeight: 700 }}>GSTIN: {invoice.clientGstin || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Payment Status</div>
          <div style={{ marginTop: 6 }}>
            {invoice.status === 'Paid' || invoice.stage === 'cleared' ? (
              <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 800 }}>
                ✓ PAID IN FULL
              </span>
            ) : (
              <span style={{ background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 800 }}>
                ⏳ PAYMENT PENDING
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
            Place of Service: <strong>{invoice.placeOfService || 'Bangalore'}</strong>
          </div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0' }}>
        <thead>
          <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left', fontSize: 12, color: '#475569' }}>
            <th style={{ padding: '12px 14px', fontWeight: 800 }}>ITEM / PROCESS</th>
            <th style={{ padding: '12px 14px', fontWeight: 800 }}>CANDIDATE / DETAILS</th>
            <th style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'right' }}>RATE</th>
            <th style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'right' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
              <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1E293B' }}>
                {it.processLob || it.designation || 'Service Milestone'}
              </td>
              <td style={{ padding: '12px 14px', color: '#64748B' }}>
                {it.employeeName ? `${it.employeeName} (${it.empId || 'Candidate'})` : (it.status || 'Active')}
              </td>
              <td style={{ padding: '12px 14px', textAlign: 'right', color: '#475569' }}>
                ₹{Number(it.ratePerSeat || it.amount || 0).toLocaleString('en-IN')}
              </td>
              <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                ₹{Number(it.amount || it.ratePerSeat || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <div style={{ width: 280, fontSize: 13, lineHeight: 1.8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
            <span>Subtotal (Basic)</span>
            <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{Number(basicAmt).toLocaleString('en-IN')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
            <span>CGST (9%)</span>
            <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{Number(cgstAmt).toLocaleString('en-IN')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
            <span>SGST (9%)</span>
            <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{Number(sgstAmt).toLocaleString('en-IN')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #E2E8F0', paddingTop: 8, marginTop: 4, fontSize: 16, fontWeight: 900, color: '#0F172A' }}>
            <span>Total Amount</span>
            <span style={{ color: 'var(--accent, #7C3AED)' }}>₹{Number(totalBill).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, padding: '14px 18px', background: '#F8FAFC', borderRadius: 12, fontSize: 12, color: '#475569' }}>
        <strong>Amount in words:</strong> {amountInWords}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 28, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 11.5, color: '#64748B' }}>
          <div><strong>Beneficiary:</strong> Career Experts Global Solutions</div>
          <div><strong>Bank:</strong> HDFC Bank · <strong>A/C:</strong> 50200080303100</div>
          <div><strong>IFSC:</strong> HDFC0000509</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <DigitalSignatureBadge
            name="MOHAMMED USMAN ZABI"
            date={invoice.invoiceDate || '19/09/2026'}
            customImage={invoice.signatureImage}
          />
          <div style={{ fontWeight: 800, fontSize: 11, color: '#475569', marginTop: 4 }}>
            Authorised Signatory
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinanceInvoicesView() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  // 5 Finance Tabs state: 'weekly_update', 'bill_raised', 'bill_cleared', 'total_abcd', 'payments_invoices'
  const [activeFinanceTab, setActiveFinanceTab] = useState('payments_invoices');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'weekly') setActiveFinanceTab('weekly_update');
      else if (tab === 'raised') setActiveFinanceTab('bill_raised');
      else if (tab === 'cleared') setActiveFinanceTab('bill_cleared');
      else if (tab === 'total') setActiveFinanceTab('total_abcd');
      else if (tab === 'invoices') setActiveFinanceTab('payments_invoices');
    }
  }, []);

  const handleTabChange = (newTab) => {
    setActiveFinanceTab(newTab);
    if (typeof window !== 'undefined') {
      const tabSlugMap = {
        weekly_update: 'weekly',
        bill_raised: 'raised',
        bill_cleared: 'cleared',
        total_abcd: 'total',
        payments_invoices: 'invoices',
      };
      const slug = tabSlugMap[newTab] || 'invoices';
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('tab', slug);
      window.history.pushState(null, '', newUrl.toString());
    }
  };

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  // Modals state
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showManageClientsModal, setShowManageClientsModal] = useState(false);
  const [showGenerateInvoiceModal, setShowGenerateInvoiceModal] = useState(false);
  const [showMonthFileModal, setShowMonthFileModal] = useState(false);
  const [monthFileSelection, setMonthFileSelection] = useState(new Date().toISOString().slice(0, 7));
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewTemplateMode, setPreviewTemplateMode] = useState('GST_INV_1');
  const [reminderInvoice, setReminderInvoice] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sendEmailInvoice, setSendEmailInvoice] = useState(null);
  const [emailForm, setEmailForm] = useState({
    recipients: '',
    cc: '',
    subject: '',
    message: '',
    sending: false,
    lastResponse: '',
  });
  const [smtpStatus, setSmtpStatus] = useState({ checked: false, configured: false, user: '' });
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    smtpUser: '',
    smtpPass: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    saving: false,
  });

  // New Client Form state
  const [clientForm, setClientForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    gstin: '',
    address: '',
    industry: 'Technology & Consulting',
    paymentTerms: 'Net 30',
    notes: '',
  });
  const [savingClient, setSavingClient] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState(null);

  // New Invoice Form state
  const [invoiceForm, setInvoiceForm] = useState({
    client: 'ISON XPERIENCES INDIA PRIVATE LIMITED',
    invoiceNo: '',
    projectMilestone: 'Candidate Placement & Seat Billing (7 Seats)',
    amount: '43660',
    basicAmount: 37000,
    sgstAmount: 3330,
    cgstAmount: 3330,
    dueDate: '30 days',
    status: 'Pending',
    notes: 'Official Form GST INV – 1 candidate placement and seat billing across 7 processes.',
    items: ISON_SAMPLE_ITEMS,
    templateType: 'GST_INV_1',
    amountInWords: 'Forty-Three thousand Six Hundred Sixty only.',
    signatureImage: DEFAULT_SIGNATURE_STAMP,
  });
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingEditInvoice, setSavingEditInvoice] = useState(false);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState(null);

  // Toast feedback helper
  const showToast = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3500);
  };

  // Helper: Versatile Digital Signature Stamp Upload Handler (supports event OR raw File/Blob)
  const handleSignatureUpload = (fileOrEvent, targetMode = 'all') => {
    let file = null;
    if (fileOrEvent?.target?.files) {
      file = fileOrEvent.target.files[0];
    } else if (fileOrEvent instanceof Blob || fileOrEvent instanceof File) {
      file = fileOrEvent;
    }
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast('Image size should be under 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target.result;

      const applyStamp = (finalDataUrl) => {
        if (previewInvoice) {
          setPreviewInvoice((prev) => (prev ? { ...prev, signatureImage: finalDataUrl } : prev));
          setInvoices((prev) =>
            prev.map((it) =>
              (it.id === previewInvoice.id || it._id === previewInvoice.id)
                ? { ...it, signatureImage: finalDataUrl }
                : it
            )
          );
          fetch('/api/client-invoices', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              action: 'edit_invoice',
              id: previewInvoice.id || previewInvoice._id,
              signatureImage: finalDataUrl,
            }),
          }).catch(() => {});
        }

        if (targetMode === 'editing' || targetMode === 'all' || targetMode === true) {
          setEditingInvoice((prev) => (prev ? { ...prev, signatureImage: finalDataUrl } : prev));
        }
        if (targetMode === 'form' || targetMode === 'all' || targetMode === false) {
          setInvoiceForm((prev) => ({ ...prev, signatureImage: finalDataUrl }));
        }

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('cegs_signature_stamp', finalDataUrl);
          } catch (err) {
            console.warn('localStorage signature save failed', err);
          }
        }
        showToast('✓ Digital signature stamp uploaded and applied!');
      };

      try {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width || 400;
            canvas.height = img.naturalHeight || img.height || 120;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const pngDataUrl = canvas.toDataURL('image/png');
            applyStamp(pngDataUrl);
          } catch {
            applyStamp(rawDataUrl);
          }
        };
        img.onerror = () => applyStamp(rawDataUrl);
        img.src = rawDataUrl;
      } catch {
        applyStamp(rawDataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Load Invoices & Clients from API
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Invoices
      const invRes = await fetch('/api/client-invoices', { headers: authHeaders() });
      if (invRes.ok) {
        const invData = await invRes.json();
        if (Array.isArray(invData) && invData.length > 0) {
          setInvoices(invData);
        } else {
          setInvoices(DEFAULT_INVOICES);
        }
      } else {
        setInvoices(DEFAULT_INVOICES);
      }

      // 2. Fetch Clients
      const clientRes = await fetch('/api/clients', { headers: authHeaders() });
      if (clientRes.ok) {
        const clientData = await clientRes.json();
        if (Array.isArray(clientData) && clientData.length > 0) {
          const map = new Map();
          clientData.forEach((c) => {
            const norm = normalizeClientName(c.name);
            const key = norm.toLowerCase();
            if (!key) return;
            if (!map.has(key)) {
              map.set(key, { ...c, name: norm });
            }
          });
          setClients(Array.from(map.values()));
        } else {
          setClients(DEFAULT_CLIENTS);
        }
      } else {
        setClients(DEFAULT_CLIENTS);
      }
    } catch {
      setInvoices(DEFAULT_INVOICES);
      setClients(DEFAULT_CLIENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load custom signature stamp from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cegs_signature_stamp');
      if (saved) {
        setInvoiceForm((prev) => ({ ...prev, signatureImage: saved }));
      }
    }
  }, []);

  // Available active client options for invoice creation & editing (strictly from active database clients)
  const availableClientOptions = useMemo(() => {
    const canonicalMap = new Map();
    clients.forEach((c) => {
      const canonical = normalizeClientName(c.name);
      if (!canonical) return;
      const key = canonical.toLowerCase();
      if (!canonicalMap.has(key)) {
        canonicalMap.set(key, canonical);
      }
    });
    return Array.from(canonicalMap.values()).sort((a, b) => a.localeCompare(b));
  }, [clients]);

  // Combined list of companies for invoices filter dropdown
  const companyOptions = useMemo(() => {
    const canonicalMap = new Map();
    const rawList = [
      ...clients.map((c) => c.name),
      ...invoices.map((i) => i.client),
    ].filter(Boolean);

    rawList.forEach((raw) => {
      const canonical = normalizeClientName(raw);
      if (!canonical) return;
      const key = canonical.toLowerCase();
      if (!canonicalMap.has(key)) {
        canonicalMap.set(key, canonical);
      }
    });

    return Array.from(canonicalMap.values()).sort((a, b) => a.localeCompare(b));
  }, [invoices, clients]);

  // Strictly deduplicated clients array for Manage Clients modal
  const dedupedClients = useMemo(() => {
    const map = new Map();
    clients.forEach((c) => {
      const norm = normalizeClientName(c.name);
      const key = norm.toLowerCase();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { ...c, name: norm });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  // Check SMTP connection status
  const checkSmtpStatus = async () => {
    try {
      const res = await fetch('/api/client-invoices/send-email', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSmtpStatus({ checked: true, configured: Boolean(data.configured), user: data.smtpUser || '' });
        if (data.smtpUser) {
          setSmtpForm((prev) => ({ ...prev, smtpUser: data.smtpUser }));
        }
      }
    } catch {
      setSmtpStatus({ checked: true, configured: false, user: '' });
    }
  };

  // Handler: Open Send Email modal with pre-filled multi-recipient form
  const handleOpenEmailModal = (inv) => {
    const clientNorm = normalizeClientName(inv.client);
    const clientRec = clients.find((c) => normalizeClientName(c.name).toLowerCase() === clientNorm.toLowerCase());
    const officialEmails = getClientDefaultEmails(inv.client);
    const defaultEmail = officialEmails || inv.clientEmail || clientRec?.email || '';
    const amtStr = inr(inv.amount || inv.basicAmount);

    setSendEmailInvoice(inv);
    setEmailForm({
      recipients: defaultEmail,
      cc: '',
      subject: `[INVOICE] ${inv.invoiceNo || 'INV'} - Career Experts Global Solutions - ${clientNorm}`,
      message: `Dear ${clientNorm} Accounts & Finance Team,\n\nPlease find the invoice details for candidate placement and process seat billing services delivered by Career Experts Global Solutions.\n\n• Invoice No: ${inv.invoiceNo || 'N/A'}\n• Amount Due: ${amtStr} (${inv.amountInWords || ''})\n• Due Date: ${inv.dueDate || '30 days'}\n\nBank Remittance Details:\n• Beneficiary: Career Experts Global Solutions\n• Bank: HDFC Bank\n• Account No: 50200080303100\n• IFSC Code: HDFC0000509\n\nKindly acknowledge receipt and confirm the payment disbursement schedule.\n\nWarm regards,\nFinance & Accounts Department\nCareer Experts Global Solutions`,
      sending: false,
      lastResponse: '',
    });
    checkSmtpStatus();
  };

  // Handler: Download official PDF invoice file directly with multi-tier fallback
  const handleDownloadInvoicePdf = async (inv) => {
    const rawTarget = inv || sendEmailInvoice || previewInvoice;
    if (!rawTarget) return;
    const stamp = (typeof window !== 'undefined' && localStorage.getItem('cegs_signature_stamp')) || undefined;
    const target = {
      ...rawTarget,
      signatureImage: rawTarget.signatureImage || stamp || DEFAULT_SIGNATURE_STAMP,
    };
    const safeInvNo = String(target.invoiceNo || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `INVOICE_${safeInvNo}.pdf`;

    try {
      showToast(`Generating ${fileName}...`);

      // Tier 1: POST payload directly to download endpoint
      let res = await fetch('/api/client-invoices/download-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      });

      // Tier 2: GET fallback by invoiceNo / id if POST failed
      if (!res.ok && (target.invoiceNo || target.id || target._id)) {
        const queryParams = new URLSearchParams({
          invoiceNo: target.invoiceNo || '',
          id: target.id || target._id || '',
          client: target.client || '',
          amount: String(target.amount || target.basicAmount || 0),
        });
        res = await fetch(`/api/client-invoices/download-pdf?${queryParams.toString()}`);
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast(`✓ Downloaded ${fileName}`);
    } catch (err) {
      console.warn('Direct PDF download route issue, switching to Print / Save as PDF:', err);
      // Tier 3: Instant client-side fallback - open preview modal & trigger browser print to PDF
      setPreviewInvoice(target);
      setPreviewTemplateMode(getClientTemplate(target.client, target.templateType));
      setTimeout(() => {
        try {
          window.print();
        } catch (printErr) {
          console.warn('Window.print failed:', printErr);
        }
      }, 400);
      showToast(`Opened ${target.invoiceNo || 'Invoice'}: select "Save as PDF" to save file.`);
    }
  };

  // Handler: Instant 1-Click Send via Gmail Web (Auto-downloads invoice PDF & opens prefilled Gmail)
  const handleOpenGmailWeb = () => {
    const parsedRecipients = cleanEmailList(emailForm.recipients);
    if (parsedRecipients.length === 0) {
      showToast('Please enter at least one recipient email address.');
      return;
    }

    // Auto-trigger PDF download so the user has the invoice file ready to attach in Gmail
    if (sendEmailInvoice) {
      handleDownloadInvoicePdf(sendEmailInvoice);
    }

    const to = parsedRecipients.join(',');
    const cc = cleanEmailList(emailForm.cc).join(',');
    const su = encodeURIComponent(emailForm.subject);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hrms-cegs.vercel.app';
    const safeInvNo = String(sendEmailInvoice?.invoiceNo || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
    const directDownloadUrl = `${origin}/api/client-invoices/download-pdf?invoiceNo=${encodeURIComponent(sendEmailInvoice?.invoiceNo || '')}`;

    const enrichedMessage = `${emailForm.message}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📎 ATTACHED OFFICIAL INVOICE:\n• Document: INVOICE_${safeInvNo}.pdf\n• Direct Download Link: ${directDownloadUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const body = encodeURIComponent(enrichedMessage);

    let gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${su}&body=${body}`;
    if (cc) gmailUrl += `&cc=${encodeURIComponent(cc)}`;

    window.open(gmailUrl, '_blank');
    showToast(`✓ Opened Gmail & downloaded INVOICE_${safeInvNo}.pdf! Simply drag the file into your email.`);
  };

  // Handler: Save & Test SMTP credentials directly to database
  const handleSaveSmtp = async (e) => {
    e?.preventDefault();
    if (!smtpForm.smtpUser || !smtpForm.smtpPass) {
      showToast('Please enter your email and App Password.');
      return;
    }
    setSmtpForm((prev) => ({ ...prev, saving: true }));

    try {
      const res = await fetch('/api/client-invoices/send-email', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'save_smtp',
          smtpUser: smtpForm.smtpUser,
          smtpPass: smtpForm.smtpPass,
          smtpHost: smtpForm.smtpHost || 'smtp.gmail.com',
          smtpPort: Number(smtpForm.smtpPort || 465),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || '✓ SMTP connected and verified successfully!');
        setSmtpStatus({ checked: true, configured: true, user: data.smtpUser });
        setShowSmtpConfig(false);
      } else {
        showToast(`SMTP Connection Failed: ${data.error || 'Check credentials'}`);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setSmtpForm((prev) => ({ ...prev, saving: false }));
    }
  };

  // Handler: Direct Email Sending API (With automatic PDF invoice attachment)
  const handleSendEmailDirectly = async () => {
    const parsedRecipients = cleanEmailList(emailForm.recipients);
    if (parsedRecipients.length === 0) {
      showToast('Please enter at least one valid recipient email address.');
      return;
    }
    setEmailForm((prev) => ({ ...prev, sending: true, lastResponse: '' }));

    try {
      const res = await fetch('/api/client-invoices/send-email', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          invoiceId: sendEmailInvoice.id || sendEmailInvoice._id,
          invoiceNo: sendEmailInvoice.invoiceNo,
          clientName: normalizeClientName(sendEmailInvoice.client),
          clientAddress: sendEmailInvoice.clientAddress || '',
          clientGstin: sendEmailInvoice.clientGstin || '',
          clientState: sendEmailInvoice.clientState || 'Karnataka',
          clientStateCode: sendEmailInvoice.clientStateCode || '29',
          poNo: sendEmailInvoice.poNo || '',
          totalAmount: Number(sendEmailInvoice.amount || sendEmailInvoice.basicAmount || 0),
          basicAmount: Number(sendEmailInvoice.basicAmount || 0),
          sgstAmount: Number(sendEmailInvoice.sgstAmount || 0),
          cgstAmount: Number(sendEmailInvoice.cgstAmount || 0),
          amountInWords: sendEmailInvoice.amountInWords || '',
          dueDate: sendEmailInvoice.dueDate || '30 days',
          invoiceDate: sendEmailInvoice.invoiceDate || '',
          items: sendEmailInvoice.items || [],
          recipients: parsedRecipients,
          cc: cleanEmailList(emailForm.cc),
          subject: emailForm.subject,
          message: emailForm.message,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const safeInvNo = String(sendEmailInvoice.invoiceNo || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
        showToast(`✓ Invoice sent directly with TAX_INVOICE_${safeInvNo}.pdf automatically attached!`);
        setInvoices((prev) =>
          prev.map((it) =>
            (it.id === sendEmailInvoice.id || it._id === sendEmailInvoice.id)
              ? { ...it, lastSentTo: parsedRecipients.join(', '), lastSentAt: data.sentAt || new Date().toISOString() }
              : it
          )
        );
        setSendEmailInvoice(null);
      } else {
        if (data.notConfigured) {
          setShowSmtpConfig(true);
        }
        showToast(data.error || 'Failed to send email. Check SMTP settings or click Send with Gmail.');
        setEmailForm((prev) => ({ ...prev, sending: false, lastResponse: data.error }));
      }
    } catch (err) {
      showToast(`Error sending email: ${err.message}`);
      setEmailForm((prev) => ({ ...prev, sending: false, lastResponse: err.message }));
    }
  };

  // Handler: Open native Mail app (mailto: with all recipient emails)
  const handleOpenMailto = () => {
    const parsedRecipients = cleanEmailList(emailForm.recipients);
    if (parsedRecipients.length === 0) {
      showToast('Please enter at least one recipient email address.');
      return;
    }
    const to = parsedRecipients.join(',');
    const cc = cleanEmailList(emailForm.cc).join(',');
    const sub = encodeURIComponent(emailForm.subject);
    const body = encodeURIComponent(emailForm.message);

    let link = `mailto:${to}?subject=${sub}&body=${body}`;
    if (cc) link += `&cc=${cc}`;
    window.open(link, '_blank');
    showToast(`✓ Opened email client with ${parsedRecipients.length} recipient(s)!`);
  };

  // Available billing months from invoices
  const monthOptions = useMemo(() => {
    const set = new Set();
    const curKey = new Date().toISOString().slice(0, 7);
    set.add(curKey);
    invoices.forEach((inv) => {
      const k = getInvoiceMonthKey(inv);
      if (k) set.add(k);
    });
    return Array.from(set).sort().reverse();
  }, [invoices]);

  // Statistics for selected month in Month-Wise File modal
  const selectedMonthStats = useMemo(() => {
    const monthInvs = invoices.filter((inv) => getInvoiceMonthKey(inv) === monthFileSelection);
    let totalBilled = 0;
    let totalPaid = 0;
    let totalPending = 0;

    monthInvs.forEach((inv) => {
      const amt = Number(inv.amount || inv.basicAmount || 0);
      totalBilled += amt;
      const isPaid = String(inv.status || '').toLowerCase() === 'paid' || inv.stage === 'cleared';
      if (isPaid) totalPaid += amt;
      else totalPending += amt;
    });

    return {
      count: monthInvs.length,
      totalBilled,
      totalPaid,
      totalPending,
      invoices: monthInvs,
    };
  }, [invoices, monthFileSelection]);

  // Compute Revenue and Pending metrics
  // Sections: 1. Revenue (All Time), 2. Revenue (This Month), 3. Pending Invoices (NO OVERDUE)
  const metrics = useMemo(() => {
    let revAllTime = 0;
    let revThisMonth = 0;
    let pendingAmt = 0;

    const curMonthKey = new Date().toISOString().slice(0, 7);

    invoices.forEach((inv) => {
      const amt = Number(inv.amount || inv.basicAmount || 0);
      const isPaid = String(inv.status || '').toLowerCase() === 'paid' || inv.stage === 'cleared';

      if (isPaid) {
        revAllTime += amt;
        const pDate = inv.paidDate || inv.invoiceDate || '';
        if (pDate.startsWith(curMonthKey) || inv.invoiceNo === 'INV-001' || pDate.toLowerCase().includes('may')) {
          revThisMonth += amt;
        }
      } else {
        pendingAmt += amt;
      }
    });

    return {
      revenueAllTime: revAllTime,
      revenueThisMonth: revThisMonth,
      pendingInvoices: pendingAmt,
    };
  }, [invoices]);

  // Filtered invoices for billing details table
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv.invoiceNo && !inv.projectMilestone) return false;

      // Company filter
      if (selectedCompany !== 'ALL') {
        const filterNorm = normalizeClientName(selectedCompany).toLowerCase();
        const clientNorm = normalizeClientName(inv.client).toLowerCase();
        if (filterNorm !== clientNorm) {
          return false;
        }
      }

      // Month filter
      if (selectedMonth !== 'ALL') {
        const invMonth = getInvoiceMonthKey(inv);
        if (invMonth !== selectedMonth) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        const isPaid = String(inv.status || '').toLowerCase() === 'paid' || inv.stage === 'cleared';
        if (selectedStatus === 'Paid' && !isPaid) return false;
        if (selectedStatus === 'Pending' && isPaid) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const clientNorm = normalizeClientName(inv.client).toLowerCase();
        const matchesClient = clientNorm.includes(q) || (inv.client || '').toLowerCase().includes(q);
        const matchesInvNo = (inv.invoiceNo || '').toLowerCase().includes(q);
        const matchesMilestone = (inv.projectMilestone || '').toLowerCase().includes(q);
        const matchesAmt = String(inv.amount || '').includes(q);
        if (!matchesClient && !matchesInvNo && !matchesMilestone && !matchesAmt) {
          return false;
        }
      }

      return true;
    });

    // Current month entries shown first, rest descending chronologically
    return sortItemsByCurrentMonthFirst(list, (inv) => inv.paidDate || inv.invoiceDate || inv.dueDate || inv.createdAt || '');
  }, [invoices, selectedCompany, selectedStatus, selectedMonth, searchQuery]);

  // Action: Mark Invoice as Paid
  const handleMarkPaid = async (inv) => {
    const invId = inv.id || inv._id;
    try {
      setInvoices((prev) =>
        prev.map((i) =>
          (i.id === invId || i._id === invId)
            ? { ...i, status: 'Paid', stage: 'cleared', paidDate: new Date().toISOString().slice(0, 10) }
            : i
        )
      );
      showToast(`Invoice ${inv.invoiceNo || ''} marked as Paid!`);

      await fetch('/api/client-invoices', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'mark_paid',
          id: invId,
        }),
      });
    } catch (err) {
      console.error('Failed to mark paid:', err);
    }
  };

  // Action: Open Edit Invoice Modal (With candidate placement rows & dispatch fields)
  // Action: Open Edit Invoice Modal (With candidate placement rows & dispatch fields)
  const handleOpenEdit = (inv) => {
    const tmpl = getClientTemplate(inv.client, inv.templateType);
    const cfg = CLIENT_CONFIGS[tmpl] || CLIENT_CONFIGS.GST_INV_1;
    let loadedItems = Array.isArray(inv.items) && inv.items.length > 0 ? inv.items : [];
    if (loadedItems.length === 0) {
      loadedItems = cfg.sampleItems || ISON_SAMPLE_ITEMS;
    }

    setEditingInvoice({
      id: inv.id || inv._id,
      invoiceNo: inv.invoiceNo || '',
      invoiceDate: inv.invoiceDate || new Date().toISOString().slice(0, 10),
      client: inv.client || cfg.name,
      projectMilestone: inv.projectMilestone || `${cfg.badge} Placement & Service Billing`,
      amount: inv.amount || inv.basicAmount || cfg.sampleTotal,
      basicAmount: inv.basicAmount || cfg.sampleBasic,
      sgstAmount: inv.sgstAmount !== undefined && inv.sgstAmount !== null ? inv.sgstAmount : cfg.sampleSgst,
      cgstAmount: inv.cgstAmount !== undefined && inv.cgstAmount !== null ? inv.cgstAmount : cfg.sampleCgst,
      items: loadedItems.map((it) => ({ ...it })),
      clientAddress: inv.clientAddress || cfg.defaultAddress || '',
      clientGstin: inv.clientGstin || cfg.defaultGstin || '',
      clientState: inv.clientState || 'Karnataka',
      clientStateCode: inv.clientStateCode || '29',
      templateType: tmpl,
      poNo: inv.poNo || '',
      modeOfTransport: inv.modeOfTransport || '',
      vehicleNo: inv.vehicleNo || '',
      dateTimeOfService: inv.dateTimeOfService || '',
      placeOfService: inv.placeOfService || 'Bangalore',
      dueDate: inv.dueDate || '30 days',
      status: inv.status || (inv.stage === 'cleared' ? 'Paid' : 'Pending'),
      notes: inv.notes || '',
      amountInWords: inv.amountInWords || cfg.words || '',
      signatureImage: inv.signatureImage || (typeof window !== 'undefined' && localStorage.getItem('cegs_signature_stamp')) || DEFAULT_SIGNATURE_STAMP,
    });
  };

  // Helper: Update a single candidate item in Editing Invoice
  const updateEditingInvoiceItem = (idx, field, val) => {
    if (!editingInvoice) return;
    const newItems = [...(editingInvoice.items || [])];
    const target = { ...newItems[idx], [field]: val };
    if (field === 'ratePerSeat') {
      const r = Number(val) || 0;
      target.amount = r;
    } else if (field === 'amount') {
      const a = Number(val) || 0;
      target.ratePerSeat = a;
    }
    newItems[idx] = target;

    const totalBasic = newItems.reduce((acc, it) => acc + (Number(it.amount) || Number(it.ratePerSeat) || 0), 0);
    const sgst = Math.round(totalBasic * 0.09);
    const cgst = Math.round(totalBasic * 0.09);
    const total = totalBasic + sgst + cgst;

    setEditingInvoice({
      ...editingInvoice,
      items: newItems,
      basicAmount: totalBasic,
      sgstAmount: sgst,
      cgstAmount: cgst,
      amount: total,
      amountInWords: numberToWordsINR(total),
    });
  };

  // Helper: Add a blank candidate row to Editing Invoice
  const addEditingInvoiceItem = () => {
    if (!editingInvoice) return;
    const tmplKey = getClientTemplate(editingInvoice.client, editingInvoice.templateType);
    const newItems = [
      ...(editingInvoice.items || []),
      {
        sno: String((editingInvoice.items || []).length + 1).padStart(2, '0'),
        empId: 'CEGS-' + String((editingInvoice.items || []).length + 1).padStart(2, '0'),
        employeeName: '',
        phone: '',
        designation: 'Business AssociateOperation.',
        status: 'Active',
        doj: new Date().toLocaleDateString('en-GB'),
        processLob: 'Process',
        ratePerSeat: 5000,
        sacCode: tmplKey.includes('ALTRUIST') ? 'BPO' : '99851',
        amount: 5000,
      },
    ];
    const totalBasic = newItems.reduce((acc, it) => acc + (Number(it.amount) || Number(it.ratePerSeat) || 0), 0);
    const sgst = Math.round(totalBasic * 0.09);
    const cgst = Math.round(totalBasic * 0.09);
    const total = totalBasic + sgst + cgst;

    setEditingInvoice({
      ...editingInvoice,
      items: newItems,
      basicAmount: totalBasic,
      sgstAmount: sgst,
      cgstAmount: cgst,
      amount: total,
      amountInWords: numberToWordsINR(total),
    });
  };

  // Helper: Remove a candidate row from Editing Invoice
  const removeEditingInvoiceItem = (idx) => {
    if (!editingInvoice) return;
    const newItems = (editingInvoice.items || []).filter((_, i) => i !== idx);
    const totalBasic = newItems.reduce((acc, it) => acc + (Number(it.amount) || Number(it.ratePerSeat) || 0), 0);
    const sgst = Math.round(totalBasic * 0.09);
    const cgst = Math.round(totalBasic * 0.09);
    const total = totalBasic + sgst + cgst;

    setEditingInvoice({
      ...editingInvoice,
      items: newItems,
      basicAmount: totalBasic,
      sgstAmount: sgst,
      cgstAmount: cgst,
      amount: total,
      amountInWords: numberToWordsINR(total),
    });
  };

  // Helper: Load Preset Rows for ANY Client into Editing or New Invoice
  const loadPresetToInvoice = (presetKey, isEditing = true) => {
    const cfg = CLIENT_CONFIGS[presetKey] || CLIENT_CONFIGS.GST_INV_1;
    const sampleRows = cfg.sampleItems.map((r) => ({ ...r }));
    const totalBasic = cfg.sampleBasic || sampleRows.reduce((s, r) => s + (Number(r.amount) || Number(r.ratePerSeat) || 0), 0);
    const sgst = cfg.sampleSgst || Math.round(totalBasic * 0.09);
    const cgst = cfg.sampleCgst || Math.round(totalBasic * 0.09);
    const total = cfg.sampleTotal || (totalBasic + sgst + cgst);
    const words = cfg.words || numberToWordsINR(total);

    if (isEditing) {
      if (!editingInvoice) return;
      setEditingInvoice({
        ...editingInvoice,
        templateType: presetKey,
        client: cfg.name,
        clientAddress: cfg.defaultAddress,
        clientGstin: cfg.defaultGstin,
        items: sampleRows,
        basicAmount: totalBasic,
        sgstAmount: sgst,
        cgstAmount: cgst,
        amount: total,
        amountInWords: words,
      });
      showToast(`Loaded ${sampleRows.length} sample rows for ${cfg.badge}!`);
    } else {
      setInvoiceForm({
        ...invoiceForm,
        templateType: presetKey,
        client: cfg.name,
        clientAddress: cfg.defaultAddress,
        clientGstin: cfg.defaultGstin,
        items: sampleRows,
        basicAmount: totalBasic,
        sgstAmount: sgst,
        cgstAmount: cgst,
        amount: String(total),
        amountInWords: words,
      });
      showToast(`Loaded ${sampleRows.length} sample rows for ${cfg.badge}!`);
    }
  };

  // Backward compatibility alias
  const loadIsonSampleToEditingInvoice = () => loadPresetToInvoice('GST_INV_1', true);

  // Helper: Update a single candidate seat item in New Invoice Form
  const updateInvoiceFormItem = (idx, field, val) => {
    const newItems = [...(invoiceForm.items || [])];
    const target = { ...newItems[idx], [field]: val };
    if (field === 'ratePerSeat') {
      const r = Number(val) || 0;
      target.amount = r;
    } else if (field === 'amount') {
      const a = Number(val) || 0;
      target.ratePerSeat = a;
    }
    newItems[idx] = target;

    const totalBasic = newItems.reduce((acc, it) => acc + (Number(it.amount) || Number(it.ratePerSeat) || 0), 0);
    const sgst = Math.round(totalBasic * 0.09);
    const cgst = Math.round(totalBasic * 0.09);
    const total = totalBasic + sgst + cgst;

    setInvoiceForm({
      ...invoiceForm,
      items: newItems,
      basicAmount: totalBasic,
      sgstAmount: sgst,
      cgstAmount: cgst,
      amount: String(total),
      amountInWords: numberToWordsINR(total),
    });
  };

  // Helper: Add a blank candidate row to New Invoice Form
  const addInvoiceFormItem = () => {
    const tmplKey = getClientTemplate(invoiceForm.client, invoiceForm.templateType);
    const newItems = [
      ...(invoiceForm.items || []),
      {
        sno: String((invoiceForm.items || []).length + 1).padStart(2, '0'),
        empId: 'CEGS-' + String((invoiceForm.items || []).length + 1).padStart(2, '0'),
        employeeName: '',
        phone: '',
        designation: 'Business AssociateOperation.',
        status: 'Active',
        doj: new Date().toLocaleDateString('en-GB'),
        processLob: 'Process',
        ratePerSeat: 5000,
        sacCode: tmplKey.includes('ALTRUIST') ? 'BPO' : '99851',
        amount: 5000,
      },
    ];
    const totalBasic = newItems.reduce((acc, it) => acc + (Number(it.amount) || Number(it.ratePerSeat) || 0), 0);
    const sgst = Math.round(totalBasic * 0.09);
    const cgst = Math.round(totalBasic * 0.09);
    const total = totalBasic + sgst + cgst;

    setInvoiceForm({
      ...invoiceForm,
      items: newItems,
      basicAmount: totalBasic,
      sgstAmount: sgst,
      cgstAmount: cgst,
      amount: String(total),
      amountInWords: numberToWordsINR(total),
    });
  };

  // Helper: Remove a candidate row from New Invoice Form
  const removeInvoiceFormItem = (idx) => {
    const newItems = (invoiceForm.items || []).filter((_, i) => i !== idx);
    const totalBasic = newItems.reduce((acc, it) => acc + (Number(it.amount) || Number(it.ratePerSeat) || 0), 0);
    const sgst = Math.round(totalBasic * 0.09);
    const cgst = Math.round(totalBasic * 0.09);
    const total = totalBasic + sgst + cgst;

    setInvoiceForm({
      ...invoiceForm,
      items: newItems,
      basicAmount: totalBasic,
      sgstAmount: sgst,
      cgstAmount: cgst,
      amount: String(total),
      amountInWords: numberToWordsINR(total),
    });
  };



  // Action: Save Edited Invoice
  const handleSaveEditInvoice = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setSavingEditInvoice(true);

    try {
      const amt = Number(editingInvoice.amount) || 0;
      const bAmt = editingInvoice.basicAmount ? Number(editingInvoice.basicAmount) : (amt ? Math.round(amt / 1.18) : amt);
      const sAmt = editingInvoice.sgstAmount ? Number(editingInvoice.sgstAmount) : (amt ? Math.round(bAmt * 0.09) : 0);
      const cAmt = editingInvoice.cgstAmount ? Number(editingInvoice.cgstAmount) : (amt ? Math.round(bAmt * 0.09) : 0);

      const payload = {
        action: 'edit_invoice',
        id: editingInvoice.id,
        invoiceNo: editingInvoice.invoiceNo || 'INV-001',
        invoiceDate: editingInvoice.invoiceDate || new Date().toISOString().slice(0, 10),
        poNo: editingInvoice.poNo || '',
        modeOfTransport: editingInvoice.modeOfTransport || '',
        vehicleNo: editingInvoice.vehicleNo || '',
        dateTimeOfService: editingInvoice.dateTimeOfService || '',
        placeOfService: editingInvoice.placeOfService || 'Bangalore',
        client: editingInvoice.client,
        projectMilestone: editingInvoice.projectMilestone,
        amount: amt,
        basicAmount: bAmt,
        sgstAmount: sAmt,
        cgstAmount: cAmt,
        items: editingInvoice.items || [],
        clientAddress: editingInvoice.clientAddress,
        clientGstin: editingInvoice.clientGstin,
        clientState: editingInvoice.clientState || 'Karnataka',
        clientStateCode: editingInvoice.clientStateCode || '29',
        templateType: editingInvoice.templateType || 'GST_INV_1',
        amountInWords: editingInvoice.amountInWords || numberToWordsINR(amt),
        dueDate: editingInvoice.dueDate || '30 days',
        status: editingInvoice.status,
        notes: editingInvoice.notes,
        signatureImage: editingInvoice.signatureImage || DEFAULT_SIGNATURE_STAMP,
      };

      // Optimistic update
      setInvoices((prev) =>
        prev.map((inv) =>
          (inv.id === editingInvoice.id || inv._id === editingInvoice.id)
            ? {
                ...inv,
                ...payload,
                stage: editingInvoice.status === 'Paid' ? 'cleared' : 'raised',
                paidDate: editingInvoice.status === 'Paid' ? (inv.paidDate || new Date().toISOString().slice(0, 10)) : '',
              }
            : inv
        )
      );

      // Also update previewInvoice if currently open
      if (previewInvoice && (previewInvoice.id === editingInvoice.id || previewInvoice._id === editingInvoice.id)) {
        setPreviewInvoice((prev) => ({ ...prev, ...payload }));
      }

      await fetch('/api/client-invoices', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      showToast(`Invoice ${editingInvoice.invoiceNo} saved & updated successfully!`);
      setEditingInvoice(null);
    } catch (err) {
      console.error('Failed to update invoice:', err);
    } finally {
      setSavingEditInvoice(false);
    }
  };

  // Action: Delete Client Company (User Requirement 1)
  const handleDeleteClient = async (clientItem) => {
    const cName = clientItem.name || clientItem;
    const cId = clientItem.id || clientItem._id;

    if (!window.confirm(`Are you sure you want to delete client company "${cName}"?`)) {
      return;
    }

    setDeletingClientId(cId || cName);

    try {
      // Optimistic update
      const normTarget = normalizeClientName(cName).toLowerCase();
      setClients((prev) => prev.filter((c) => normalizeClientName(c.name).toLowerCase() !== normTarget && c.id !== cId));
      if (normalizeClientName(selectedCompany).toLowerCase() === normTarget) {
        setSelectedCompany('ALL');
      }
      setInvoiceForm((prev) => {
        if (normalizeClientName(prev.client).toLowerCase() === normTarget) {
          return { ...prev, client: '' };
        }
        return prev;
      });
      setEditingInvoice((prev) => {
        if (prev && normalizeClientName(prev.client).toLowerCase() === normTarget) {
          return { ...prev, client: '' };
        }
        return prev;
      });

      const query = cId && cId !== 'undefined' ? `id=${encodeURIComponent(cId)}` : `name=${encodeURIComponent(cName)}`;
      await fetch(`/api/clients?${query}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      showToast(`Client "${cName}" deleted successfully.`);
    } catch (err) {
      console.error('Failed to delete client:', err);
    } finally {
      setDeletingClientId(null);
    }
  };

  // Action: Delete Invoice (User Requirement 1)
  const handleDeleteInvoice = async (inv) => {
    const invId = inv.id || inv._id;
    const invNo = inv.invoiceNo || 'this invoice';
    if (!window.confirm(`Are you sure you want to delete invoice ${invNo}? This action cannot be undone.`)) {
      return;
    }

    setDeletingInvoiceId(invId || invNo);
    try {
      // Optimistic removal from table
      setInvoices((prev) => prev.filter((i) => (i.id || i._id) !== invId && i.invoiceNo !== invNo));
      showToast(`Invoice ${invNo} deleted successfully.`);

      await fetch('/api/client-invoices', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'delete_invoice',
          id: invId,
          invoiceNo: inv.invoiceNo,
        }),
      });
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      showToast(`Failed to delete invoice ${invNo}.`, 'error');
    } finally {
      setDeletingInvoiceId(null);
    }
  };

  // Action: Export CSV
  const handleExportCSV = () => {
    const rowsToExport = filteredInvoices.map((inv) => ({
      'Invoice #': inv.invoiceNo || '—',
      'Client / Company': inv.client || '—',
      'Project / Milestone': inv.projectMilestone || 'Milestone Delivery',
      'Amount (INR)': inv.amount || inv.basicAmount || 0,
      'Due Date': inv.dueDate || '—',
      'Status': inv.status || (inv.stage === 'cleared' ? 'Paid' : 'Pending'),
      'Bill Raised Date': inv.invoiceDate || '—',
      'Paid Date': inv.paidDate || '—',
      'Notes': inv.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rowsToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments & Invoices');
    const monthTag = selectedMonth !== 'ALL' ? `_${formatMonthLabel(selectedMonth).replace(/\s+/g, '_')}` : '';
    XLSX.writeFile(workbook, `CEGS_Payments_Invoices${monthTag}_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Invoices CSV file exported successfully!');
  };

  // Action: Export Single Month File (Excel .xlsx or CSV)
  const handleExportMonthFile = (format = 'xlsx', targetMonth = monthFileSelection) => {
    const targetInvs = invoices.filter((inv) => getInvoiceMonthKey(inv) === targetMonth);
    const monthName = formatMonthLabel(targetMonth);

    const rows = targetInvs.map((inv) => ({
      'Invoice #': inv.invoiceNo || '—',
      'Client / Company': inv.client || '—',
      'Project / Milestone': inv.projectMilestone || 'Milestone Delivery',
      'Amount (INR)': inv.amount || inv.basicAmount || 0,
      'Bill Raised Date': inv.invoiceDate || '—',
      'Due Date / Term': inv.dueDate || '—',
      'Status': inv.status || (inv.stage === 'cleared' ? 'Paid' : 'Pending'),
      'Paid Date': inv.paidDate || '—',
      'Notes': inv.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{
      'Invoice #': 'No records for this month',
      'Client / Company': '—',
      'Project / Milestone': '—',
      'Amount (INR)': 0,
      'Bill Raised Date': '—',
      'Due Date / Term': '—',
      'Status': '—',
      'Paid Date': '—',
      'Notes': '',
    }]);

    const workbook = XLSX.utils.book_new();
    const cleanSheetName = monthName.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);

    const sanitizedMonth = monthName.replace(/\s+/g, '_');
    if (format === 'csv') {
      XLSX.writeFile(workbook, `CEGS_Billing_${sanitizedMonth}.csv`, { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, `CEGS_Billing_${sanitizedMonth}.xlsx`, { bookType: 'xlsx' });
    }
    showToast(`Downloaded ${monthName} file successfully!`);
  };

  // Action: Export Complete Multi-Month Workbook (Excel with separate sheet per month)
  const handleExportAllMonthsWorkbook = () => {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryRows = monthOptions.map((mKey) => {
      const mInvs = invoices.filter((inv) => getInvoiceMonthKey(inv) === mKey);
      let billed = 0;
      let paid = 0;
      let pending = 0;
      mInvs.forEach((inv) => {
        const amt = Number(inv.amount || inv.basicAmount || 0);
        billed += amt;
        const isPaid = String(inv.status || '').toLowerCase() === 'paid' || inv.stage === 'cleared';
        if (isPaid) paid += amt;
        else pending += amt;
      });
      return {
        'Billing Month': formatMonthLabel(mKey),
        'Total Invoices': mInvs.length,
        'Total Billed (INR)': billed,
        'Cleared Revenue (INR)': paid,
        'Pending Amount (INR)': pending,
      };
    });

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Monthly Summary');

    // Individual Month Sheets
    monthOptions.forEach((mKey) => {
      const mInvs = invoices.filter((inv) => getInvoiceMonthKey(inv) === mKey);
      const rows = mInvs.map((inv) => ({
        'Invoice #': inv.invoiceNo || '—',
        'Client / Company': inv.client || '—',
        'Project / Milestone': inv.projectMilestone || 'Milestone Delivery',
        'Amount (INR)': inv.amount || inv.basicAmount || 0,
        'Bill Raised Date': inv.invoiceDate || '—',
        'Due Date / Term': inv.dueDate || '—',
        'Status': inv.status || (inv.stage === 'cleared' ? 'Paid' : 'Pending'),
        'Paid Date': inv.paidDate || '—',
        'Notes': inv.notes || '',
      }));

      const sheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Message': 'No invoices recorded for this period' }]);
      const sheetName = formatMonthLabel(mKey).replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });

    XLSX.writeFile(workbook, `CEGS_All_Months_Billing_Report_${new Date().getFullYear()}.xlsx`, { bookType: 'xlsx' });
    showToast('Downloaded complete month-wise billing workbook!');
  };

  // Action: Save New Client Company
  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!clientForm.name.trim()) return;
    setSavingClient(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(clientForm),
      });

      const newClient = res.ok ? await res.json() : { ...clientForm, id: `local-${Date.now()}` };

      setClients((prev) => {
        const norm = normalizeClientName(newClient.name);
        const filtered = prev.filter((c) => normalizeClientName(c.name).toLowerCase() !== norm.toLowerCase());
        return [{ ...newClient, name: norm }, ...filtered];
      });
      setSelectedCompany(normalizeClientName(clientForm.name));
      setShowAddClientModal(false);
      showToast(`Client "${normalizeClientName(clientForm.name)}" added successfully!`);
      setClientForm({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        gstin: '',
        address: '',
        industry: 'Technology & Consulting',
        paymentTerms: 'Net 30',
        notes: '',
      });
    } catch {
      const local = { ...clientForm, id: `local-${Date.now()}` };
      setClients((prev) => {
        const norm = normalizeClientName(local.name);
        const filtered = prev.filter((c) => normalizeClientName(c.name).toLowerCase() !== norm.toLowerCase());
        return [{ ...local, name: norm }, ...filtered];
      });
      setSelectedCompany(normalizeClientName(clientForm.name));
      setShowAddClientModal(false);
    } finally {
      setSavingClient(false);
    }
  };

  // Action: Save New Invoice
  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceForm.client || !invoiceForm.amount) return;
    setSavingInvoice(true);

    try {
      let invNo = invoiceForm.invoiceNo.trim();
      if (!invNo) {
        invNo = `INV-${String(invoices.length + 1).padStart(3, '0')}`;
      }

      const tmpl = getClientTemplate(invoiceForm.client, invoiceForm.templateType);
      const cfg = CLIENT_CONFIGS[tmpl] || CLIENT_CONFIGS.GST_INV_1;

      const amt = Number(invoiceForm.amount) || cfg.sampleTotal || 0;
      const bAmt = invoiceForm.basicAmount ? Number(invoiceForm.basicAmount) : (cfg.sampleBasic || (amt ? Math.round(amt / 1.18) : amt));
      const sAmt = invoiceForm.sgstAmount ? Number(invoiceForm.sgstAmount) : (cfg.sampleSgst || Math.round(bAmt * 0.09));
      const cAmt = invoiceForm.cgstAmount ? Number(invoiceForm.cgstAmount) : (cfg.sampleCgst || Math.round(bAmt * 0.09));

      const payload = {
        action: 'create_invoice',
        client: invoiceForm.client,
        invoiceNo: invNo,
        projectMilestone: invoiceForm.projectMilestone || `${cfg.badge} Placement & Service Billing`,
        amount: amt,
        basicAmount: bAmt,
        sgstAmount: sAmt,
        cgstAmount: cAmt,
        dueDate: invoiceForm.dueDate || '30 days',
        status: invoiceForm.status,
        notes: invoiceForm.notes,
        invoiceDate: new Date().toISOString().slice(0, 10),
        items: invoiceForm.items && invoiceForm.items.length > 0 ? invoiceForm.items : cfg.sampleItems,
        templateType: tmpl,
        clientAddress: invoiceForm.clientAddress || cfg.defaultAddress || '',
        clientGstin: invoiceForm.clientGstin || cfg.defaultGstin || '',
        clientState: invoiceForm.clientState || 'Karnataka',
        clientStateCode: invoiceForm.clientStateCode || '29',
        poNo: invoiceForm.poNo || '',
        placeOfService: invoiceForm.placeOfService || 'Bangalore',
        amountInWords: invoiceForm.amountInWords || cfg.words || numberToWordsINR(amt),
        signatureImage: invoiceForm.signatureImage || (typeof window !== 'undefined' && localStorage.getItem('cegs_signature_stamp')) || DEFAULT_SIGNATURE_STAMP,
      };

      const res = await fetch('/api/client-invoices', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const created = res.ok
        ? await res.json()
        : { ...payload, id: `inv-${Date.now()}`, _id: `inv-${Date.now()}` };

      setInvoices((prev) => [created, ...prev]);
      setShowGenerateInvoiceModal(false);
      showToast(`Invoice ${invNo} generated successfully!`);
      setInvoiceForm({
        client: 'ISON XPERIENCES INDIA PRIVATE LIMITED',
        invoiceNo: '',
        projectMilestone: 'Candidate Placement & Seat Billing (7 Seats)',
        amount: '43660',
        basicAmount: 37000,
        sgstAmount: 3330,
        cgstAmount: 3330,
        dueDate: '30 days',
        status: 'Pending',
        notes: 'Official Form GST INV – 1 candidate placement and seat billing across 7 processes.',
        items: ISON_SAMPLE_ITEMS,
        templateType: 'GST_INV_1',
        amountInWords: 'Forty-Three thousand Six Hundred Sixty only.',
        signatureImage: (typeof window !== 'undefined' && localStorage.getItem('cegs_signature_stamp')) || DEFAULT_SIGNATURE_STAMP,
      });
    } catch {
      alert('Invoice created locally');
    } finally {
      setSavingInvoice(false);
    }
  };

  return (
    <div className="feature-page finance-invoices-page" style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* FLOATING FEEDBACK TOAST */}
      {feedback && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 14,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            zIndex: 10000,
            fontSize: 13.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <span style={{ color: '#10B981' }}>✓</span>
          <span>{feedback}</span>
        </div>
      )}

      {/* TOP HEADER SECTION */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-main, #0F172A)',
              margin: 0,
            }}
          >
            Payments & Invoices
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-muted, #64748B)' }}>
            Real-time client revenue, milestone billing details, tied-up companies, and invoice tracking
          </p>
        </div>

        {/* TOP ACTION BUTTONS (VISIBLE IN PAYMENTS & INVOICES TAB) */}
        {activeFinanceTab === 'payments_invoices' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* EXPORT CSV BUTTON */}
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 14,
              border: '1.5px solid var(--border, #E2E8F0)',
              background: 'var(--bg-surface, #FFFFFF)',
              color: 'var(--text-main, #1E293B)',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease',
            }}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          {/* MONTH-WISE FILE BUTTON */}
          <button
            type="button"
            onClick={() => {
              setMonthFileSelection(selectedMonth !== 'ALL' ? selectedMonth : (monthOptions[0] || new Date().toISOString().slice(0, 7)));
              setShowMonthFileModal(true);
            }}
            title="Download month-wise statement file or multi-tab Excel workbook"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 14,
              border: '1.5px solid #C7D2FE',
              background: '#EEF2FF',
              color: '#4338CA',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(67, 56, 202, 0.08)',
              transition: 'all 0.15s ease',
            }}
          >
            <Calendar size={16} color="#4338CA" />
            <span>Month-Wise File</span>
          </button>

          {/* + ADD CLIENT BUTTON */}
          <button
            type="button"
            onClick={() => setShowAddClientModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 14,
              border: '1.5px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={16} />
            <span>+ Add Client</span>
          </button>

          {/* MANAGE & DELETE CLIENTS BUTTON (USER REQUIREMENT 1) */}
          <button
            type="button"
            onClick={() => setShowManageClientsModal(true)}
            title="View, manage and delete tied-up client companies"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 14,
              border: '1.5px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#475569',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={16} />
            <span>Manage Clients ({clients.length})</span>
          </button>

          {/* GENERATE INVOICE BUTTON */}
          <button
            type="button"
            onClick={() => {
              setInvoiceForm((prev) => ({
                ...prev,
                invoiceNo: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
              }));
              setShowGenerateInvoiceModal(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 22px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 13.5,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Generate Invoice</span>
          </button>
        </div>
        )}
      </div>

      {/* CANDIDATE JOURNEY PIPELINE STEPPER (4 CONNECTED STAGES) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
          borderRadius: 16,
          padding: '12px 18px',
          border: '1px solid #E2E8F0',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              background: '#0F172A',
              color: '#FFFFFF',
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Candidate Flow
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>
            4-Stage Pipeline Journey:
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'weekly_update', step: '1', title: 'Weekly Update', color: '#0D9488' },
            { key: 'bill_raised', step: '2', title: 'Bill Raised', color: '#D97706' },
            { key: 'bill_cleared', step: '3', title: 'Bill Cleared', color: '#10B981' },
            { key: 'payments_invoices', step: '4', title: 'Payments & Invoices', color: '#2563EB' },
          ].map((item, idx) => {
            const isActive = activeFinanceTab === item.key;
            return (
              <React.Fragment key={item.key}>
                {idx > 0 && <span style={{ color: '#94A3B8', fontSize: 12, fontWeight: 800 }}>→</span>}
                <button
                  type="button"
                  onClick={() => handleTabChange(item.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: 10,
                    border: isActive ? `1.5px solid ${item.color}` : '1px solid #CBD5E1',
                    background: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 99,
                      background: isActive ? item.color : '#64748B',
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.step}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: isActive ? 800 : 600, color: isActive ? '#0F172A' : '#475569' }}>
                    {item.title}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 5 FINANCE MODULE TABS */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        {/* TAB 1: Weekly Update (Stage 1) */}
        <button
          type="button"
          onClick={() => handleTabChange('weekly_update')}
          style={{
            background: activeFinanceTab === 'weekly_update' ? '#0D9488' : '#FFFFFF',
            color: activeFinanceTab === 'weekly_update' ? '#FFFFFF' : '#374151',
            border: activeFinanceTab === 'weekly_update' ? '1px solid #0F766E' : '1px solid #E5E7EB',
            borderRadius: 99,
            padding: '9px 18px',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow:
              activeFinanceTab === 'weekly_update'
                ? '0 4px 12px rgba(13, 148, 136, 0.25)'
                : '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease',
          }}
        >
          Weekly Update (A) (147)
        </button>

        {/* TAB 2: Bill Raised (Stage 2) */}
        <button
          type="button"
          onClick={() => handleTabChange('bill_raised')}
          style={{
            background: activeFinanceTab === 'bill_raised' ? '#D97706' : '#FFFFFF',
            color: activeFinanceTab === 'bill_raised' ? '#FFFFFF' : '#374151',
            border: activeFinanceTab === 'bill_raised' ? '1px solid #B45309' : '1px solid #E5E7EB',
            borderRadius: 99,
            padding: '9px 18px',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow:
              activeFinanceTab === 'bill_raised'
                ? '0 4px 12px rgba(217, 119, 6, 0.25)'
                : '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease',
          }}
        >
          Bill Raised (B) (8)
        </button>

        {/* TAB 3: Bill Cleared (Stage 3) */}
        <button
          type="button"
          onClick={() => handleTabChange('bill_cleared')}
          style={{
            background: activeFinanceTab === 'bill_cleared' ? '#10B981' : '#FFFFFF',
            color: activeFinanceTab === 'bill_cleared' ? '#FFFFFF' : '#374151',
            border: activeFinanceTab === 'bill_cleared' ? '1px solid #059669' : '1px solid #E5E7EB',
            borderRadius: 99,
            padding: '9px 18px',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow:
              activeFinanceTab === 'bill_cleared'
                ? '0 4px 12px rgba(16, 185, 129, 0.25)'
                : '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease',
          }}
        >
          Bill Cleared (95)
        </button>

        {/* TAB 4: Payments & Invoices (Stage 4) */}
        <button
          type="button"
          onClick={() => handleTabChange('payments_invoices')}
          style={{
            background: activeFinanceTab === 'payments_invoices' ? '#2563EB' : '#FFFFFF',
            color: activeFinanceTab === 'payments_invoices' ? '#FFFFFF' : '#374151',
            border: activeFinanceTab === 'payments_invoices' ? '1px solid #1D4ED8' : '1px solid #E5E7EB',
            borderRadius: 99,
            padding: '9px 18px',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow:
              activeFinanceTab === 'payments_invoices'
                ? '0 4px 12px rgba(37, 99, 235, 0.25)'
                : '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease',
          }}
        >
          Payments &amp; Invoices ({invoices.length})
        </button>

        {/* TAB 5: Total (A+B+C+D) - ON HOLD */}
        <button
          type="button"
          onClick={() => handleTabChange('total_abcd')}
          style={{
            background: activeFinanceTab === 'total_abcd' ? '#7C3AED' : '#F8FAFC',
            color: activeFinanceTab === 'total_abcd' ? '#FFFFFF' : '#64748B',
            border: activeFinanceTab === 'total_abcd' ? '1px solid #6D28D9' : '1px dashed #CBD5E1',
            borderRadius: 99,
            padding: '9px 18px',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow:
              activeFinanceTab === 'total_abcd'
                ? '0 4px 12px rgba(124, 58, 237, 0.25)'
                : 'none',
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>Total (A+B+C+D)</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 6,
              background: activeFinanceTab === 'total_abcd' ? 'rgba(255,255,255,0.25)' : '#FEF3C7',
              color: activeFinanceTab === 'total_abcd' ? '#FFFFFF' : '#B45309',
              letterSpacing: '0.03em',
            }}
          >
            HOLD
          </span>
        </button>
      </div>

      {/* SECTION 1: WEEKLY UPDATE (STAGE 1) */}
      {activeFinanceTab === 'weekly_update' && (
        <WeeklyUpdateSection
          onNavigateToRaised={() => handleTabChange('bill_raised')}
          onMoveCandidatesToRaised={() => handleTabChange('bill_raised')}
        />
      )}

      {/* SECTION 2: BILL RAISED (STAGE 2) */}
      {activeFinanceTab === 'bill_raised' && (
        <BillRaisedSection
          onInvoiceCleared={() => handleTabChange('bill_cleared')}
          onNavigateToCleared={() => handleTabChange('bill_cleared')}
        />
      )}

      {/* SECTION 3: BILL CLEARED (STAGE 3) */}
      {activeFinanceTab === 'bill_cleared' && (
        <BillClearedSection onNavigateToPayments={() => handleTabChange('payments_invoices')} />
      )}

      {/* SECTION 4: TOTAL (A+B+C+D) - PAGE ON HOLD WITH BLUR */}
      {activeFinanceTab === 'total_abcd' && (
        <div style={{ position: 'relative', minHeight: 480, overflow: 'hidden', borderRadius: 20 }}>
          {/* Blurred background view */}
          <div style={{ filter: 'blur(8px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.45 }}>
            <TotalConsolidatedSection
              onDrillDownTab={(target) => {
                if (target === 'weekly') handleTabChange('weekly_update');
                else if (target === 'raised') handleTabChange('bill_raised');
                else if (target === 'cleared') handleTabChange('bill_cleared');
                else if (target === 'invoices') handleTabChange('payments_invoices');
              }}
            />
          </div>

          {/* Centered On-Hold Banner Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(248, 250, 252, 0.72)',
              backdropFilter: 'blur(4px)',
              zIndex: 25,
              padding: 24,
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 22,
                padding: '36px 40px',
                maxWidth: 520,
                textAlign: 'center',
                boxShadow: '0 20px 45px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
                border: '1.5px solid #E2E8F0',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 14px',
                  borderRadius: 99,
                  background: '#FEF3C7',
                  color: '#B45309',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: 14,
                }}
              >
                <Lock size={13} />
                <span>Page On Hold</span>
              </div>
              <h3
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: '0 0 10px',
                  fontFamily: "'Outfit', 'Inter', sans-serif",
                }}
              >
                Total (A+B+C+D) Temporarily On Hold
              </h3>
              <p
                style={{
                  fontSize: 13.5,
                  color: '#64748B',
                  lineHeight: 1.6,
                  margin: '0 0 24px',
                }}
              >
                This consolidated reconciliation ledger is placed on standby while operational flow is prioritized across the 4 active sequential stages:
                <br />
                <strong>Weekly Update → Bill Raised → Bill Cleared → Payments & Invoices</strong>.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleTabChange('weekly_update')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 12,
                    background: '#0D9488',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 13,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                  }}
                >
                  Go to Weekly Update (Stage 1)
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('payments_invoices')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 12,
                    background: '#EFF6FF',
                    color: '#1D4ED8',
                    fontWeight: 700,
                    fontSize: 13,
                    border: '1px solid #BFDBFE',
                    cursor: 'pointer',
                  }}
                >
                  Payments & Invoices (Stage 4)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: PAYMENTS & INVOICES (EXISTING DASHBOARD) */}
      {activeFinanceTab === 'payments_invoices' && (
        <>
          {/* METRIC STAT CARDS (EXACTLY 3 SECTIONS: 1. Revenue All Time, 2. Revenue This Month, 3. Pending Invoices - NO OVERDUE SECTION) */}
          <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 18,
          marginBottom: 28,
        }}
      >
        {/* CARD 1: Revenue (All Time) */}
        <div
          style={{
            background: 'var(--bg-surface, #FFFFFF)',
            borderRadius: 22,
            padding: '24px 26px',
            border: '1px solid var(--border, #E2E8F0)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>
            Revenue (All Time)
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#10B981',
              marginTop: 10,
              fontFamily: "'Outfit', 'Inter', sans-serif",
            }}
          >
            {inr(metrics.revenueAllTime)}
          </div>
          <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 6 }}>
            Total cleared client billings
          </div>
        </div>

        {/* CARD 2: Revenue (This Month) */}
        <div
          style={{
            background: 'var(--bg-surface, #FFFFFF)',
            borderRadius: 22,
            padding: '24px 26px',
            border: '1px solid var(--border, #E2E8F0)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>
            Revenue (This Month)
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-main, #0F172A)',
              marginTop: 10,
              fontFamily: "'Outfit', 'Inter', sans-serif",
            }}
          >
            {inr(metrics.revenueThisMonth)}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 6 }}>
            Collected in current billing cycle
          </div>
        </div>

        {/* CARD 3: Pending Invoices */}
        <div
          style={{
            background: 'var(--bg-surface, #FFFFFF)',
            borderRadius: 22,
            padding: '24px 26px',
            border: '1px solid var(--border, #E2E8F0)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>
            Pending Invoices
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#F59E0B',
              marginTop: 10,
              fontFamily: "'Outfit', 'Inter', sans-serif",
            }}
          >
            {inr(metrics.pendingInvoices)}
          </div>
          <div style={{ fontSize: 12, color: '#D97706', fontWeight: 600, marginTop: 6 }}>
            Awaiting client approval / payment
          </div>
        </div>
      </div>

      {/* SEARCH AND COMPANY FILTER BAR (ABOVE BILLING DETAILS SECTION) */}
      <div
        style={{
          background: 'var(--bg-surface, #FFFFFF)',
          borderRadius: 20,
          padding: '16px 20px',
          border: '1px solid var(--border, #E2E8F0)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        {/* SEARCH INPUT */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#F8FAFC',
            border: '1.5px solid #E2E8F0',
            borderRadius: 14,
            padding: '8px 16px',
            flex: '1 1 320px',
          }}
        >
          <Search size={18} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search company, client, invoice #, or milestone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 13.5,
              color: '#0F172A',
              fontWeight: 500,
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* COMPANY & STATUS DROPDOWNS & DELETE CLIENT OPTION */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* COMPANY FILTER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B' }}>Company:</span>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                border: '1.5px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#1E293B',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ALL">All Companies ({companyOptions.length})</option>
              {companyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* QUICK DELETE CLIENT BUTTON WHEN COMPANY SELECTED (USER REQUIREMENT 1) */}
          {selectedCompany !== 'ALL' && (
            <button
              type="button"
              onClick={() => handleDeleteClient({ name: selectedCompany })}
              title={`Delete client company "${selectedCompany}"`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                borderRadius: 10,
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 800,
                color: '#DC2626',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Trash2 size={13} />
              <span>Delete {selectedCompany}</span>
            </button>
          )}

          {/* MONTH FILTER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B' }}>Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                border: '1.5px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#1E293B',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ALL">All Months</option>
              {monthOptions.map((mKey) => (
                <option key={mKey} value={mKey}>
                  {formatMonthLabel(mKey)}
                </option>
              ))}
            </select>
          </div>

          {/* STATUS FILTER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B' }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                border: '1.5px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#1E293B',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          {(selectedCompany !== 'ALL' || selectedStatus !== 'ALL' || selectedMonth !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCompany('ALL');
                setSelectedStatus('ALL');
                setSelectedMonth('ALL');
                setSearchQuery('');
              }}
              style={{
                background: '#F1F5F9',
                border: 'none',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* BILLING DETAILS TABLE SECTION */}
      <div
        style={{
          background: 'var(--bg-surface, #FFFFFF)',
          borderRadius: 22,
          border: '1px solid var(--border, #E2E8F0)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden',
          marginBottom: 32,
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-raised, #FAFCFF)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main, #0F172A)' }}>
              Billing Details
            </span>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                background: '#F1F5F9',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: 99,
              }}
            >
              {filteredInvoices.length} {filteredInvoices.length === 1 ? 'Invoice' : 'Invoices'}
            </span>
          </div>

          {selectedCompany !== 'ALL' && (
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent, #7C3AED)' }}>
              Filtered for <strong>{selectedCompany}</strong>
            </span>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontFamily: "'Outfit', 'Inter', sans-serif",
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border, #E2E8F0)', background: '#F8FAFC' }}>
                <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>
                  INVOICE #
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>
                  CLIENT
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>
                  PROJECT / MILESTONE
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>
                  AMOUNT
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>
                  DUE
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>
                  STATUS
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11.5, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em', textAlign: 'right' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: '#94A3B8' }}>
                    <FileText size={40} style={{ opacity: 0.35, margin: '0 auto 10px' }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#64748B' }}>No invoices found</div>
                    <div style={{ fontSize: 12.5, marginTop: 4 }}>Try clearing search filters or create a new invoice.</div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isPaid = String(inv.status || '').toLowerCase() === 'paid' || inv.stage === 'cleared';
                  const invAmt = Number(inv.amount || inv.basicAmount || 0);

                  return (
                    <tr
                      key={inv.id || inv._id || inv.invoiceNo}
                      style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.12s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* INVOICE # */}
                      <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: 'JetBrains Mono, monospace' }}>
                        {inv.invoiceNo || 'INV-000'}
                      </td>

                      {/* CLIENT */}
                      <td style={{ padding: '16px 20px', fontSize: 13.5, fontWeight: 700, color: '#1E293B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 10,
                              background: 'rgba(124, 58, 237, 0.08)',
                              color: 'var(--accent, #7C3AED)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: 13,
                            }}
                          >
                            {(normalizeClientName(inv.client) || 'C')[0]}
                          </div>
                          <span>{normalizeClientName(inv.client || 'Apex Corp')}</span>
                        </div>
                      </td>

                      {/* PROJECT / MILESTONE */}
                      <td style={{ padding: '16px 20px', fontSize: 13, color: '#475569', fontWeight: 500 }}>
                        {inv.projectMilestone || 'Project Deliverable'}
                      </td>

                      {/* AMOUNT */}
                      <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                        {inr(invAmt)}
                      </td>

                      {/* DUE */}
                      <td style={{ padding: '16px 20px', fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                        {inv.dueDate || '10 May'}
                      </td>

                      {/* STATUS */}
                      <td style={{ padding: '16px 20px' }}>
                        {isPaid ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '4px 12px',
                              borderRadius: 99,
                              background: '#ECFDF5',
                              color: '#059669',
                              border: '1px solid #A7F3D0',
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                            Paid
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '4px 12px',
                              borderRadius: 99,
                              background: '#FEF3C7',
                              color: '#D97706',
                              border: '1px solid #FDE68A',
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* ACTIONS: EDIT INVOICE (USER REQUIREMENT 2) + REMINDER + MARK PAID + DOWNLOAD */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end' }}>
                          {/* SEND EMAIL BUTTON (MULTIPLE RECIPIENTS FORM) */}
                          <button
                            type="button"
                            title="Send invoice directly to multiple recipient email IDs"
                            onClick={() => handleOpenEmailModal(inv)}
                            style={{
                              padding: '6px 11px',
                              borderRadius: 8,
                              border: '1.5px solid #0284C7',
                              background: '#F0F9FF',
                              color: '#0284C7',
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#0284C7';
                              e.currentTarget.style.color = '#FFFFFF';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#F0F9FF';
                              e.currentTarget.style.color = '#0284C7';
                            }}
                          >
                            <Mail size={13} />
                            <span>Email</span>
                          </button>

                          {/* EDIT INVOICE BUTTON (USER REQUIREMENT 2) */}
                          <button
                            type="button"
                            title="Edit invoice content (milestone, amount, scope)"
                            onClick={() => handleOpenEdit(inv)}
                            style={{
                              padding: '6px 11px',
                              borderRadius: 8,
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#334155',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--accent, #7C3AED)';
                              e.currentTarget.style.color = 'var(--accent, #7C3AED)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#CBD5E1';
                              e.currentTarget.style.color = '#334155';
                            }}
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>

                          {!isPaid && (
                            <>
                              {/* REMINDER BELL */}
                              <button
                                type="button"
                                title="Send payment reminder"
                                onClick={() => {
                                  setReminderInvoice(inv);
                                  setCopiedLink(false);
                                }}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  border: '1px solid #E2E8F0',
                                  background: '#FFFFFF',
                                  color: '#64748B',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Bell size={14} />
                              </button>

                              {/* MARK PAID */}
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(inv)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  border: '1.5px solid #10B981',
                                  background: '#FFFFFF',
                                  color: '#10B981',
                                  fontSize: 12,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                              >
                                Mark Paid
                              </button>
                            </>
                          )}

                          {/* DIRECT DOWNLOAD PDF */}
                          <button
                            type="button"
                            title="Download PDF Invoice"
                            onClick={() => handleDownloadInvoicePdf(inv)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: '1.5px solid #BAE6FD',
                              background: '#F0F9FF',
                              color: '#0284C7',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#0284C7';
                              e.currentTarget.style.color = '#FFFFFF';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#F0F9FF';
                              e.currentTarget.style.color = '#0284C7';
                            }}
                          >
                            <Download size={14} />
                          </button>

                          {/* VIEW INVOICE TEMPLATE */}
                          <button
                            type="button"
                            title="View Invoice Template"
                            onClick={() => {
                              setPreviewInvoice(inv);
                              setPreviewTemplateMode(getClientTemplate(inv.client, inv.templateType));
                            }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: '1px solid #E2E8F0',
                              background: '#FFFFFF',
                              color: '#64748B',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#94A3B8';
                              e.currentTarget.style.color = '#1E293B';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#E2E8F0';
                              e.currentTarget.style.color = '#64748B';
                            }}
                          >
                            <Eye size={14} />
                          </button>

                          {/* DELETE INVOICE */}
                          <button
                            type="button"
                            title="Delete Invoice"
                            disabled={deletingInvoiceId === (inv.id || inv._id || inv.invoiceNo)}
                            onClick={() => handleDeleteInvoice(inv)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: '1.5px solid #FEE2E2',
                              background: '#FEF2F2',
                              color: '#EF4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                              opacity: deletingInvoiceId === (inv.id || inv._id || inv.invoiceNo) ? 0.5 : 1,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#EF4444';
                              e.currentTarget.style.color = '#FFFFFF';
                              e.currentTarget.style.borderColor = '#DC2626';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#FEF2F2';
                              e.currentTarget.style.color = '#EF4444';
                              e.currentTarget.style.borderColor = '#FEE2E2';
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD CLIENT COMPANY MODAL */}
      {/* ========================================================================= */}
      {showAddClientModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowAddClientModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 24,
              width: '100%',
              maxWidth: 540,
              padding: '28px 32px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.22)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                  Add Tied-Up Client Company
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
                  Register partner enterprise company for invoice generation and billing
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddClientModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Corp, Google India, Infosys"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #CBD5E1', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Vance"
                    value={clientForm.contactPerson}
                    onChange={(e) => setClientForm({ ...clientForm, contactPerson: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #CBD5E1', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Billing Email
                  </label>
                  <input
                    type="email"
                    placeholder="billing@company.com"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #CBD5E1', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #CBD5E1', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    placeholder="29ABCDE1234F1Z5"
                    value={clientForm.gstin}
                    onChange={(e) => setClientForm({ ...clientForm, gstin: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #CBD5E1', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingClient}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'var(--accent, #7C3AED)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {savingClient ? 'Saving…' : 'Save Client Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MANAGE & DELETE CLIENTS MODAL (USER REQUIREMENT 1) */}
      {/* ========================================================================= */}
      {showManageClientsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowManageClientsModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 24,
              width: '100%',
              maxWidth: 640,
              padding: '28px 32px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.22)',
              border: '1px solid #E2E8F0',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #F1F5F9', paddingBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                  Manage & Delete Client Companies
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
                  View tied-up enterprise clients and remove companies
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageClientsModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
              {dedupedClients.length === 0 ? (
                <div style={{ padding: '36px 0', textAlign: 'center', color: '#94A3B8' }}>
                  No clients found. Click "+ Add Client" to add a company.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dedupedClients.map((c) => {
                    const normName = normalizeClientName(c.name);
                    const cInvoices = invoices.filter((i) => normalizeClientName(i.client).toLowerCase() === normName.toLowerCase());
                    const isDeleting = deletingClientId === (c.id || c.name);

                    return (
                      <div
                        key={c.id || normName}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 18px',
                          borderRadius: 14,
                          border: '1px solid #E2E8F0',
                          background: '#F8FAFC',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 12,
                              background: 'rgba(124, 58, 237, 0.1)',
                              color: 'var(--accent, #7C3AED)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: 15,
                            }}
                          >
                            {(normName || 'C')[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>
                              {normName}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                              {c.industry || 'Technology'} · {c.email || 'No email'} · {cInvoices.length} invoice{cInvoices.length === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>

                        {/* DELETE CLIENT BUTTON (USER REQUIREMENT 1) */}
                        <button
                          type="button"
                          onClick={() => handleDeleteClient(c)}
                          disabled={isDeleting}
                          title={`Delete ${c.name}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            borderRadius: 10,
                            border: '1px solid #FCA5A5',
                            background: '#FFFFFF',
                            color: '#DC2626',
                            fontSize: 12.5,
                            fontWeight: 800,
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            opacity: isDeleting ? 0.6 : 1,
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#DC2626';
                            e.currentTarget.style.color = '#FFFFFF';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#FFFFFF';
                            e.currentTarget.style.color = '#DC2626';
                          }}
                        >
                          <Trash2 size={14} />
                          <span>{isDeleting ? 'Deleting…' : 'Delete Client'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setShowManageClientsModal(false);
                  setShowAddClientModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 16px',
                  borderRadius: 10,
                  border: '1.5px solid var(--accent, #7C3AED)',
                  background: '#FFFFFF',
                  color: 'var(--accent, #7C3AED)',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <Plus size={15} />
                <span>+ Add New Client</span>
              </button>

              <button
                type="button"
                onClick={() => setShowManageClientsModal(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT INVOICE MODAL (USER REQUIREMENT 2) */}
      {/* ========================================================================= */}
      {editingInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setEditingInvoice(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 24,
              width: '100%',
              maxWidth: 1040,
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '28px 32px',
              boxShadow: '0 25px 70px rgba(0,0,0,0.3)',
              border: '1px solid #CBD5E1',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #E2E8F0', paddingBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0F172A' }}>
                    Edit Invoice & Candidate Details
                  </h3>
                  <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
                    Replaces 'xxx' with Live Data
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>
                  Update invoice number, PO number, dates, candidate names, EMP IDs, and processes. Totals and GST recalculate automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 10, color: '#64748B', cursor: 'pointer', padding: 8 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* SECTION 1: INVOICE IDENTIFIERS & TAX DISPATCH DETAILS */}
              <div style={{ background: '#F8FAFC', borderRadius: 16, padding: '18px 20px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  1. Invoice & Dispatch Metadata
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Invoice Number (Replaces XXX) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. INV-2026-ISON-01 or CEGS/26-27/01"
                      value={editingInvoice.invoiceNo}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, invoiceNo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 800,
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      PO Number (Purchase Order)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PO-84920 or PO/2026/09"
                      value={editingInvoice.poNo || ''}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, poNo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Invoice / Bill Date (Replaces xx/xx/xxxx)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-10-14 or 14/10/2026"
                      value={editingInvoice.invoiceDate || ''}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, invoiceDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Due By / Terms (Replaces xx/xx/xxxx)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 30 days, 15 Nov 2026"
                      value={editingInvoice.dueDate || ''}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, dueDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Client / Company *
                    </label>
                    <select
                      value={editingInvoice.client}
                      onChange={(e) => {
                        const val = e.target.value;
                        const tmpl = getClientTemplate(val);
                        const cfg = CLIENT_CONFIGS[tmpl];
                        if (cfg) {
                          setEditingInvoice({
                            ...editingInvoice,
                            client: val,
                            templateType: tmpl,
                            clientAddress: cfg.defaultAddress,
                            clientGstin: cfg.defaultGstin,
                          });
                        } else {
                          setEditingInvoice({ ...editingInvoice, client: val });
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#FFFFFF',
                      }}
                    >
                      {availableClientOptions.length === 0 ? (
                        <option value="">No clients configured</option>
                      ) : (
                        availableClientOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Place of Service
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bangalore"
                      value={editingInvoice.placeOfService || 'Bangalore'}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, placeOfService: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Date & Time of Service
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. October 2026 or 14/10/2026"
                      value={editingInvoice.dateTimeOfService || ''}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, dateTimeOfService: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Payment Status
                    </label>
                    <select
                      value={editingInvoice.status}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, status: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#FFFFFF',
                        fontWeight: 700,
                      }}
                    >
                      <option value="Pending">Pending (Unpaid)</option>
                      <option value="Paid">Paid (Cleared)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Deliverable / Milestone Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Employee & Seat Billing · 7 Seats (Etisalat, CNR, ICAD, EMoney, SMB)"
                    value={editingInvoice.projectMilestone}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, projectMilestone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #CBD5E1',
                      fontSize: 13.5,
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontWeight: 600,
                      background: '#FFFFFF',
                    }}
                  />
                </div>
              </div>

              {/* SECTION 2: CANDIDATE / SEAT BILLING TABLE EDITOR (REPLACES ALL "xxxx") */}
              <div style={{ border: '1.5px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
                <div
                  style={{
                    background: '#FFF9E6',
                    borderBottom: '1.5px solid #FDE68A',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>👥 Candidate Placement & Seat Billing Table</span>
                      <span style={{ background: '#F59E0B', color: '#FFF', fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 900 }}>
                        {(editingInvoice.items || []).length} Seats
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#B45309', marginTop: 2 }}>
                      Fill in candidate details below to replace placeholder 'xxxx' with real names, employee IDs, and joining dates.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          loadPresetToInvoice(e.target.value, true);
                        }
                      }}
                      defaultValue=""
                      style={{
                        background: '#0F172A',
                        color: '#F8FAFC',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="" disabled>⚡ Load Preset Template Rows...</option>
                      {Object.values(CLIENT_CONFIGS).map((cfg) => (
                        <option key={cfg.key} value={cfg.key}>
                          {cfg.badge} ({cfg.sampleItems.length} rows)
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={addEditingInvoiceItem}
                      style={{
                        background: '#0284C7',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 14px',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Plus size={14} />
                      <span>Add Row</span>
                    </button>
                  </div>
                </div>

                {(() => {
                  const editTmplKey = getClientTemplate(editingInvoice.client, editingInvoice.templateType);
                  const isEditAltruist = editTmplKey === 'ALTRUIST' || editTmplKey === 'ALTRUIST_GB';
                  const isEditRadical = editTmplKey === 'RADICAL_MINDS';
                  const isEditFiveSplashOr1P1 = editTmplKey === 'FIVE_SPLASH' || editTmplKey === 'ONE_POINT_ONE';

                  return (
                    <div style={{ overflowX: 'auto', maxHeight: 340, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#FFF000', borderBottom: '1.5px solid #000000', textAlign: 'center', color: '#000000' }}>
                            <th style={{ padding: '8px 4px', fontWeight: 800, width: '4%' }}>#</th>
                            <th style={{ padding: '8px 6px', fontWeight: 800, width: isEditAltruist ? '10%' : '12%' }}>
                              {isEditAltruist ? 'Emp. Code' : 'EMP ID'}
                            </th>
                            <th style={{ padding: '8px 6px', fontWeight: 800, width: isEditAltruist ? '13%' : '18%' }}>
                              {isEditAltruist ? 'Emp. Name' : 'Candidate Name'}
                            </th>
                            {(isEditFiveSplashOr1P1 || isEditRadical) && (
                              <th style={{ padding: '8px 6px', fontWeight: 800, width: '13%' }}>Phone</th>
                            )}
                            {isEditAltruist && (
                              <th style={{ padding: '8px 6px', fontWeight: 800, width: '19%' }}>Designation</th>
                            )}
                            {isEditRadical && (
                              <th style={{ padding: '8px 6px', fontWeight: 800, width: '10%' }}>Status</th>
                            )}
                            {!isEditRadical && (
                              <th style={{ padding: '8px 6px', fontWeight: 800, width: isEditAltruist ? '13%' : '15%' }}>Process</th>
                            )}
                            <th style={{ padding: '8px 6px', fontWeight: 800, width: '10%' }}>DOJ</th>
                            {isEditAltruist && (
                              <th style={{ padding: '8px 4px', fontWeight: 800, width: '7%' }}>HSN/SAC</th>
                            )}
                            {!isEditFiveSplashOr1P1 && !isEditRadical && (
                              <th style={{ padding: '8px 6px', fontWeight: 800, width: '11%' }}>Rate (₹)</th>
                            )}
                            <th style={{ padding: '8px 6px', fontWeight: 800, width: '11%' }}>
                              {isEditFiveSplashOr1P1 || isEditRadical ? 'Billing Amt (₹)' : 'Total (₹)'}
                            </th>
                            <th style={{ padding: '8px 4px', fontWeight: 800, width: '4%' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(editingInvoice.items || []).length === 0 ? (
                            <tr>
                              <td colSpan={10} style={{ textAlign: 'center', padding: '24px 16px', color: '#64748B', fontSize: 13 }}>
                                No candidate rows added. Click <strong>"+ Add Row"</strong> or select a template preset above.
                              </td>
                            </tr>
                          ) : (
                            editingInvoice.items.map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: '#94A3B8' }}>{row.sno || idx + 1}</td>
                                <td style={{ padding: '6px 4px' }}>
                                  <input
                                    type="text"
                                    placeholder="CEGS-01"
                                    value={row.empId === 'xxxx' ? '' : row.empId}
                                    onChange={(e) => updateEditingInvoiceItem(idx, 'empId', e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '6px 6px',
                                      borderRadius: 6,
                                      border: row.empId === 'xxxx' || !row.empId ? '1.5px solid #F59E0B' : '1px solid #CBD5E1',
                                      fontSize: 11.5,
                                      outline: 'none',
                                      boxSizing: 'border-box',
                                      background: row.empId === 'xxxx' || !row.empId ? '#FFFBEB' : '#FFFFFF',
                                      fontWeight: 700,
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '6px 4px' }}>
                                  <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={row.employeeName === 'xxxx' ? '' : row.employeeName}
                                    onChange={(e) => updateEditingInvoiceItem(idx, 'employeeName', e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '6px 6px',
                                      borderRadius: 6,
                                      border: row.employeeName === 'xxxx' || !row.employeeName ? '1.5px solid #F59E0B' : '1px solid #CBD5E1',
                                      fontSize: 11.5,
                                      outline: 'none',
                                      boxSizing: 'border-box',
                                      background: row.employeeName === 'xxxx' || !row.employeeName ? '#FFFBEB' : '#FFFFFF',
                                      fontWeight: 600,
                                    }}
                                  />
                                </td>
                                {(isEditFiveSplashOr1P1 || isEditRadical) && (
                                  <td style={{ padding: '6px 4px' }}>
                                    <input
                                      type="text"
                                      placeholder="Phone"
                                      value={row.phone === 'xxxx' ? '' : (row.phone || '')}
                                      onChange={(e) => updateEditingInvoiceItem(idx, 'phone', e.target.value)}
                                      style={{ width: '100%', padding: '6px 6px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box' }}
                                    />
                                  </td>
                                )}
                                {isEditAltruist && (
                                  <td style={{ padding: '6px 4px' }}>
                                    <input
                                      type="text"
                                      placeholder="Designation"
                                      value={row.designation || 'Business AssociateOperation.'}
                                      onChange={(e) => updateEditingInvoiceItem(idx, 'designation', e.target.value)}
                                      style={{ width: '100%', padding: '6px 6px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                                    />
                                  </td>
                                )}
                                {isEditRadical && (
                                  <td style={{ padding: '6px 4px' }}>
                                    <select
                                      value={row.status || 'Active'}
                                      onChange={(e) => updateEditingInvoiceItem(idx, 'status', e.target.value)}
                                      style={{ width: '100%', padding: '6px 4px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box', background: '#FFF' }}
                                    >
                                      <option value="Active">Active</option>
                                      <option value="Inactive">Inactive</option>
                                    </select>
                                  </td>
                                )}
                                {!isEditRadical && (
                                  <td style={{ padding: '6px 4px' }}>
                                    <input
                                      type="text"
                                      placeholder="Process / LOB"
                                      value={row.processLob || ''}
                                      onChange={(e) => updateEditingInvoiceItem(idx, 'processLob', e.target.value)}
                                      style={{ width: '100%', padding: '6px 6px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box', fontWeight: 600 }}
                                    />
                                  </td>
                                )}
                                <td style={{ padding: '6px 4px' }}>
                                  <input
                                    type="text"
                                    placeholder="DD/MM/YYYY"
                                    value={row.doj === 'xx/x/xx' || row.doj === 'xx/xx/xxxx' ? '' : (row.doj || '')}
                                    onChange={(e) => updateEditingInvoiceItem(idx, 'doj', e.target.value)}
                                    style={{ width: '100%', padding: '6px 4px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
                                  />
                                </td>
                                {isEditAltruist && (
                                  <td style={{ padding: '6px 4px' }}>
                                    <input
                                      type="text"
                                      placeholder="BPO"
                                      value={row.sacCode || 'BPO'}
                                      onChange={(e) => updateEditingInvoiceItem(idx, 'sacCode', e.target.value)}
                                      style={{ width: '100%', padding: '6px 4px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
                                    />
                                  </td>
                                )}
                                {!isEditFiveSplashOr1P1 && !isEditRadical && (
                                  <td style={{ padding: '6px 4px' }}>
                                    <input
                                      type="number"
                                      placeholder="5000"
                                      value={row.ratePerSeat ?? ''}
                                      onChange={(e) => updateEditingInvoiceItem(idx, 'ratePerSeat', e.target.value)}
                                      style={{ width: '100%', padding: '6px 6px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box', textAlign: 'right', fontWeight: 700 }}
                                    />
                                  </td>
                                )}
                                <td style={{ padding: '6px 4px' }}>
                                  <input
                                    type="number"
                                    placeholder="5000"
                                    value={row.amount ?? ''}
                                    onChange={(e) => updateEditingInvoiceItem(idx, 'amount', e.target.value)}
                                    style={{ width: '100%', padding: '6px 6px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box', textAlign: 'right', fontWeight: 800 }}
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => removeEditingInvoiceItem(idx)}
                                    title="Remove row"
                                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* SECTION 3: REAL-TIME TAX & TOTALS BREAKDOWN */}
              <div
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: 16,
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    Tax Calculations (Live Form GST INV – 1 Summary)
                  </div>
                  <div style={{ fontSize: 12.5, color: '#CBD5E1', marginTop: 4 }}>
                    Subtotal: <strong>₹{Number(editingInvoice.basicAmount || 0).toLocaleString('en-IN')}</strong> · SGST (9%): <strong>₹{Number(editingInvoice.sgstAmount || 0).toLocaleString('en-IN')}</strong> · CGST (9%): <strong>₹{Number(editingInvoice.cgstAmount || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#93C5FD', marginTop: 3, fontStyle: 'italic' }}>
                    Amount in Words: {editingInvoice.amountInWords || numberToWordsINR(editingInvoice.amount || 0)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
                    TOTAL BILL AMOUNT - IN Rs.
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#FCD34D' }}>
                    ₹{Number(editingInvoice.amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* SECTION 4: DIGITAL SIGNATURE STAMP */}
              <div style={{ background: '#F8FAFC', borderRadius: 16, padding: '18px 20px', border: '1.5px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                        Digital Signature Stamp (Authorised Signatory)
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>
                        Official Adobe Acrobat stamp embedded into the Form GST INV – 1 signature box
                      </div>
                    </div>
                  </div>
                  <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
                    ✓ Embedded in Invoice
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 18, alignItems: 'center', background: '#FFFFFF', padding: 14, borderRadius: 12, border: '1px solid #CBD5E1' }}>
                  {/* Left: Stamp Thumbnail Preview */}
                  <div style={{ border: '1.5px dashed #94A3B8', borderRadius: 10, padding: 8, background: '#FAFAFA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 95 }}>
                    <img
                      src={editingInvoice.signatureImage || DEFAULT_SIGNATURE_STAMP}
                      alt="Digitally Signed by Mohammed Usman Zabi"
                      style={{ maxHeight: 68, maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_SIGNATURE_STAMP;
                      }}
                    />
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 6, fontWeight: 700 }}>
                      Active Stamp Preview
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
                      Upload your official scanned or Adobe Acrobat digital signature stamp (PNG, JPG, WebP). When uploaded, it instantly appears on the invoice and printable PDF.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 16px',
                          borderRadius: 9,
                          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Upload size={14} />
                        <span>Upload Signature Stamp</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleSignatureUpload(f, true);
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingInvoice((prev) => ({ ...prev, signatureImage: DEFAULT_SIGNATURE_STAMP }));
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('cegs_signature_stamp', DEFAULT_SIGNATURE_STAMP);
                          }
                          showToast('Reset to default Mohammed Usman Zabi signature stamp');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          borderRadius: 9,
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#475569',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        <RotateCcw size={13} />
                        <span>Reset to Default Stamp</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: NOTES */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Scope Notes / Special Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified candidate onboarding deliverables for October 2026."
                  value={editingInvoice.notes || ''}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 6, borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 12,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditInvoice}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  }}
                >
                  {savingEditInvoice ? 'Saving…' : 'Save Invoice & Candidates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: GENERATE INVOICE MODAL */}
      {/* ========================================================================= */}
      {showGenerateInvoiceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowGenerateInvoiceModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 24,
              width: '100%',
              maxWidth: 1040,
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '28px 32px',
              boxShadow: '0 25px 70px rgba(0,0,0,0.3)',
              border: '1px solid #CBD5E1',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #E2E8F0', paddingBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0F172A' }}>
                    Generate New Invoice
                  </h3>
                  <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
                    Form GST INV – 1 Compatible
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>
                  Create candidate placement seat invoices or milestone deliverables with automatic GST calculations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerateInvoiceModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 10, color: '#64748B', cursor: 'pointer', padding: 8 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* SECTION 1: INVOICE IDENTIFIERS & DISPATCH */}
              <div style={{ background: '#F8FAFC', borderRadius: 16, padding: '18px 20px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  1. Invoice & Dispatch Metadata
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Client / Company *
                    </label>
                    <select
                      value={invoiceForm.client}
                      onChange={(e) => {
                        const val = e.target.value;
                        const tmpl = getClientTemplate(val);
                        const cfg = CLIENT_CONFIGS[tmpl] || CLIENT_CONFIGS.GST_INV_1;
                        if (CLIENT_CONFIGS[tmpl]) {
                          setInvoiceForm({
                            ...invoiceForm,
                            client: val,
                            projectMilestone: `${cfg.badge} Placement & Service Billing`,
                            amount: String(cfg.sampleTotal),
                            basicAmount: cfg.sampleBasic,
                            sgstAmount: cfg.sampleSgst,
                            cgstAmount: cfg.sampleCgst,
                            dueDate: '30 days',
                            notes: `${cfg.badge} official billing invoice`,
                            items: cfg.sampleItems.map((it) => ({ ...it })),
                            templateType: tmpl,
                            clientAddress: cfg.defaultAddress,
                            clientGstin: cfg.defaultGstin,
                            amountInWords: cfg.words,
                          });
                        } else {
                          setInvoiceForm({ ...invoiceForm, client: val });
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#FFF',
                      }}
                    >
                      {availableClientOptions.length === 0 ? (
                        <option value="">No clients configured</option>
                      ) : (
                        availableClientOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INV-004 or CEGS/26-27/01"
                      value={invoiceForm.invoiceNo}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      PO Number (Purchase Order)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PO-84920"
                      value={invoiceForm.poNo || ''}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, poNo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Due Date / Term
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 30 days, 15 Nov"
                      value={invoiceForm.dueDate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Place of Service
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bangalore"
                      value={invoiceForm.placeOfService || 'Bangalore'}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, placeOfService: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Payment Status
                    </label>
                    <select
                      value={invoiceForm.status}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#FFF',
                        fontWeight: 700,
                      }}
                    >
                      <option value="Pending">Pending (Unpaid)</option>
                      <option value="Paid">Paid (Already Cleared)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Project / Milestone Deliverable *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Candidate Placement & Seat Billing (7 Seats)"
                    value={invoiceForm.projectMilestone}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, projectMilestone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #CBD5E1',
                      fontSize: 13.5,
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontWeight: 600,
                    }}
                  />
                </div>
              </div>

              {/* SECTION 2: CANDIDATE / SEAT BILLING TABLE */}
              <div style={{ border: '1.5px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
                <div
                  style={{
                    background: '#FFF9E6',
                    borderBottom: '1.5px solid #FDE68A',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>👥 Candidate Placement Rows</span>
                      <span style={{ background: '#F59E0B', color: '#FFF', fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 900 }}>
                        {(invoiceForm.items || []).length} Seats
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#B45309', marginTop: 2 }}>
                      Preload candidate seat rows or add custom seats with rates.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          loadPresetToInvoice(e.target.value, false);
                        }
                      }}
                      defaultValue=""
                      style={{
                        background: '#0F172A',
                        color: '#F8FAFC',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="" disabled>⚡ Load Client Template Rows...</option>
                      {Object.values(CLIENT_CONFIGS).map((cfg) => (
                        <option key={cfg.key} value={cfg.key}>
                          {cfg.badge} ({cfg.sampleItems.length} rows)
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={addInvoiceFormItem}
                      style={{
                        background: '#0284C7',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 14px',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Plus size={14} />
                      <span>Add Row</span>
                    </button>
                  </div>
                </div>

                {(() => {
                  const formTmplKey = getClientTemplate(invoiceForm.client, invoiceForm.templateType);
                  const isFormAltruist = formTmplKey === 'ALTRUIST' || formTmplKey === 'ALTRUIST_GB';
                  const isFormRadical = formTmplKey === 'RADICAL_MINDS';
                  const isFormFiveSplashOr1P1 = formTmplKey === 'FIVE_SPLASH' || formTmplKey === 'ONE_POINT_ONE';

                  return (
                    <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#FFF000', borderBottom: '1.5px solid #000000', textAlign: 'center', color: '#000000' }}>
                            <th style={{ padding: '8px 4px', fontWeight: 800, width: '4%' }}>#</th>
                            <th style={{ padding: '8px 6px', fontWeight: 800, width: isFormAltruist ? '10%' : '12%' }}>
                              {isFormAltruist ? 'Emp. Code' : 'EMP ID'}
                            </th>
                            <th style={{ padding: '8px 6px', fontWeight: 800, width: isFormAltruist ? '13%' : '18%' }}>
                              {isFormAltruist ? 'Emp. Name' : 'Candidate Name'}
                            </th>
                            {(isFormFiveSplashOr1P1 || isFormRadical) && (
                              <th style={{ padding: '8px 6px', fontWeight: 800, width: '13%' }}>Phone</th>
                            )}
                            {isFormAltruist && (
                              <th style={{ padding: '8px 6px', fontWeight: 800, width: '19%' }}>Designation</th>
                            )}
                            {isFormRadical && (
                              <th style={{ padding: '8px 6px', fontWeight: 800, width: '10%' }}>Status</th>
                            )}
                            {!isFormRadical && (
                              <th style={{ padding: '8px 6px', fontWeight: 800, width: isFormAltruist ? '13%' : '15%' }}>Process</th>
                            )}
                            <th style={{ padding: '8px 6px', fontWeight: 800, width: '10%' }}>DOJ</th>
                            {isFormAltruist && (
                              <th style={{ padding: '8px 4px', fontWeight: 800, width: '7%' }}>HSN/SAC</th>
                            )}
                            {!isFormFiveSplashOr1P1 && !isFormRadical && (
                              <th style={{ padding: '8px 6px', fontWeight: 800, width: '11%' }}>Rate (₹)</th>
                            )}
                            <th style={{ padding: '8px 6px', fontWeight: 800, width: '11%' }}>
                              {isFormFiveSplashOr1P1 || isFormRadical ? 'Billing Amt (₹)' : 'Total (₹)'}
                            </th>
                            <th style={{ padding: '8px 4px', fontWeight: 800, width: '4%' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(invoiceForm.items || []).length === 0 ? (
                            <tr>
                              <td colSpan={10} style={{ textAlign: 'center', padding: '24px 16px', color: '#64748B', fontSize: 13 }}>
                                No candidate rows added. Click <strong>"+ Add Row"</strong> or select a template preset above.
                              </td>
                            </tr>
                          ) : (
                            invoiceForm.items.map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: '#94A3B8' }}>{row.sno || idx + 1}</td>
                                <td style={{ padding: '6px 4px' }}>
                                  <input
                                    type="text"
                                    placeholder="CEGS-01"
                                    value={row.empId === 'xxxx' ? '' : (row.empId || '')}
                                    onChange={(e) => updateInvoiceFormItem(idx, 'empId', e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '6px 6px',
                                      borderRadius: 6,
                                      border: '1px solid #CBD5E1',
                                      fontSize: 11.5,
                                      outline: 'none',
                                      boxSizing: 'border-box',
                                      fontWeight: 700,
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '6px 4px' }}>
                                  <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={row.employeeName === 'xxxx' ? '' : (row.employeeName || '')}
                                    onChange={(e) => updateInvoiceFormItem(idx, 'employeeName', e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '6px 6px',
                                      borderRadius: 6,
                                      border: '1px solid #CBD5E1',
                                      fontSize: 11.5,
                                      outline: 'none',
                                      boxSizing: 'border-box',
                                      fontWeight: 600,
                                    }}
                                  />
                                </td>
                                {(isFormFiveSplashOr1P1 || isFormRadical) && (
                                  <td style={{ padding: '6px 4px' }}>
                                    <input
                                      type="text"
                                      placeholder="Phone"
                                      value={row.phone === 'xxxx' ? '' : (row.phone || '')}
                                      onChange={(e) => updateInvoiceFormItem(idx, 'phone', e.target.value)}
                                      style={{ width: '100%', padding: '6px 6px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box' }}
                                    />
                                  </td>
                                )}
                                {isFormAltruist && (
                                  <td style={{ padding: '6px 4px' }}>
                                    <input
                                      type="text"
                                      placeholder="Designation"
                                      value={row.designation || 'Business AssociateOperation.'}
                                      onChange={(e) => updateInvoiceFormItem(idx, 'designation', e.target.value)}
                                      style={{ width: '100%', padding: '6px 6px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                                    />
                                  </td>
                                )}
                                {isFormRadical && (
                                  <td style={{ padding: '6px 4px' }}>
                                    <select
                                      value={row.status || 'Active'}
                                      onChange={(e) => updateInvoiceFormItem(idx, 'status', e.target.value)}
                                      style={{ width: '100%', padding: '6px 4px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box', background: '#FFF' }}
                                    >
                                      <option value="Active">Active</option>
                                      <option value="Inactive">Inactive</option>
                                    </select>
                                  </td>
                                )}
                                {!isFormRadical && (
                                  <td style={{ padding: '6px 4px' }}>
                                    <input
                                      type="text"
                                      placeholder="Process / LOB"
                                      value={row.processLob || ''}
                                      onChange={(e) => updateInvoiceFormItem(idx, 'processLob', e.target.value)}
                                      style={{ width: '100%', padding: '6px 6px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box', fontWeight: 600 }}
                                    />
                                  </td>
                                )}
                                <td style={{ padding: '6px 4px' }}>
                                  <input
                                    type="text"
                                    placeholder="DD/MM/YYYY"
                                    value={row.doj === 'xx/x/xx' || row.doj === 'xx/xx/xxxx' ? '' : (row.doj || '')}
                                    onChange={(e) => updateInvoiceFormItem(idx, 'doj', e.target.value)}
                                    style={{ width: '100%', padding: '6px 4px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
                                  />
                                </td>
                                {isFormAltruist && (
                                  <td style={{ padding: '6px 4px' }}>
                                    <input
                                      type="text"
                                      placeholder="BPO"
                                      value={row.sacCode || 'BPO'}
                                      onChange={(e) => updateInvoiceFormItem(idx, 'sacCode', e.target.value)}
                                      style={{ width: '100%', padding: '6px 4px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
                                    />
                                  </td>
                                )}
                                {!isFormFiveSplashOr1P1 && !isFormRadical && (
                                  <td style={{ padding: '6px 4px' }}>
                                    <input
                                      type="number"
                                      placeholder="5000"
                                      value={row.ratePerSeat ?? ''}
                                      onChange={(e) => updateInvoiceFormItem(idx, 'ratePerSeat', e.target.value)}
                                      style={{ width: '100%', padding: '6px 6px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box', textAlign: 'right', fontWeight: 700 }}
                                    />
                                  </td>
                                )}
                                <td style={{ padding: '6px 4px' }}>
                                  <input
                                    type="number"
                                    placeholder="5000"
                                    value={row.amount ?? ''}
                                    onChange={(e) => updateInvoiceFormItem(idx, 'amount', e.target.value)}
                                    style={{ width: '100%', padding: '6px 6px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5, outline: 'none', boxSizing: 'border-box', textAlign: 'right', fontWeight: 800 }}
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => removeInvoiceFormItem(idx)}
                                    title="Remove row"
                                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* SECTION 3: TOTALS BREAKDOWN */}
              <div
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: 16,
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    Tax Calculations (Live Form GST INV – 1 Summary)
                  </div>
                  <div style={{ fontSize: 12.5, color: '#CBD5E1', marginTop: 4 }}>
                    Subtotal: <strong>₹{Number(invoiceForm.basicAmount || 0).toLocaleString('en-IN')}</strong> · SGST (9%): <strong>₹{Number(invoiceForm.sgstAmount || 0).toLocaleString('en-IN')}</strong> · CGST (9%): <strong>₹{Number(invoiceForm.cgstAmount || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#93C5FD', marginTop: 3, fontStyle: 'italic' }}>
                    Amount in Words: {invoiceForm.amountInWords || numberToWordsINR(invoiceForm.amount || 0)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
                    TOTAL BILL AMOUNT - IN Rs.
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#FCD34D' }}>
                    ₹{Number(invoiceForm.amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* SECTION 4: DIGITAL SIGNATURE STAMP */}
              <div style={{ background: '#F8FAFC', borderRadius: 16, padding: '18px 20px', border: '1.5px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                        Digital Signature Stamp (Authorised Signatory)
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>
                        Official Adobe Acrobat stamp embedded into the Form GST INV – 1 signature box
                      </div>
                    </div>
                  </div>
                  <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
                    ✓ Embedded in Invoice
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 18, alignItems: 'center', background: '#FFFFFF', padding: 14, borderRadius: 12, border: '1px solid #CBD5E1' }}>
                  {/* Left: Stamp Thumbnail Preview */}
                  <div style={{ border: '1.5px dashed #94A3B8', borderRadius: 10, padding: 8, background: '#FAFAFA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 95 }}>
                    <img
                      src={invoiceForm.signatureImage || DEFAULT_SIGNATURE_STAMP}
                      alt="Digitally Signed by Mohammed Usman Zabi"
                      style={{ maxHeight: 68, maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_SIGNATURE_STAMP;
                      }}
                    />
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 6, fontWeight: 700 }}>
                      Active Stamp Preview
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
                      Upload your official scanned or Adobe Acrobat digital signature stamp (PNG, JPG, WebP). When uploaded, it instantly appears on the invoice and printable PDF.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 16px',
                          borderRadius: 9,
                          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Upload size={14} />
                        <span>Upload Signature Stamp</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleSignatureUpload(f, false);
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceForm((prev) => ({ ...prev, signatureImage: DEFAULT_SIGNATURE_STAMP }));
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('cegs_signature_stamp', DEFAULT_SIGNATURE_STAMP);
                          }
                          showToast('Reset to default Mohammed Usman Zabi signature stamp');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          borderRadius: 9,
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#475569',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        <RotateCcw size={13} />
                        <span>Reset to Default Stamp</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: NOTES */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Scope Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Official candidate placements for October"
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 6, borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowGenerateInvoiceModal(false)}
                  style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInvoice}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                  }}
                >
                  {savingInvoice ? 'Generating…' : 'Generate & Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: INVOICE PREVIEW & PRINTABLE TEMPLATE MODAL */}
      {/* ========================================================================= */}
      {previewInvoice && (() => {
        const isIson = Boolean(previewInvoice.client && previewInvoice.client.toLowerCase().includes('ison'));
        const items = (previewInvoice.items && previewInvoice.items.length > 0)
          ? previewInvoice.items
          : (isIson ? ISON_SAMPLE_ITEMS : [
              {
                empId: 'CEGS-01',
                employeeName: 'Milestone Scope Execution',
                doj: previewInvoice.invoiceDate || '14/10/2026',
                processLob: previewInvoice.projectMilestone || 'Staffing & Support Services',
                ratePerSeat: previewInvoice.basicAmount || previewInvoice.amount || 0,
                sacCode: '99851',
                amount: previewInvoice.basicAmount || previewInvoice.amount || 0,
              }
            ]);

        const basicAmt = Number(previewInvoice.basicAmount) || (
          items.length > 0
            ? items.reduce((s, r) => s + (Number(r.amount) || 0), 0)
            : Math.round(Number(previewInvoice.amount || 0) / 1.18)
        );

        const sgstAmt = previewInvoice.sgstAmount !== undefined && previewInvoice.sgstAmount !== null && previewInvoice.sgstAmount > 0
          ? Number(previewInvoice.sgstAmount)
          : Math.round(basicAmt * 0.09);

        const cgstAmt = previewInvoice.cgstAmount !== undefined && previewInvoice.cgstAmount !== null && previewInvoice.cgstAmount > 0
          ? Number(previewInvoice.cgstAmount)
          : Math.round(basicAmt * 0.09);

        const totalBill = Number(previewInvoice.amount) || (basicAmt + sgstAmt + cgstAmt);
        const amountInWords = previewInvoice.amountInWords || numberToWordsINR(totalBill);

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              padding: 16,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
            onClick={() => setPreviewInvoice(null)}
          >
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #printable-gst-invoice, #printable-gst-invoice * {
                  visibility: visible !important;
                }
                #printable-gst-invoice {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 8px !important;
                  border: 1.5px solid #000000 !important;
                  box-shadow: none !important;
                  background: #FFFFFF !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .no-print-zone {
                  display: none !important;
                }
              }

              /* Smooth, visible, high-contrast scrollbar for invoice preview */
              .invoice-modal-scrollable::-webkit-scrollbar {
                width: 10px;
                height: 10px;
              }
              .invoice-modal-scrollable::-webkit-scrollbar-track {
                background: #E2E8F0;
                border-radius: 8px;
              }
              .invoice-modal-scrollable::-webkit-scrollbar-thumb {
                background: #64748B;
                border-radius: 8px;
                border: 2px solid #E2E8F0;
              }
              .invoice-modal-scrollable::-webkit-scrollbar-thumb:hover {
                background: #334155;
              }
            `}</style>

            <div
              style={{
                background: '#F1F5F9',
                borderRadius: 24,
                width: '100%',
                maxWidth: 920,
                maxHeight: 'calc(100vh - 32px)',
                height: 'calc(100vh - 32px)',
                boxSizing: 'border-box',
                padding: '20px 24px',
                boxShadow: '0 25px 70px rgba(0,0,0,0.35)',
                border: '1px solid #CBD5E1',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                overflow: 'hidden',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* MODAL TOP TOOLBAR (NO-PRINT) */}
              <div
                className="no-print-zone"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  background: '#FFFFFF',
                  padding: '12px 18px',
                  borderRadius: 16,
                  border: '1px solid #E2E8F0',
                  flexShrink: 0,
                }}
              >
                {/* Template Mode Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { key: 'GST_INV_1', label: 'Form GST INV-1 (ISON)' },
                    { key: 'FIVE_SPLASH', label: 'Five Splash' },
                    { key: 'ALTRUIST', label: 'Altruist Tech' },
                    { key: 'ALTRUIST_GB', label: 'Altruist GB' },
                    { key: 'ONE_POINT_ONE', label: 'One Point One' },
                    { key: 'RADICAL_MINDS', label: 'Radical Minds' },
                    { key: 'MODERN', label: 'Executive' },
                  ].map((t) => {
                    const isActive = previewTemplateMode === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setPreviewTemplateMode(t.key)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: isActive ? '1.5px solid #0F172A' : '1px solid #CBD5E1',
                          background: isActive ? '#0F172A' : '#FFFFFF',
                          color: isActive ? '#FFE500' : '#475569',
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Print, Edit, and Close Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const inv = previewInvoice;
                      setPreviewInvoice(null);
                      handleOpenEdit(inv);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 18px',
                      borderRadius: 12,
                      border: '1.5px solid #2563EB',
                      background: '#EFF6FF',
                      color: '#1D4ED8',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Edit3 size={15} />
                    <span>✏️ Edit Invoice & Candidates</span>
                  </button>

                  <label
                    title="Upload and apply a new digital signature stamp for this invoice"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '8px 16px',
                      borderRadius: 12,
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#334155',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Upload size={14} />
                    <span>🖋️ Change Stamp</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleSignatureUpload}
                    />
                  </label>

                  {/* SEND VIA EMAIL BUTTON (MULTIPLE RECIPIENTS) */}
                  <button
                    type="button"
                    onClick={() => handleOpenEmailModal(previewInvoice)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 18px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                    }}
                  >
                    <Mail size={15} />
                    <span>Send via Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 18px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)',
                    }}
                  >
                    <Printer size={15} />
                    <span>Print / Save PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadInvoicePdf(previewInvoice)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 18px',
                      borderRadius: 12,
                      border: '1.5px solid #0284C7',
                      background: '#F0F9FF',
                      color: '#0284C7',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.15)',
                    }}
                  >
                    <Download size={15} />
                    <span>Download PDF File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewInvoice(null)}
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: 10,
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* PLACEHOLDER DATA BANNER IF 'xxxx' PRESENT */}
              {(items.some((it) => it.empId === 'xxxx' || it.employeeName === 'xxxx') || !previewInvoice.poNo || previewInvoice.invoiceNo === 'XXX') && (
                <div
                  className="no-print-zone"
                  style={{
                    background: '#FEF3C7',
                    border: '1.5px solid #F59E0B',
                    borderRadius: 14,
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>📝</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: '#92400E' }}>
                        Placeholder 'xxxx' values detected in this invoice template
                      </div>
                      <div style={{ fontSize: 11.5, color: '#B45309', marginTop: 2 }}>
                        You can customize candidate names, EMP IDs, joining dates, and PO number before printing.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const inv = previewInvoice;
                      setPreviewInvoice(null);
                      handleOpenEdit(inv);
                    }}
                    style={{
                      background: '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)',
                    }}
                  >
                    ✏️ Fill Candidate Details & Edit 'xxxx'
                  </button>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SCROLLABLE DEDICATED INVOICE DOCUMENT VIEWPORT                            */}
              {/* ========================================================================= */}
              <div
                className="invoice-modal-scrollable"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  paddingRight: 6,
                  paddingBottom: 24,
                  borderRadius: 14,
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  id="printable-gst-invoice"
                  style={{
                    background: '#FFFFFF',
                    color: '#000000',
                    margin: '0 auto',
                    boxSizing: 'border-box',
                    width: '100%',
                    borderRadius: previewTemplateMode === 'MODERN' ? 20 : 0,
                  }}
                >
                {previewTemplateMode === 'FIVE_SPLASH' && (
                  <FiveSplashInvoiceTemplate
                    invoice={previewInvoice}
                    items={items}
                    basicAmt={basicAmt}
                    cgstAmt={cgstAmt}
                    sgstAmt={sgstAmt}
                    totalBill={totalBill}
                    amountInWords={amountInWords}
                    onSignatureUpload={handleSignatureUpload}
                  />
                )}

                {previewTemplateMode === 'ALTRUIST' && (
                  <AltruistInvoiceTemplate
                    invoice={previewInvoice}
                    items={items}
                    basicAmt={basicAmt}
                    cgstAmt={cgstAmt}
                    sgstAmt={sgstAmt}
                    totalBill={totalBill}
                    amountInWords={amountInWords}
                    isGB={false}
                  />
                )}

                {previewTemplateMode === 'ALTRUIST_GB' && (
                  <AltruistInvoiceTemplate
                    invoice={previewInvoice}
                    items={items}
                    basicAmt={basicAmt}
                    cgstAmt={cgstAmt}
                    sgstAmt={sgstAmt}
                    totalBill={totalBill}
                    amountInWords={amountInWords}
                    isGB={true}
                  />
                )}

                {previewTemplateMode === 'ONE_POINT_ONE' && (
                  <OnePointOneInvoiceTemplate
                    invoice={previewInvoice}
                    items={items}
                    basicAmt={basicAmt}
                    cgstAmt={cgstAmt}
                    sgstAmt={sgstAmt}
                    totalBill={totalBill}
                    amountInWords={amountInWords}
                  />
                )}

                {previewTemplateMode === 'RADICAL_MINDS' && (
                  <RadicalMindsInvoiceTemplate
                    invoice={previewInvoice}
                    items={items}
                    basicAmt={basicAmt}
                    cgstAmt={cgstAmt}
                    sgstAmt={sgstAmt}
                    totalBill={totalBill}
                    amountInWords={amountInWords}
                  />
                )}

                {previewTemplateMode === 'GST_INV_1' && (
                  <IsonInvoiceTemplate
                    invoice={previewInvoice}
                    items={items}
                    basicAmt={basicAmt}
                    cgstAmt={cgstAmt}
                    sgstAmt={sgstAmt}
                    totalBill={totalBill}
                    amountInWords={amountInWords}
                  />
                )}

                {previewTemplateMode === 'MODERN' && (
                  <ModernInvoiceTemplate
                    invoice={previewInvoice}
                    items={items}
                    basicAmt={basicAmt}
                    cgstAmt={cgstAmt}
                    sgstAmt={sgstAmt}
                    totalBill={totalBill}
                    amountInWords={amountInWords}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: MULTIPLE EMAIL ENTRY & DIRECT INVOICE SENDING MODAL */}
      {/* ========================================================================= */}
      {sendEmailInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(5px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSendEmailInvoice(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 22,
              width: '100%',
              maxWidth: 620,
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 65px rgba(0,0,0,0.25)',
              border: '1.5px solid #E2E8F0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '22px 28px 18px',
                borderBottom: '1px solid #F1F5F9',
                background: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                  }}
                >
                  <Mail size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18.5, fontWeight: 800, color: '#0F172A' }}>
                    Send Invoice via Email
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748B' }}>
                    Invoice <strong>#{sendEmailInvoice.invoiceNo || 'INV'}</strong> · {normalizeClientName(sendEmailInvoice.client)} · <strong style={{ color: '#0284C7' }}>{inr(sendEmailInvoice.amount || sendEmailInvoice.basicAmount)}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSendEmailInvoice(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: 10,
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 6,
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
              {/* Option A: Quick Instant Delivery via Gmail Web */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                  border: '1.5px solid #86EFAC',
                  borderRadius: 14,
                  padding: '14px 16px',
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: '#16A34A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                    }}
                  >
                    <ExternalLink size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#14532D', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Send with Gmail Web</span>
                      <span style={{ fontSize: 10, background: '#16A34A', color: '#FFF', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                        RECOMMENDED · INSTANT
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#166534', marginTop: 2 }}>
                      Opens your logged-in Gmail in browser with pre-filled recipients, subject, and invoice cover letter. Zero setup required!
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenGmailWeb}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#16A34A',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(22, 163, 74, 0.3)',
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Open in Gmail Compose</span>
                </button>
              </div>

              {/* Direct Server SMTP Status & Config Drawer */}
              <div
                style={{
                  background: smtpStatus.configured ? '#F8FAFC' : '#FFFBEB',
                  border: `1.5px solid ${smtpStatus.configured ? '#E2E8F0' : '#FDE68A'}`,
                  borderRadius: 14,
                  padding: '12px 16px',
                  marginBottom: 18,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {smtpStatus.configured ? (
                      <CheckCircle size={17} color="#10B981" />
                    ) : (
                      <AlertCircle size={17} color="#D97706" />
                    )}
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: smtpStatus.configured ? '#1E293B' : '#92400E' }}>
                      {smtpStatus.configured
                        ? `Direct Background Sending: Connected (${smtpStatus.user})`
                        : 'Direct Server SMTP: Not Connected (Requires Gmail App Password)'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSmtpConfig(!showSmtpConfig)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: smtpStatus.configured ? '#0284C7' : '#B45309',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}
                  >
                    <Settings size={13} />
                    <span>{showSmtpConfig ? 'Hide SMTP Settings' : smtpStatus.configured ? 'Change SMTP Settings' : 'Connect Gmail / SMTP'}</span>
                  </button>
                </div>

                {/* Collapsible SMTP Configuration Form */}
                {showSmtpConfig && (
                  <form
                    onSubmit={handleSaveSmtp}
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px dashed #CBD5E1',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 12px',
                        background: '#FFFFFF',
                        borderRadius: 8,
                        border: '1px solid #E2E8F0',
                        fontSize: 11.5,
                        color: '#475569',
                        lineHeight: 1.5,
                        marginBottom: 12,
                      }}
                    >
                      <strong style={{ color: '#0F172A' }}>How to connect Gmail SMTP:</strong>
                      <ol style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        <li>Go to Google Account (<a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: '#0284C7', fontWeight: 700 }}>myaccount.google.com/apppasswords</a>)</li>
                        <li>Ensure 2-Step Verification is active, then create an App Password named <strong>HRMS</strong></li>
                        <li>Paste the 16-character code below and click <strong>Verify & Save Connection</strong></li>
                      </ol>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                          Sender Gmail / Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={smtpForm.smtpUser}
                          onChange={(e) => setSmtpForm({ ...smtpForm, smtpUser: e.target.value })}
                          placeholder="e.g. saifawaisi79@gmail.com"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1.5px solid #CBD5E1',
                            fontSize: 12,
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                          16-Char Google App Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={smtpForm.smtpPass}
                          onChange={(e) => setSmtpForm({ ...smtpForm, smtpPass: e.target.value })}
                          placeholder="xxxx xxxx xxxx xxxx"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1.5px solid #CBD5E1',
                            fontSize: 12,
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => setShowSmtpConfig(false)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: '#FFF',
                          color: '#64748B',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={smtpForm.saving}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 8,
                          border: 'none',
                          background: smtpForm.saving ? '#94A3B8' : '#0284C7',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: smtpForm.saving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {smtpForm.saving ? 'Verifying with Google...' : 'Verify & Save Connection'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Automatic Invoice PDF Attachment Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
                  border: '1.5px solid #7DD3FC',
                  borderRadius: 14,
                  padding: '12px 16px',
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: '#0284C7',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                    }}
                  >
                    <FileText size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0369A1', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>📎 Auto-Attached: TAX_INVOICE_{sendEmailInvoice.invoiceNo || 'INV'}.pdf</span>
                      <span style={{ fontSize: 10, background: '#0284C7', color: '#FFF', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                        OFFICIAL PDF
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#0284C7', marginTop: 2 }}>
                      Automatically attached to direct emails. Includes candidate placement list, GST breakdown, and digital certification.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadInvoicePdf(sendEmailInvoice)}
                  title="Download a copy of this official PDF invoice"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #0284C7',
                    background: '#FFFFFF',
                    color: '#0284C7',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </button>
              </div>

              {/* Recipient Emails */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                    Recipient Email Addresses *
                  </label>
                  <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>
                    Separate multiple with commas or spaces
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={emailForm.recipients}
                  onChange={(e) => setEmailForm({ ...emailForm, recipients: e.target.value })}
                  placeholder="e.g. billing@client.com, finance@client.com, accounts.dept@client.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                    transition: 'border 0.15s ease',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#0284C7')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                />

                {/* Parsed Email Tag Chips */}
                {cleanEmailList(emailForm.recipients).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {cleanEmailList(emailForm.recipients).length} Recipient{cleanEmailList(emailForm.recipients).length === 1 ? '' : 's'}:
                    </span>
                    {cleanEmailList(emailForm.recipients).map((em) => (
                      <span
                        key={em}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 10px',
                          borderRadius: 99,
                          background: '#E0F2FE',
                          color: '#0369A1',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {em}
                        <button
                          type="button"
                          onClick={() => {
                            const remaining = cleanEmailList(emailForm.recipients).filter((x) => x !== em);
                            setEmailForm({ ...emailForm, recipients: remaining.join(', ') });
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: '#0369A1',
                            display: 'flex',
                          }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Add Client Email Buttons */}
                {(() => {
                  const clientContacts = getClientContacts(sendEmailInvoice.client);
                  const currentList = cleanEmailList(emailForm.recipients);
                  const clientNorm = normalizeClientName(sendEmailInvoice.client);
                  const clientRec = clients.find((c) => normalizeClientName(c.name).toLowerCase() === clientNorm.toLowerCase());

                  // Gather all candidate contacts
                  const allContacts = [...clientContacts];
                  if (allContacts.length === 0) {
                    const fallbackEmail = sendEmailInvoice.clientEmail || clientRec?.email;
                    if (fallbackEmail) {
                      cleanEmailList(fallbackEmail).forEach((em) => {
                        allContacts.push({ name: clientNorm, email: em });
                      });
                    }
                  }

                  const missingContacts = allContacts.filter((c) => !currentList.includes(c.email.toLowerCase()));
                  const hasMultipleMissing = missingContacts.length > 1;

                  return (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 5 }}>
                        Official Client Contacts ({clientNorm}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {hasMultipleMissing && (
                          <button
                            type="button"
                            onClick={() => {
                              const newEmails = missingContacts.map((c) => c.email);
                              const combined = [...currentList, ...newEmails].join(', ');
                              setEmailForm({ ...emailForm, recipients: combined });
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              borderRadius: 8,
                              border: '1px solid #0284C7',
                              background: '#E0F2FE',
                              color: '#0369A1',
                              fontSize: 11.5,
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            <span>+ Add All ({missingContacts.length}) Contacts</span>
                          </button>
                        )}
                        {missingContacts.map((c) => (
                          <button
                            key={c.email}
                            type="button"
                            onClick={() => {
                              const combined = [...currentList, c.email].join(', ');
                              setEmailForm({ ...emailForm, recipients: combined });
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              borderRadius: 8,
                              border: '1px dashed #0284C7',
                              background: '#F0F9FF',
                              color: '#0284C7',
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <span>+ {c.name}: {c.email}</span>
                          </button>
                        ))}
                        {!currentList.includes('finance@cegs.in') && (
                          <button
                            type="button"
                            onClick={() => {
                              const combined = [...currentList, 'finance@cegs.in'].join(', ');
                              setEmailForm({ ...emailForm, recipients: combined });
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              borderRadius: 8,
                              border: '1px dashed #CBD5E1',
                              background: '#F8FAFC',
                              color: '#475569',
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <span>+ Add finance@cegs.in</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* CC Field (Optional) */}
              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  CC (Optional)
                </label>
                <input
                  type="text"
                  value={emailForm.cc}
                  onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
                  placeholder="e.g. audit@cegs.in, management@cegs.in"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #E2E8F0',
                    fontSize: 12.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                  }}
                />
              </div>

              {/* Subject Field */}
              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Subject Line *
                </label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                  }}
                />
              </div>

              {/* Message / Cover Letter */}
              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Email Message / Cover Letter *
                </label>
                <textarea
                  rows={6}
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                  }}
                />
              </div>

              {/* Bank Remittance Details Banner */}
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  fontSize: 12,
                  color: '#0369A1',
                  lineHeight: 1.5,
                }}
              >
                <div><strong>Remittance Bank:</strong> HDFC Bank · <strong>A/C:</strong> 50200080303100</div>
                <div><strong>IFSC:</strong> HDFC0000509 · <strong>Beneficiary:</strong> Career Experts Global Solutions</div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 28px',
                borderTop: '1px solid #F1F5F9',
                background: '#FAFAFA',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleOpenGmailWeb}
                  title="Opens logged-in Gmail Compose in browser with all recipient emails & cover letter prefilled"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid #86EFAC',
                    background: '#F0FDF4',
                    color: '#166534',
                    fontWeight: 800,
                    fontSize: 12.5,
                    cursor: 'pointer',
                  }}
                >
                  <ExternalLink size={14} color="#16A34A" />
                  <span>Send via Gmail Web</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenMailto}
                  title="Open in your default email client with all recipient emails prefilled"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                  }}
                >
                  <Mail size={14} color="#0284C7" />
                  <span>Open in Mail App</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const fullText = `To: ${emailForm.recipients}\nSubject: ${emailForm.subject}\n\n${emailForm.message}`;
                    navigator.clipboard?.writeText(fullText);
                    showToast('✓ Email text copied to clipboard!');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                  }}
                >
                  <Copy size={14} />
                  <span>Copy Text</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadInvoicePdf(sendEmailInvoice)}
                  title="Download official PDF copy of this invoice"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0284C7',
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                  }}
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setSendEmailInvoice(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#64748B',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={emailForm.sending}
                  onClick={handleSendEmailDirectly}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 22px',
                    borderRadius: 10,
                    border: 'none',
                    background: emailForm.sending
                      ? '#94A3B8'
                      : 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: emailForm.sending ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                  }}
                >
                  <Send size={14} />
                  <span>{emailForm.sending ? 'Sending...' : 'Send Email Directly'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PAYMENT REMINDER MODAL */}
      {/* ========================================================================= */}
      {reminderInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setReminderInvoice(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 24,
              width: '100%',
              maxWidth: 500,
              padding: '28px 32px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.22)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bell size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                  Send Payment Reminder
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748B' }}>
                  Invoice {reminderInvoice.invoiceNo} · {reminderInvoice.client}
                </p>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: 14, padding: '14px 16px', fontSize: 13, color: '#334155', lineHeight: 1.5, marginBottom: 20 }}>
              Dear <strong>{reminderInvoice.client}</strong> Finance Team,
              <br />
              This is a gentle reminder that invoice <strong>{reminderInvoice.invoiceNo}</strong> for{' '}
              <strong>{inr(reminderInvoice.amount || reminderInvoice.basicAmount)}</strong> ({reminderInvoice.projectMilestone}) is due on{' '}
              <strong>{reminderInvoice.dueDate || '10 May'}</strong>.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `Payment Reminder for ${reminderInvoice.invoiceNo} (${inr(reminderInvoice.amount || reminderInvoice.basicAmount)}) due on ${reminderInvoice.dueDate}`
                  );
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 16px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {copiedLink ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copied' : 'Copy Text'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  showToast(`Payment reminder sent to ${reminderInvoice.client} billing contact.`);
                  setReminderInvoice(null);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#F59E0B',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                }}
              >
                <Send size={14} />
                <span>Send Reminder</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: MONTH-WISE BILLING FILE EXPORT MODAL */}
      {/* ========================================================================= */}
      {showMonthFileModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowMonthFileModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 24,
              width: '100%',
              maxWidth: 580,
              padding: '28px 32px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.22)',
              border: '1px solid #E2E8F0',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #F1F5F9', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={22} color="#4338CA" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                    Month-Wise Billing File
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
                    Download single month statements or complete multi-tab workbooks
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMonthFileModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Select Billing Month */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Select Month to Export:
              </label>
              <select
                value={monthFileSelection}
                onChange={(e) => setMonthFileSelection(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: 14,
                  border: '1.5px solid #CBD5E1',
                  background: '#F8FAFC',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0F172A',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {monthOptions.map((mKey) => (
                  <option key={mKey} value={mKey}>
                    {formatMonthLabel(mKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Month Summary Stats */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: 18,
                padding: '18px 20px',
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                {formatMonthLabel(monthFileSelection)} Overview
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Invoices</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                    {selectedMonthStats.count}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600 }}>Cleared (Paid)</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981', marginTop: 4 }}>
                    {inr(selectedMonthStats.totalPaid)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: '#D97706', fontWeight: 600 }}>Pending</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B', marginTop: 4 }}>
                    {inr(selectedMonthStats.totalPending)}
                  </div>
                </div>
              </div>
            </div>

            {/* Download Action Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>
                Download Options:
              </div>

              {/* 1. Download Selected Month (Excel .xlsx) */}
              <button
                type="button"
                onClick={() => handleExportMonthFile('xlsx', monthFileSelection)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '13px 18px',
                  borderRadius: 14,
                  border: '1.5px solid #BBF7D0',
                  background: '#F0FDF4',
                  color: '#15803D',
                  fontWeight: 800,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Download size={18} color="#15803D" />
                  <span>Download {formatMonthLabel(monthFileSelection)} (Excel .xlsx)</span>
                </div>
                <span style={{ fontSize: 11, background: '#DCFCE7', padding: '3px 9px', borderRadius: 99, color: '#166534', fontWeight: 700 }}>
                  Itemized
                </span>
              </button>

              {/* 2. Download Selected Month (CSV) */}
              <button
                type="button"
                onClick={() => handleExportMonthFile('csv', monthFileSelection)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '13px 18px',
                  borderRadius: 14,
                  border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Download size={18} color="#64748B" />
                  <span>Download {formatMonthLabel(monthFileSelection)} (.csv)</span>
                </div>
                <span style={{ fontSize: 11, background: '#F1F5F9', padding: '3px 9px', borderRadius: 99, color: '#64748B', fontWeight: 700 }}>
                  Raw CSV
                </span>
              </button>

              {/* 3. Download All Months Workbook */}
              <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 8, paddingTop: 12 }}>
                <button
                  type="button"
                  onClick={handleExportAllMonthsWorkbook}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '13px 18px',
                    borderRadius: 14,
                    border: '1.5px solid #C7D2FE',
                    background: '#EEF2FF',
                    color: '#4338CA',
                    fontWeight: 800,
                    fontSize: 13.5,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={18} color="#4338CA" />
                    <span>Download All Months Workbook (Multi-Tab Excel)</span>
                  </div>
                  <span style={{ fontSize: 11, background: '#E0E7FF', padding: '3px 9px', borderRadius: 99, color: '#3730A3', fontWeight: 800 }}>
                    All Months
                  </span>
                </button>
              </div>
            </div>

            {/* Modal Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
              <button
                type="button"
                onClick={() => setShowMonthFileModal(false)}
                style={{
                  padding: '9px 20px',
                  borderRadius: 12,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinanceInvoicesView;
