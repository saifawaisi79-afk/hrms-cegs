import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/db';
import ClientInvoice from '@/lib/models/ClientInvoice';
import JoinerEntry from '@/lib/models/JoinerEntry';
import { getAuthUser, requireRole } from '@/lib/auth';
import { joinerBillEligible } from '@/lib/client-invoice-rules';
import { todayIsoDate, normalizeCandidateDate } from '@/lib/candidate-dates';

export const dynamic = 'force-dynamic';

function canFinance(user) {
  return requireRole(user, ['admin', 'super_admin', 'finance']);
}

function flatten(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return { ...o, id: o._id?.toString(), _id: o._id?.toString() };
}

async function syncEligibleJoiners() {
  const today = todayIsoDate();
  const joiners = await JoinerEntry.find({}).lean();
  for (const joiner of joiners) {
    const bill = joinerBillEligible(joiner, today);
    if (!bill) continue;
    const joinerId = joiner._id.toString();
    const existing = await ClientInvoice.findOne({ joinerId });
    if (existing) {
      if (existing.stage === 'to_raise' && !existing.invoiceId) {
        existing.candidateName = joiner.name || existing.candidateName;
        existing.phone = joiner.phone || existing.phone;
        existing.client = joiner.process || existing.client;
        existing.joiningDate = bill.joiningDate;
        existing.billingDate = bill.billingDate;
        existing.monthKey = bill.monthKey;
        existing.recruiter = joiner.recruiterName || existing.recruiter;
        await existing.save();
      }
      continue;
    }
    await ClientInvoice.create({
      stage: 'to_raise',
      monthKey: bill.monthKey,
      joinerId,
      candidateName: joiner.name || '',
      phone: joiner.phone || '',
      client: joiner.process || '',
      joiningDate: bill.joiningDate,
      billingDate: bill.billingDate,
      recruiter: joiner.recruiterName || '',
      status: '',
      invoiceId: '',
    });
  }
}

const createSchema = z.object({
  action: z.literal('raise').optional(),
  ids: z.array(z.string()).optional(),
  invoiceDate: z.string().optional().default(''),
  revisedRequested: z.string().optional().default(''),
  revisedSent: z.string().optional().default(''),
  invoiceNo: z.string().optional().default(''),
  status: z.string().optional().default(''),
  client: z.string().optional(),
  monthKey: z.string().optional(),
  candidateName: z.string().optional(),
  phone: z.string().optional(),
  joiningDate: z.string().optional(),
  billingDate: z.string().optional(),
  recruiter: z.string().optional(),
  bi: z.number().optional(),
  ai: z.number().optional(),
});

const SEED_INVOICES = [
  {
    invoiceNo: 'INV-001',
    client: 'Apex Corp',
    projectMilestone: 'Brand Identity · Kickoff',
    amount: 29500,
    dueDate: '10 May',
    status: 'Paid',
    stage: 'cleared',
    paidDate: '2026-05-10',
    invoiceDate: '2026-05-01',
    notes: 'Initial milestone payment completed via wire transfer.',
  },
  {
    invoiceNo: 'INV-002',
    client: 'Apex Corp',
    projectMilestone: 'Brand Identity · Design Delivery',
    amount: 47200,
    dueDate: '24 May',
    status: 'Pending',
    stage: 'raised',
    invoiceDate: '2026-05-10',
    notes: 'Design delivery sprint 2 review pending approval.',
  },
  {
    invoiceNo: 'INV-003',
    client: 'Apex Corp',
    projectMilestone: 'Brand Identity · Development',
    amount: 53100,
    dueDate: '15 Jun',
    status: 'Pending',
    stage: 'raised',
    invoiceDate: '2026-05-15',
    notes: 'Frontend and design token integration in progress.',
  },
  {
    invoiceNo: 'INV-000A',
    client: 'Nexus Media',
    projectMilestone: 'Digital Brand Activation · Retainer',
    amount: 185000,
    dueDate: '28 Apr',
    status: 'Paid',
    stage: 'cleared',
    paidDate: '2026-04-28',
    invoiceDate: '2026-04-10',
    notes: 'Full payment received.',
  },
  {
    invoiceNo: 'INV-000B',
    client: 'Starlight Tech',
    projectMilestone: 'UX Design System Architecture',
    amount: 115000,
    dueDate: '14 Apr',
    status: 'Paid',
    stage: 'cleared',
    paidDate: '2026-04-14',
    invoiceDate: '2026-04-01',
    notes: 'Full payment cleared via NEFT.',
  },
  {
    invoiceNo: 'INV-000C',
    client: 'TechCorp Solutions',
    projectMilestone: 'Enterprise Integration Advisory',
    amount: 90500,
    dueDate: '02 Apr',
    status: 'Paid',
    stage: 'cleared',
    paidDate: '2026-04-02',
    invoiceDate: '2026-03-25',
    notes: 'Cleared on receipt.',
  },
  {
    invoiceNo: 'INV-2026-ISON-01',
    client: 'ISON XPERIENCES INDIA PRIVATE LIMITED',
    projectMilestone: 'Employee & Seat Billing · 7 Seats (Etisalat, CNR, ICAD, EMoney, SMB)',
    amount: 43660,
    basicAmount: 37000,
    sgstAmount: 3330,
    cgstAmount: 3330,
    dueDate: '30 days',
    status: 'Pending',
    stage: 'raised',
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
    signatureImage: '/signatures/usman-zabi-digital-signature.jpg',
    items: [
      { empId: 'CEGS-01', employeeName: 'Mohammed Imran', doj: '12/04/2026', processLob: '101', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
      { empId: 'CEGS-02', employeeName: 'Farhan Pasha', doj: '15/04/2026', processLob: 'Etisalat', ratePerSeat: 7000, sacCode: '99851', amount: 7000 },
      { empId: 'CEGS-03', employeeName: 'Syed Tanveer', doj: '18/04/2026', processLob: 'CNR', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
      { empId: 'CEGS-04', employeeName: 'Ayesha Siddiqua', doj: '20/04/2026', processLob: 'I-CAD', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
      { empId: 'CEGS-05', employeeName: 'Zeeshan Ali', doj: '22/04/2026', processLob: 'E-Money', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
      { empId: 'CEGS-06', employeeName: 'Tabassum Khan', doj: '25/04/2026', processLob: 'universal', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
      { empId: 'CEGS-07', employeeName: 'Kashif Ahmed', doj: '28/04/2026', processLob: 'SMB', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
    ],
  },
  {
    invoiceNo: 'INV-2026-FS-01',
    client: 'Five Splash Infotech Pvt. Ltd- Bangalore',
    projectMilestone: 'Candidate Placement & Process Billing · 4 Candidates (JFL, CoinDCX, EFL, TVS)',
    amount: 23600,
    basicAmount: 20000,
    sgstAmount: 1800,
    cgstAmount: 1800,
    dueDate: '30 days',
    status: 'Pending',
    stage: 'raised',
    invoiceDate: '2026-10-15',
    notes: 'Five Splash Novel Tech Park Kudlugate candidate placement invoice.',
    clientGstin: '29AABCF3991K1Z5',
    clientAddress: '46/4, Novel Tech Park, Hosur Rd, Kudlugate, Krishna Reddy Industrial Area, Behind HSR, Bengaluru, Karnataka 560068.',
    clientState: 'Karnataka',
    clientStateCode: '29',
    templateType: 'FIVE_SPLASH',
    amountInWords: 'Twenty-Three Thousand Six Hundred only.',
    signatureImage: '/signatures/usman-zabi-digital-signature.jpg',
    items: [
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'JFL', doj: 'xx/xx/xxxx', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'CoinDCX', doj: 'xx/xx/xxxx', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'EFL', doj: 'xx/xx/xxxx', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'TVS', doj: 'xx/xx/xxxx', ratePerSeat: 5000, sacCode: '99851', amount: 5000 },
    ],
  },
  {
    invoiceNo: 'INV-2026-ALT-01',
    client: 'Altruist Technologies Pvt. Ltd.',
    projectMilestone: 'Operations Placement & Billing · 11 Candidates (IBL, Titan, Toyota, Leap, Amazon...)',
    amount: 66080,
    basicAmount: 56000,
    sgstAmount: 5040,
    cgstAmount: 5040,
    dueDate: '30 days',
    status: 'Pending',
    stage: 'raised',
    invoiceDate: '2026-10-15',
    notes: 'Altruist Technologies Kudlu Gate Tax Invoice.',
    clientGstin: '29AAFCA3725N1ZC',
    clientAddress: 'AKR Tech Park, 46/1, NH 44, near Krishna Reddy Industrial Area, Kudlu Gate, Bengaluru – 560068.',
    clientState: 'Karnataka',
    clientStateCode: '29',
    templateType: 'ALTRUIST',
    amountInWords: 'Sixty Six Thousand Eighty only.',
    signatureImage: '/signatures/usman-zabi-digital-signature.jpg',
    items: [
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
    ],
  },
  {
    invoiceNo: 'INV-2026-ALT-GB-01',
    client: 'Altruist GB',
    projectMilestone: 'Operations Placement & Billing · 13 Candidates (Airtel Black, BB Gold, Mobility, MLob...)',
    amount: 97940,
    basicAmount: 83000,
    sgstAmount: 7470,
    cgstAmount: 7470,
    dueDate: '30 days',
    status: 'Pending',
    stage: 'raised',
    invoiceDate: '2026-10-15',
    notes: 'Altruist GB Garvebhavi palya Tax Invoice.',
    clientGstin: '29AAFCA3725N1ZC',
    clientAddress: 'Garvebhavi palya, Behind RNS Motors, HGSL Chambers NO 4,5,6, Begur Hobli, Hosur Main Road, Bangalore, Hongasandra Village, Bengaluru (Bangalore) Urban, Karnataka, 560068',
    clientState: 'Karnataka',
    clientStateCode: '29',
    templateType: 'ALTRUIST_GB',
    amountInWords: 'Ninety-Seven Thousand Nine Hundred Forty only.',
    signatureImage: '/signatures/usman-zabi-digital-signature.jpg',
    items: [
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
    ],
  },
  {
    invoiceNo: 'INV-247',
    client: 'One Point One Solutions Ltd',
    projectMilestone: 'Candidate Placement & Process Billing · 14 Processes (Razorpay, TATA, ICICI, SBI, Domino\'s...)',
    amount: 57820,
    basicAmount: 49000,
    sgstAmount: 4410,
    cgstAmount: 4410,
    dueDate: '30 days',
    status: 'Pending',
    stage: 'raised',
    invoiceDate: '2026-10-15',
    notes: 'AKR Infinity 7th Mile Hosur Road candidate billing.',
    clientGstin: '29AACCD9158MIZZ',
    clientAddress: '3rd Floor, AKR Infinity, Sy No. 113, Krishna Reddy Industrial Area, 7th Mile Hosur Road Bangalore, Karnataka 560068 India.',
    clientState: 'Karnataka',
    clientStateCode: '29',
    templateType: 'ONE_POINT_ONE',
    amountInWords: 'Fifty-Seven Thousand Eight Hundred Twenty only.',
    signatureImage: '/signatures/usman-zabi-digital-signature.jpg',
    items: [
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'Razorpay', doj: 'xx/xx/xxxx', ratePerSeat: 5000, amount: 5000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'TATA Premium', doj: 'xx/xx/xxxx', ratePerSeat: 7000, amount: 7000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'TATA Standard', doj: 'xx/xx/xxxx', ratePerSeat: 7000, amount: 7000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'ICICI', doj: 'xx/xx/xxxx', ratePerSeat: 3000, amount: 3000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'SBI', doj: 'xx/xx/xxxx', ratePerSeat: 3000, amount: 3000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'JFL(domino\'s)', doj: 'xx/xx/xxxx', ratePerSeat: 3000, amount: 3000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'Ujjivan finance', doj: 'xx/xx/xxxx', ratePerSeat: 3000, amount: 3000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'Xiaomi - Hotline', doj: 'xx/xx/xxxx', ratePerSeat: 3000, amount: 3000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'Edelweiss', doj: 'xx/xx/xxxx', ratePerSeat: 3000, amount: 3000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'DRA', doj: 'xx/xx/xxxx', ratePerSeat: 3000, amount: 3000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'DMI', doj: 'xx/xx/xxxx', ratePerSeat: 3000, amount: 3000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'Chola', doj: 'xx/xx/xxxx', ratePerSeat: 3000, amount: 3000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'TMB', doj: 'xx/xx/xxxx', ratePerSeat: 3000, amount: 3000 },
      { empId: 'xxxx', employeeName: 'xxxx', phone: 'xxxx', processLob: 'Lateral (7.33% < mgr & 8.33% > mgr)', doj: 'xx/xx/xxxx', ratePerSeat: 0, amount: 0 },
    ],
  },
  {
    invoiceNo: 'INV-01',
    client: 'Radical Minds Technologies Pvt Ltd',
    projectMilestone: 'Candidate Placement & Billing · 16 Candidates',
    amount: 86140,
    basicAmount: 73000,
    sgstAmount: 6570,
    cgstAmount: 6570,
    dueDate: '30 days',
    status: 'Pending',
    stage: 'raised',
    invoiceDate: '2025-09-04',
    notes: 'Krimson Square HSR Layout candidate placement invoice.',
    clientGstin: '29AAFCR0597P1ZJ',
    clientAddress: 'Krimson Square, 31/9, Aayee Matha Temple Rd, Muneswara Nagar, Sector 6, HSR Layout, Bengaluru, Karnataka 560102',
    clientState: 'Karnataka',
    clientStateCode: '29',
    templateType: 'RADICAL_MINDS',
    amountInWords: 'Eighty Six Thousand One Hundred and Forty only.',
    signatureImage: '/signatures/usman-zabi-digital-signature.jpg',
    items: [
      { empId: 'RMB98010', employeeName: 'BINDUSHWARI B', phone: '8497811576', status: 'Active', doj: '28-April-25', ratePerSeat: 3000, amount: 3000 },
      { empId: 'RMB98022', employeeName: 'Umar Paridar', phone: '7892483114', status: 'Active', doj: '30-April-25', ratePerSeat: 3000, amount: 3000 },
      { empId: 'RNB98027', employeeName: 'Vijay Kumar', phone: '9113583897', status: 'Active', doj: '01-May-25', ratePerSeat: 3000, amount: 3000 },
      { empId: 'RMB98026', employeeName: 'Eda Begum', phone: '9380229469', status: 'Active', doj: '01-May-25', ratePerSeat: 3000, amount: 3000 },
      { empId: 'RMB98054', employeeName: 'Sandhya', phone: '9663460270', status: 'Active', doj: '15-May-25', ratePerSeat: 6000, amount: 6000 },
      { empId: 'RMB98058', employeeName: 'Janani', phone: '7411774844', status: 'Active', doj: '15-May-25', ratePerSeat: 6000, amount: 6000 },
      { empId: 'RMB98046', employeeName: 'Nandhini', phone: '9912311295', status: 'Active', doj: '12-May-25', ratePerSeat: 6000, amount: 6000 },
      { empId: 'RMB97624', employeeName: 'JHUNNU BABU', phone: '8340795702', status: 'Active', doj: '18/01/2025', ratePerSeat: 4000, amount: 4000 },
      { empId: 'RMB97756', employeeName: 'KAMALESH', phone: '7259121032', status: 'Active', doj: '6/02/2025', ratePerSeat: 4000, amount: 4000 },
      { empId: 'RMB97762', employeeName: 'SUHAIL CHOUDHARY', phone: '8744869587', status: 'Active', doj: '6/02/2025', ratePerSeat: 4000, amount: 4000 },
      { empId: 'RMB97817', employeeName: 'SIDDHRAJ', phone: '8088085997', status: 'Active', doj: '17/02/2025', ratePerSeat: 4000, amount: 4000 },
      { empId: 'RMB97883', employeeName: 'SHASHANK', phone: '6362965610', status: 'Active', doj: '12/03/2025', ratePerSeat: 6000, amount: 6000 },
      { empId: 'RMB97922', employeeName: 'MUDASSIR', phone: '9380112271', status: 'Active', doj: '10/04/2025', ratePerSeat: 4000, amount: 4000 },
      { empId: 'RMB97921', employeeName: 'NAVEED AHAMED ARNI', phone: '7892979591', status: 'Active', doj: '10/04/2025', ratePerSeat: 4000, amount: 4000 },
      { empId: 'RMB97906', employeeName: 'MOHAMMED YOUSUF', phone: '8217848124/7975119960', status: 'Active', doj: '07/04/2025', ratePerSeat: 10000, amount: 10000 },
      { empId: 'RMB97938', employeeName: 'SUNIL SAUD', phone: '8660631961', status: 'Active', doj: '12/04/2025', ratePerSeat: 3000, amount: 3000 },
    ],
  },
];

async function seedCrmInvoicesIfEmpty() {
  const count = await ClientInvoice.countDocuments({
    projectMilestone: { $exists: true, $ne: '' },
  });
  if (count === 0) {
    for (const item of SEED_INVOICES) {
      await ClientInvoice.create(item);
    }
  } else {
    // Ensure all seed client invoices exist
    for (const item of SEED_INVOICES) {
      const exists = await ClientInvoice.findOne({
        $or: [
          { invoiceNo: item.invoiceNo },
          { client: { $regex: new RegExp(`^${item.client.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } }
        ]
      });
      if (!exists) {
        await ClientInvoice.create(item);
      }
    }
  }
}

export async function GET(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!canFinance(authUser)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  await syncEligibleJoiners();
  await seedCrmInvoicesIfEmpty();

  const url = new URL(request.url);
  const stage = url.searchParams.get('stage');
  const month = url.searchParams.get('month');
  const client = url.searchParams.get('client');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');

  const filter = {};
  if (stage) filter.stage = stage;
  if (month) filter.monthKey = month;
  if (client && client !== 'ALL') {
    filter.client = { $regex: new RegExp(`^${client}$`, 'i') };
  }
  if (status && status !== 'ALL') {
    filter.status = { $regex: new RegExp(`^${status}$`, 'i') };
  }
  if (search) {
    const q = search.trim();
    filter.$or = [
      { client: { $regex: q, $options: 'i' } },
      { invoiceNo: { $regex: q, $options: 'i' } },
      { projectMilestone: { $regex: q, $options: 'i' } },
      { candidateName: { $regex: q, $options: 'i' } },
    ];
  }

  const rows = await ClientInvoice.find(filter).sort({ createdAt: -1, invoiceNo: -1 }).lean();
  return NextResponse.json(rows.map(flatten));
}

export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  if (!canFinance(authUser)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));

  // Handle Mark Paid action
  if (body.action === 'mark_paid') {
    await connectDB();
    const id = body.id || body._id;
    if (!id) return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    const updated = await ClientInvoice.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'Paid',
          stage: 'cleared',
          paidDate: todayIsoDate(),
        },
      },
      { new: true }
    );
    if (!updated) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    return NextResponse.json(flatten(updated));
  }

  // Handle Create Invoice from CRM modal
  if (body.action === 'create_invoice') {
    await connectDB();
    const client = String(body.client || '').trim();
    if (!client) return NextResponse.json({ error: 'Client / Company is required' }, { status: 400 });

    let invoiceNo = String(body.invoiceNo || '').trim();
    if (!invoiceNo) {
      const count = await ClientInvoice.countDocuments();
      invoiceNo = `INV-${String(count + 1).padStart(3, '0')}`;
    }

    const amount = Number(body.amount) || 0;
    const basicAmount = Number(body.basicAmount) || amount;
    const sgstAmount = Number(body.sgstAmount) || 0;
    const cgstAmount = Number(body.cgstAmount) || 0;
    const status = body.status === 'Paid' ? 'Paid' : 'Pending';
    const stage = status === 'Paid' ? 'cleared' : 'raised';

    const created = await ClientInvoice.create({
      invoiceNo,
      client,
      projectMilestone: String(body.projectMilestone || 'Project Milestone').trim(),
      amount,
      basicAmount,
      sgstAmount,
      cgstAmount,
      dueDate: String(body.dueDate || '10 days').trim(),
      status,
      stage,
      invoiceDate: String(body.invoiceDate || todayIsoDate()).trim(),
      paidDate: status === 'Paid' ? todayIsoDate() : '',
      clientEmail: String(body.clientEmail || '').trim(),
      clientPhone: String(body.clientPhone || '').trim(),
      clientAddress: String(body.clientAddress || '').trim(),
      clientGstin: String(body.clientGstin || '').trim(),
      clientState: String(body.clientState || 'Karnataka').trim(),
      clientStateCode: String(body.clientStateCode || '29').trim(),
      poNo: String(body.poNo || '').trim(),
      placeOfService: String(body.placeOfService || 'Bangalore').trim(),
      templateType: String(body.templateType || 'GST_INV_1').trim(),
      amountInWords: String(body.amountInWords || '').trim(),
      signatureImage: String(body.signatureImage || '/signatures/usman-zabi-digital-signature.jpg').trim(),
      items: Array.isArray(body.items) ? body.items : [],
      notes: String(body.notes || '').trim(),
    });

    return NextResponse.json(flatten(created), { status: 201 });
  }

  // Handle Edit / Update Invoice action
  if (body.action === 'edit_invoice' || body.action === 'update_invoice') {
    await connectDB();
    const id = body.id || body._id;
    if (!id) return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });

    const updateFields = {};
    if (body.projectMilestone !== undefined) updateFields.projectMilestone = String(body.projectMilestone).trim();
    if (body.amount !== undefined) {
      updateFields.amount = Number(body.amount) || 0;
      updateFields.basicAmount = Number(body.basicAmount) || updateFields.amount;
    }
    if (body.basicAmount !== undefined) updateFields.basicAmount = Number(body.basicAmount) || 0;
    if (body.sgstAmount !== undefined) updateFields.sgstAmount = Number(body.sgstAmount) || 0;
    if (body.cgstAmount !== undefined) updateFields.cgstAmount = Number(body.cgstAmount) || 0;
    if (body.dueDate !== undefined) updateFields.dueDate = String(body.dueDate).trim();
    if (body.status !== undefined) {
      updateFields.status = body.status === 'Paid' ? 'Paid' : 'Pending';
      updateFields.stage = updateFields.status === 'Paid' ? 'cleared' : 'raised';
      if (updateFields.status === 'Paid' && !body.paidDate) {
        updateFields.paidDate = todayIsoDate();
      }
    }
    if (body.invoiceDate !== undefined && String(body.invoiceDate).trim()) {
      updateFields.invoiceDate = String(body.invoiceDate).trim();
    }
    if (body.invoiceNo !== undefined && String(body.invoiceNo).trim()) {
      updateFields.invoiceNo = String(body.invoiceNo).trim();
    }
    if (body.client !== undefined) updateFields.client = String(body.client).trim();
    if (body.clientEmail !== undefined) updateFields.clientEmail = String(body.clientEmail).trim();
    if (body.clientPhone !== undefined) updateFields.clientPhone = String(body.clientPhone).trim();
    if (body.clientAddress !== undefined) updateFields.clientAddress = String(body.clientAddress).trim();
    if (body.clientGstin !== undefined) updateFields.clientGstin = String(body.clientGstin).trim();
    if (body.clientState !== undefined) updateFields.clientState = String(body.clientState).trim();
    if (body.clientStateCode !== undefined) updateFields.clientStateCode = String(body.clientStateCode).trim();
    if (body.poNo !== undefined) updateFields.poNo = String(body.poNo).trim();
    if (body.modeOfTransport !== undefined) updateFields.modeOfTransport = String(body.modeOfTransport).trim();
    if (body.vehicleNo !== undefined) updateFields.vehicleNo = String(body.vehicleNo).trim();
    if (body.dateTimeOfService !== undefined) updateFields.dateTimeOfService = String(body.dateTimeOfService).trim();
    if (body.placeOfService !== undefined) updateFields.placeOfService = String(body.placeOfService).trim();
    if (body.templateType !== undefined) updateFields.templateType = String(body.templateType).trim();
    if (body.signatureImage !== undefined) updateFields.signatureImage = String(body.signatureImage).trim();
    if (body.amountInWords !== undefined) updateFields.amountInWords = String(body.amountInWords).trim();
    if (body.items !== undefined && Array.isArray(body.items)) updateFields.items = body.items;
    if (body.notes !== undefined) updateFields.notes = String(body.notes).trim();

    const updated = await ClientInvoice.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
    if (!updated) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    return NextResponse.json(flatten(updated));
  }

  // Handle Delete Invoice action
  if (body.action === 'delete_invoice') {
    await connectDB();
    const id = body.id || body._id;
    if (!id) return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    await ClientInvoice.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Invoice deleted successfully' });
  }

  // Handle Send Reminder action
  if (body.action === 'send_reminder') {
    return NextResponse.json({
      success: true,
      message: `Payment reminder sent successfully for invoice ${body.invoiceNo || ''}`,
      sentAt: new Date().toISOString(),
    });
  }

  if (body.action === 'import') {
    await connectDB();
    const stage = ['to_raise', 'raised', 'cleared', 'gst'].includes(body.stage) ? body.stage : 'to_raise';
    const incoming = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [];
    let saved = 0;
    for (const row of incoming) {
      if (stage === 'gst') {
        const invoiceNo = String(row.invoiceNo || '').trim();
        if (!invoiceNo) continue;
        const existing = await ClientInvoice.findOne({ invoiceNo, stage: { $in: ['raised', 'cleared'] } });
        if (existing) {
          if (row.gstNumber) existing.gstNumber = String(row.gstNumber);
          if (row.basicAmount != null && row.basicAmount !== '') existing.basicAmount = Number(row.basicAmount) || 0;
          if (row.moneyReceived != null && row.moneyReceived !== '') existing.moneyReceived = Number(row.moneyReceived) || 0;
          if (row.remark) existing.remark = String(row.remark);
          if (row.client) existing.client = String(row.client);
          await existing.save();
        } else {
          await ClientInvoice.create({
            stage: 'raised',
            invoiceNo,
            client: row.client || '',
            invoiceDate: row.invoiceDate || '',
            gstNumber: row.gstNumber || '',
            basicAmount: Number(row.basicAmount) || 0,
            moneyReceived: Number(row.moneyReceived) || 0,
            remark: row.remark || '',
          });
        }
        saved += 1;
        continue;
      }
      const stageName = stage === 'cleared' || stage === 'raised' ? stage : 'to_raise';
      const candidateName = String(row.candidateName || '').trim();
      const client = String(row.client || '').trim();
      if (/^total$/i.test(candidateName) || /^total$/i.test(client)) continue;
      if (stageName === 'to_raise' && !candidateName) continue;
      if (stageName !== 'to_raise' && !client && !String(row.invoiceNo || '').trim()) continue;
      const billing = normalizeCandidateDate(row.billingDate) || '';
      await ClientInvoice.create({
        stage: stageName,
        monthKey: billing ? billing.slice(0, 7) : (body.monthKey || todayIsoDate().slice(0, 7)),
        invoiceId: '',
        candidateName,
        phone: String(row.phone || ''),
        client,
        joiningDate: normalizeCandidateDate(row.joiningDate) || '',
        billingDate: billing,
        recruiter: String(row.recruiter || ''),
        bi: Number(row.bi) || 0,
        ai: Number(row.ai) || 0,
        status: String(row.status || ''),
        candidateCount: Number(row.candidateCount) || (stageName === 'to_raise' ? 0 : 1),
        invoiceDate: String(row.invoiceDate || ''),
        revisedRequested: String(row.revisedRequested || ''),
        revisedSent: String(row.revisedSent || ''),
        invoiceNo: String(row.invoiceNo || ''),
        gstStatus: String(row.gstStatus || ''),
        gstAmtStatus: String(row.gstAmtStatus || ''),
      });
      saved += 1;
    }
    return NextResponse.json({ saved });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  await connectDB();

  if (parsed.data.action === 'raise') {
    const ids = parsed.data.ids || [];
    if (!ids.length) return NextResponse.json({ error: 'Select at least one row' }, { status: 400 });
    const rows = await ClientInvoice.find({
      _id: { $in: ids },
      stage: 'to_raise',
      $or: [{ invoiceId: '' }, { invoiceId: null }, { invoiceId: { $exists: false } }],
    });
    if (!rows.length) return NextResponse.json({ error: 'No open to-raise rows found' }, { status: 400 });
    const client = rows[0].client || '';
    if (rows.some((r) => (r.client || '') !== client)) {
      return NextResponse.json({ error: 'Raise one client at a time' }, { status: 400 });
    }
    const bi = rows.reduce((s, r) => s + (Number(r.bi) || 0), 0);
    const ai = rows.reduce((s, r) => s + (Number(r.ai) || 0), 0);
    const created = await ClientInvoice.create({
      stage: 'raised',
      client,
      monthKey: rows[0].monthKey || '',
      candidateCount: rows.length,
      bi,
      ai,
      invoiceDate: parsed.data.invoiceDate || '',
      revisedRequested: parsed.data.revisedRequested || '',
      revisedSent: parsed.data.revisedSent || '',
      invoiceNo: parsed.data.invoiceNo || '',
      status: parsed.data.status || '',
      joinerIds: rows.map((r) => r.joinerId).filter(Boolean),
    });
    const invoiceId = created._id.toString();
    await ClientInvoice.updateMany(
      { _id: { $in: rows.map((r) => r._id) } },
      { $set: { invoiceId } }
    );
    return NextResponse.json(flatten(created), { status: 201 });
  }

  const monthKey = parsed.data.monthKey || todayIsoDate().slice(0, 7);
  const created = await ClientInvoice.create({
    stage: 'to_raise',
    monthKey,
    client: parsed.data.client || '',
    candidateName: parsed.data.candidateName || '',
    phone: parsed.data.phone || '',
    joiningDate: parsed.data.joiningDate || '',
    billingDate: parsed.data.billingDate || '',
    recruiter: parsed.data.recruiter || '',
    bi: parsed.data.bi || 0,
    ai: parsed.data.ai || 0,
    status: parsed.data.status || '',
  });
  return NextResponse.json(flatten(created), { status: 201 });
}
