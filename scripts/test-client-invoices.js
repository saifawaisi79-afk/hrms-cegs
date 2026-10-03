import { joinerBillEligible, gstBreakdown, addIsoDays } from '../src/lib/client-invoice-rules.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const today = '2026-10-03';
const early = joinerBillEligible({ dateOfJoining: '01/09/2026', week1: 'working' }, today);
assert(early === null, 'under 56 days stays off the bill');

const due = joinerBillEligible({
  dateOfJoining: '01/06/2026',
  billingDate: '01/08/2026',
  week8: 'working',
}, today);
assert(due && due.monthKey === '2026-08', 'billing month comes from billing date');
assert(due.joiningDate === '2026-06-01', 'joining date normalized');

const left = joinerBillEligible({
  dateOfJoining: '01/06/2026',
  week4: 'resigned',
}, today);
assert(left === null, 'resigned joiner is not billed');

assert(addIsoDays('2026-06-01', 56) === '2026-07-27', '56 days from 1 Jun is 27 Jul');

const gst = gstBreakdown(24000, 21600);
assert(gst.gstAmount === 4320, '18% GST');
assert(gst.totalInvoice === 28320, 'basic + GST');
assert(gst.tdsAmount === 2400, '10% TDS on basic');
assert(gst.needToReceive === 21600, 'need = basic - TDS');
assert(gst.diff === 0, 'diff is need minus received');

console.log('client invoice rules passed');
