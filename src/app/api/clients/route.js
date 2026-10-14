import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ClientCompany from '@/lib/models/ClientCompany';
import { getAuthUser, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const INITIAL_CLIENTS = [
  {
    name: 'Apex Corp',
    contactPerson: 'John Vance',
    email: 'billing@apexcorp.com',
    phone: '+91 98201 44521',
    gstin: '29ABCDE1234F1Z5',
    address: 'Indiranagar 100ft Road, Bengaluru, KA 560038',
    industry: 'Branding & Technology',
    paymentTerms: 'Net 30',
    notes: 'Primary retainer client for brand identity and tech delivery.',
    status: 'Active',
  },
  {
    name: 'Nexus Media',
    contactPerson: 'Sarah Jenkins',
    email: 'finance@nexusmedia.com',
    phone: '+91 97110 33912',
    gstin: '27AAFCN5678H1Z2',
    address: 'BKC Bandra East, Mumbai, MH 400051',
    industry: 'Digital Media & Production',
    paymentTerms: 'Net 15',
    notes: 'Video marketing and media distribution partner.',
    status: 'Active',
  },
  {
    name: 'Starlight Tech',
    contactPerson: 'Rajiv Menon',
    email: 'accounts@starlighttech.io',
    phone: '+91 99400 88214',
    gstin: '33AABCS9012K1Z9',
    address: 'OMR Cyber Towers, Chennai, TN 600096',
    industry: 'Cloud Infrastructure & AI',
    paymentTerms: 'Net 30',
    notes: 'Cloud architecture and UX modernization.',
    status: 'Active',
  },
  {
    name: 'TechCorp Solutions',
    contactPerson: 'Alex Morgan',
    email: 'ap@techcorp.com',
    phone: '+91 98450 11984',
    gstin: '36AAACT4321P1Z8',
    address: 'HITEC City Phase 2, Hyderabad, TS 500081',
    industry: 'Enterprise Software',
    paymentTerms: 'Net 45',
    notes: 'Enterprise contract for developer staffing and integrations.',
    status: 'Active',
  },
  {
    name: 'CEGS Global',
    contactPerson: 'Finance Director',
    email: 'finance@cegs.in',
    phone: '+91 80 4123 9900',
    gstin: '29AAACC7788M1Z4',
    address: 'CEGS Tower, Outer Ring Road, Bengaluru, KA 560103',
    industry: 'Staffing & HR Solutions',
    paymentTerms: 'Due on Receipt',
    notes: 'Internal corporate group accounts.',
    status: 'Active',
  },
];

function flatten(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return { ...o, id: o._id?.toString(), _id: o._id?.toString() };
}

export async function GET(request) {
  try {
    await connectDB();
    let count = await ClientCompany.countDocuments();
    if (count === 0) {
      await ClientCompany.insertMany(INITIAL_CLIENTS);
    }
    const clients = await ClientCompany.find({}).sort({ name: 1 }).lean();
    return NextResponse.json(clients.map(flatten));
  } catch (err) {
    console.error('Error fetching clients:', err);
    return NextResponse.json(INITIAL_CLIENTS.map((c, i) => ({ ...c, id: `seed-${i}`, _id: `seed-${i}` })));
  }
}

export async function POST(request) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  }
  if (!requireRole(authUser, ['admin', 'super_admin', 'finance'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    await connectDB();
    const existing = await ClientCompany.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ error: 'A client company with this name already exists' }, { status: 409 });
    }

    const created = await ClientCompany.create({
      name,
      contactPerson: String(body.contactPerson || '').trim(),
      email: String(body.email || '').trim().toLowerCase(),
      phone: String(body.phone || '').trim(),
      gstin: String(body.gstin || '').trim().toUpperCase(),
      address: String(body.address || '').trim(),
      industry: String(body.industry || 'Technology & Consulting').trim(),
      paymentTerms: String(body.paymentTerms || 'Net 30').trim(),
      notes: String(body.notes || '').trim(),
      status: String(body.status || 'Active').trim(),
    });

    return NextResponse.json(flatten(created), { status: 201 });
  } catch (err) {
    console.error('Error creating client company:', err);
    return NextResponse.json({ error: 'Failed to create client company' }, { status: 500 });
  }
}
