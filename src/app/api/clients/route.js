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
  {
    name: 'ISON XPERIENCES INDIA PRIVATE LIMITED',
    contactPerson: 'Sudheesh Kumar, Maqsood Khan, Navaneetha Krishnan, Preethi S.',
    email: 'sudheesh.kumar@isonxperiences.com, maqsood.khan@isonxperiences.com, navaneetha.krishnan@isonxperiences.com, Preethi.s@isonxperiences.com',
    phone: '+91 80 4912 3400',
    gstin: '29AADCI1246E1ZT',
    address: 'Building No. H208, 1st & 2nd Floor, 36/5 Somyasundarpalya, 27th Main Road, Sector 2 HSR Layout, Bengaluru, Karnataka-560102',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'Customer Experience & BPO Services',
    paymentTerms: 'Net 30',
    templateType: 'GST_INV_1',
    notes: 'Official Form GST INV – 1 candidate placement and seat billing partner.',
    status: 'Active',
  },
  {
    name: 'Five Splash Infotech Pvt. Ltd- Bangalore',
    contactPerson: 'Jyotiranjan Nayak',
    email: 'jyotiranjan.nayak@fivesdigital.com',
    phone: '+91 80 4600 5000',
    gstin: '29AABCF3991K1Z5',
    address: '46/4, Novel Tech Park, Hosur Rd, Kudlugate, Krishna Reddy Industrial Area, Behind HSR, Bengaluru, Karnataka 560068.',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'BPO & IT Enabled Services',
    paymentTerms: 'Net 30',
    templateType: 'FIVE_SPLASH',
    notes: 'Fives Digital / Five Splash Novel Tech Park candidate placement & process billing.',
    status: 'Active',
  },
  {
    name: 'Altruist Technologies Pvt. Ltd.',
    contactPerson: 'Jyotiranjan Nayak, Hiring Partner BLR',
    email: 'jyotiranjan.nayak@altruistindia.com, Hiringpartner.blr@altruistindia.com',
    phone: '+91 80 4900 1200',
    gstin: '29AAFCA3725N1ZC',
    address: 'AKR Tech Park, 46/1, NH 44, near Krishna Reddy Industrial Area, Kudlu Gate, Bengaluru – 560068.',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'BPO & Telecom VAS',
    paymentTerms: 'Net 30',
    templateType: 'ALTRUIST',
    notes: 'Altruist AKR Tech Park Kudlu Gate process placement & seat billing.',
    status: 'Active',
  },
  {
    name: 'Altruist GB',
    contactPerson: 'Abhilash Nair, Prachi Kadam',
    email: 'Abhilash.Nair@altruistindia.com, prachi.kadam@altruistindia.com',
    phone: '+91 80 4900 1250',
    gstin: '29AAFCA3725N1ZC',
    address: 'Garvebhavi palya, Behind RNS Motors, HGSL Chambers NO 4,5,6, Begur Hobli, Hosur Main Road, Bangalore, Hongasandra Village, Bengaluru (Bangalore) Urban, Karnataka, 560068',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'BPO & Telecom VAS',
    paymentTerms: 'Net 30',
    templateType: 'ALTRUIST_GB',
    notes: 'Altruist Garvebhavi palya branch process placement & seat billing.',
    status: 'Active',
  },
  {
    name: 'One Point One Solutions Ltd',
    contactPerson: 'Sandeep K., Shibabrata Lenka',
    email: 'Sandeep.k@1point1.com, shibabrata.lenka@1point1.com',
    phone: '+91 80 6790 3300',
    gstin: '29AACCD9158MIZZ',
    address: '3rd Floor, AKR Infinity, Sy No. 113, Krishna Reddy Industrial Area, 7th Mile Hosur Road Bangalore, Karnataka 560068 India.',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'BPO & Customer Experience',
    paymentTerms: 'Net 30',
    templateType: 'ONE_POINT_ONE',
    notes: 'AKR Infinity 7th Mile Hosur Road candidate billing.',
    status: 'Active',
  },
  {
    name: 'Radical Minds Technologies Pvt Ltd',
    contactPerson: 'Vishal Yadawad, Rupak Chatterjee',
    email: 'vishal.yadawad@radicalminds.net, rupak.chatterjee@radicalminds.net',
    phone: '+91 80 4321 8800',
    gstin: '29AAFCR0597P1ZJ',
    address: 'Krimson Square, 31/9, Aayee Matha Temple Rd, Muneswara Nagar, Sector 6, HSR Layout, Bengaluru, Karnataka 560102',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'BPO & Customer Management Services',
    paymentTerms: 'Net 30',
    templateType: 'RADICAL_MINDS',
    notes: 'HSR Layout Krimson Square candidate placement billing.',
    status: 'Active',
  },
  {
    name: 'Startek',
    contactPerson: 'Rohit Pal, Sangana Bala',
    email: 'rohit.pal@startek.com, Sangana.bala@startek.com',
    phone: '+91 80 4000 6000',
    gstin: '29AAECS4930J1ZO',
    address: 'Novel Tech Park, 46/4, Garvebhavipalya, Kudlu Gate, Bengaluru, Karnataka 560068',
    state: 'Karnataka',
    stateCode: '29',
    industry: 'BPO & Customer Experience',
    paymentTerms: 'Net 30',
    templateType: 'MODERN',
    notes: 'Startek Bangalore Operations candidate placement billing.',
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
    } else {
      // Ensure all official client templates & contacts are seeded and updated
      for (const cl of INITIAL_CLIENTS) {
        await ClientCompany.findOneAndUpdate(
          { name: { $regex: new RegExp(`^${cl.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } },
          { $set: { email: cl.email, contactPerson: cl.contactPerson } },
          { upsert: true, new: true }
        );
      }
    }
    const clients = await ClientCompany.find({}).sort({ name: 1 }).lean();
    // Guarantee strict deduplication by normalized lowercase name
    const seenNames = new Map();
    for (const c of clients) {
      const key = String(c.name || '').trim().toLowerCase();
      if (!key) continue;
      if (!seenNames.has(key)) {
        seenNames.set(key, flatten(c));
      }
    }
    return NextResponse.json(Array.from(seenNames.values()));
  } catch (err) {
    console.error('Error fetching clients:', err);
    const seenFallback = new Map();
    INITIAL_CLIENTS.forEach((c, i) => {
      const key = c.name.trim().toLowerCase();
      if (!seenFallback.has(key)) {
        seenFallback.set(key, { ...c, id: `seed-${i}`, _id: `seed-${i}` });
      }
    });
    return NextResponse.json(Array.from(seenFallback.values()));
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

export async function DELETE(request) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  }
  if (!requireRole(authUser, ['admin', 'super_admin', 'finance'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const name = url.searchParams.get('name');

    await connectDB();
    if (id && id !== 'undefined') {
      await ClientCompany.findByIdAndDelete(id);
    } else if (name) {
      await ClientCompany.findOneAndDelete({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    } else {
      return NextResponse.json({ error: 'Client ID or name required' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Client deleted successfully' });
  } catch (err) {
    console.error('Error deleting client:', err);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}

