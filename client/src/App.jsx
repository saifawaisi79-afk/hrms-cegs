import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== 
   DATA LAYER
======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ======================================== ========================================  */
const SEED_DATA = {
  users:[
    {id:1,eid:'EMP-001',name:'CEO SuperAdmin',email:'superadmin@cegs.com',role:'super_admin',deptId:1,title:'Chief Executive Officer',joined:'2024-01-15',phone:'+1 212 555 0001',emergencyPhone:'+1 212 555 9901',status:'active',salary:95000,avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=ceo',reportsTo:null,bankName:'CEGS Bank',bankAccount:'3344556677',bankIfsc:'CEGS0000123',taxId:'TX-998877-A'},
    {id:2,eid:'EMP-002',name:'Nusrath Hussain',email:'nusrath@cegs.com',role:'admin',deptId:2,title:'HR Manager',joined:'2024-03-10',phone:'+1 212 555 0002',emergencyPhone:'+1 212 555 9902',status:'active',salary:30000,avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=nusrath',reportsTo:1,bankName:'CEGS Bank',bankAccount:'8899001122',bankIfsc:'CEGS0000123',taxId:'TX-998877-HR'},
    {id:3,eid:'EMP-003',name:'Madiha Mehak',email:'madiha@cegs.com',role:'employee',deptId:2,title:'Recruiter',joined:'2024-06-01',phone:'+1 212 555 0003',emergencyPhone:'+1 212 555 9903',status:'active',salary:20000,avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=madiha',reportsTo:2,bankName:'Chase Bank',bankAccount:'1122334455',bankIfsc:'CHASUS33',taxId:'TX-112233-REC1'},
    {id:4,eid:'EMP-004',name:'Heena Beagum',email:'heena@cegs.com',role:'employee',deptId:3,title:'Billing Manager',joined:'2024-08-15',phone:'+1 212 555 0004',emergencyPhone:'+1 212 555 9904',status:'active',salary:25000,avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=heena',reportsTo:1,bankName:'Bank of America',bankAccount:'2233445566',bankIfsc:'BOFAUS33',taxId:'TX-445566-MGR'},
    {id:5,eid:'EMP-005',name:'Madhavi',email:'madhavi@cegs.com',role:'employee',deptId:2,title:'Recruiter',joined:'2024-11-20',phone:'+1 212 555 0005',emergencyPhone:'+1 212 555 9905',status:'active',salary:15000,avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=madhavi',reportsTo:2,bankName:'Wells Fargo',bankAccount:'5566778899',bankIfsc:'WFCUS33',taxId:'TX-778899-REC2'},
    {id:6,eid:'EMP-006',name:'Mohammed Raheel',email:'raheel@cegs.com',role:'employee',deptId:3,title:'Billing',joined:'2025-01-08',phone:'+1 212 555 0006',emergencyPhone:'+1 212 555 9906',status:'active',salary:25000,avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=raheel',reportsTo:4,bankName:'CitiBank',bankAccount:'6677889900',bankIfsc:'CITIUS33',taxId:'TX-889900-BIL1'},
    {id:7,eid:'EMP-007',name:'Haseeb',email:'haseeb@cegs.com',role:'employee',deptId:3,title:'Billing',joined:'2025-02-15',phone:'+1 212 555 0007',emergencyPhone:'+1 212 555 9907',status:'active',salary:15000,avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=haseeb',reportsTo:4,bankName:'Chase Bank',bankAccount:'7788990011',bankIfsc:'CHASUS33',taxId:'TX-990011-BIL2'},
  ],
  permissions: {
    super_admin: { payroll: true, attendance: true, deleteEmp: true, approveLeave: true, reports: true },
    admin: { payroll: true, attendance: true, deleteEmp: true, approveLeave: true, reports: true },
    manager: { payroll: false, attendance: true, deleteEmp: false, approveLeave: true, reports: true },
    employee: { payroll: false, attendance: false, deleteEmp: false, approveLeave: false, reports: false },
    recruiter: { payroll: false, attendance: false, deleteEmp: false, approveLeave: false, reports: true },
    finance: { payroll: true, attendance: false, deleteEmp: false, approveLeave: false, reports: true },
  },
  departments:[
    {id:1,name:'Executive',code:'EXEC',managerId:1,budget:1000000,color:'#8B5CF6'},
    {id:2,name:'Human Resources',code:'HR',managerId:2,budget:300000,color:'#3B82F6'},
    {id:3,name:'Billing & Finance',code:'FIN',managerId:4,budget:500000,color:'#10B981'},
  ],
  leaves:[
    {id:1,uid:5,type:'vacation',start:'2026-07-10',end:'2026-07-20',reason:'Summer holiday in Europe',status:'approved',applied:'2026-07-01',by:2},
    {id:2,uid:3,type:'sick',start:'2026-07-15',end:'2026-07-16',reason:'Dental procedure recovery',status:'pending',applied:'2026-07-12'},
    {id:3,uid:4,type:'personal',start:'2026-06-05',end:'2026-06-06',reason:'Moving to new apartment',status:'rejected',applied:'2026-06-01',by:2,note:'Peak billing period. Please reschedule.'},
    {id:4,uid:6,type:'casual',start:'2026-07-18',end:'2026-07-18',reason:'Family event',status:'pending',applied:'2026-07-13'},
  ],
  attendance:[
    {id:1,uid:3,date:'2026-07-06',in:'08:45',out:'17:00',status:'present',hrs:8.25},
    {id:2,uid:3,date:'2026-07-07',in:'08:50',out:'17:30',status:'present',hrs:8.67},
    {id:3,uid:3,date:'2026-07-08',in:'09:28',out:'17:00',status:'late',hrs:7.53},
    {id:4,uid:2,date:'2026-07-13',in:'08:30',out:'17:00',status:'present',hrs:8.50},
    {id:5,uid:6,date:'2026-07-13',in:'09:05',out:'17:30',status:'late',hrs:8.42},
  ],
  payroll:[
    {id:1,uid:3,month:6,year:2026,basic:20000,allowances:2000,overtime:500,bonus:0,deductions:1500,net:21000,status:'processed',date:'2026-06-30'},
    {id:2,uid:4,month:6,year:2026,basic:25000,allowances:2500,overtime:0,bonus:1000,deductions:2000,net:26500,status:'processed',date:'2026-06-30'},
    {id:3,uid:5,month:6,year:2026,basic:15000,allowances:1500,overtime:0,bonus:0,deductions:1000,net:15500,status:'processed',date:'2026-06-30'},
  ],
  timesheets:[
    {id:1,uid:3,date:'2026-07-09',project:'HR Recruitment',task:'Screened resumes for developers',hours:8,status:'approved',by:2},
    {id:2,uid:3,date:'2026-07-10',project:'HR Recruitment',task:'Conducted interviews',hours:7,status:'approved',by:2},
    {id:3,uid:4,date:'2026-07-13',project:'Billing Portal',task:'Prepared billing statements',hours:6,status:'pending'},
  ],
  assets:[
    {id:1,name:'MacBook Pro 16"',serial:'SN-MAC-998877',cat:'Laptop',status:'assigned',uid:3,condition:'Excellent',loc:'Remote'},
    {id:2,name:'Dell UltraSharp 32"',serial:'SN-DELL-776655',cat:'Monitor',status:'assigned',uid:3,condition:'Excellent',loc:'Main Office'},
  ],
  expenses:[
    {id:1,uid:3,title:'SaaS Recruitment Subscription',cat:'SaaS Tools',amount:199.50,date:'2026-07-02',status:'approved',by:2},
    {id:2,uid:4,title:'Billing Software License',cat:'SaaS Tools',amount:120.00,date:'2026-07-12',status:'pending'},
  ],
  templates:[
    {id:1,name:'Employment Verification Letter',body:'To Whom It May Concern,\n\nThis letter is to verify that {{NAME}} (Employee ID: {{EID}}) has been employed with CEGS since {{JOIN}} in the capacity of {{TITLE}}.\n\nThey remain an active and valued member of our team.\n\nSincerely,\n{{ISSUER}}\nHR Manager\nCEGS'},
    {id:2,name:'Experience Certificate',body:'Certificate of Experience\n\nThis is to certify that {{NAME}} served in the role of {{TITLE}} at CEGS from {{JOIN}} to the present date.\n\nSincerely,\n{{ISSUER}}\nHR Manager\nCEGS'},
  ],
  documents:[
    {id:1,uid:3,title:'Employment Verification - Madiha Mehak',type:'Employment Verification Letter',body:'To Whom It May Concern,\n\nThis letter is to verify that Madiha Mehak (Employee ID: EMP-003) has been employed with CEGS since 2024-06-01 in the capacity of Recruiter.\n\nThey remain an active and valued member of our team.\n\nSincerely,\nNusrath Hussain\nHR Manager\nCEGS',date:'2026-07-05'},
  ],
  onboarding:[
    {id:1,uid:6,role:'Billing Specialist',start:'2026-07-20',progress:40,status:'in_progress'},
  ],
  tasks:[
    {id:1,hid:1,task:'Submit government-issued ID & tax forms',done:1,who:'employee'},
    {id:2,hid:1,task:'Configure payroll & bank details',done:1,who:'admin'},
    {id:3,hid:1,task:'Provision laptop from IT',done:0,who:'admin'},
    {id:4,hid:1,task:'Complete orientation & read handbook',done:0,who:'employee'},
  ],
  workTasks:[
    {id:1,uid:3,title:'Screen candidates for Billing Role',desc:'Filter resumes for the billing specialist opening.',status:'completed',priority:'high',dueDate:'2026-07-13'},
  ],
  auditLogs:[
    {id:1,user:'CEO SuperAdmin',action:'Logged In',details:'System Administrator dashboard access authorized',time:'2026-07-13T09:12:00Z',ip:'192.168.1.1'},
  ],
  notifications:[
    {id:1,from:1,to:null,title:'Welcome to CEGS HRMS 2.0',msg:'The new system is live! Please update your contact info and review the Q3 policy guidelines.',read:0,at:'2026-07-13T09:00:00Z'},
  ],
  verihrmAudits:[
    {id:1,auditId:'V-332211',name:'madiha mehak',type:'Degree/Diploma',serial:'CERT-78229',institution:'Stanford University',year:2024,score:95,status:'VERIFIED',date:'7/12/2026, 11:30:00 AM'},
  ],
  settings:{
    company:{name:'CEGS Corp.',address:'42 Wall Street, Suite 1800, New York, NY 10005',phone:'+1 (212) 555-0199',email:'hr@cegs.com',website:'cegs.com',taxId:'TX-998877-A'},
    hours:{start:'10:00',end:'19:00',grace:15,days:['Mon','Tue','Wed','Thu','Fri','Sat']},
    leave:{vacation:20,sick:15,casual:10,personal:7,carryForward:true},
    payroll:{taxPct:10,pfPct:5,overtimeRate:28,payCycle:'Monthly'},
    security:{sessionTimeout:120,twoFactor:false,minPasswordLen:8},
  },
  badges: [
    { id: 1, name: 'Best Performer', emoji: '🏅', desc: 'Demonstrates outstanding productivity and results.', points: 100 }
  ],
  userBadges: [
    { id: 1, userId: 3, badgeId: 1, awardedBy: 2, awardedAt: '2026-07-10T12:00:00Z', reason: 'Outstanding delivery of recruitment targets.' }
  ],
  nominations: [
    { id: 1, nominatorId: 3, nomineeId: 5, badgeId: 1, reason: 'Fast delivery of recruitment targets.', status: 'pending', submittedAt: '2026-07-14T09:00:00Z' }
  ],
  rewardsSettings: {
    peerNominationsEnabled: true,
    requireApproval: true,
    defaultPoints: 50
  },
  jobs: [
    { id: 1, title: 'Recruiter', department: 'Human Resources', type: 'Full-time', salary: '₹50,000 - ₹70,000', reqs: '3+ years recruitment experience', status: 'open' }
  ],
  jobApplications: [
    { id: 1, userId: 3, jobId: 1, type: 'Promotion', reason: 'Applying to transition into lead recruiter role.', status: 'pending', appliedAt: '2026-07-16T10:00:00Z' }
  ],
  meetingRequests: [
    { id: 1, hostRole: 'HR Manager', subject: 'Q3 Appraisal Review Meeting', date: '2026-07-20', timeSlot: '10:00 AM - 10:30 AM', requesterId: 3, status: 'approved', createdAt: '2026-07-17T11:00:00Z' }
  ],
  notificationTemplates: [
    { id: 1, name: 'Salary Credited', title: 'Salary Credited 💰', body: 'Dear {{name}}, your salary has been successfully credited.' }
  ]
};

const Store = {
  key: k => `vp_hrms_v3_${k}`,
  get(k){ try{ const v=localStorage.getItem(this.key(k)); return v?JSON.parse(v):null; } catch{ return null; } },
  set(k,v){ try{ localStorage.setItem(this.key(k),JSON.stringify(v)); } catch{} },
  init(){
    const storedUsers = this.get('users');
    const isOld = storedUsers && !storedUsers.some(u => u.email === 'nusrath@cegs.com');
    const missingPerms = !this.get('permissions');
    if (isOld || missingPerms) {
      console.log('Old CEGS database version or missing permissions matrix detected in LocalStorage. Resetting cached workspace...');
      Object.keys(SEED_DATA).forEach(k => localStorage.removeItem(this.key(k)));
    }
    Object.keys(SEED_DATA).forEach(k=>{ if(!this.get(k)) this.set(k,SEED_DATA[k]); });
  },
  load(){ const o={}; Object.keys(SEED_DATA).forEach(k=>{ o[k]=this.get(k)||SEED_DATA[k]; }); return o; }
};
Store.init();

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   ICON LIBRARY (inline SVG)
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
const IC = ({ n, s=16, c='currentColor', style={} }) => {
  const d = {
    dashboard: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
    clock: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    database: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>,
    calendar: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    file: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    receipt: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/><polyline points="21 22 12 17 3 22"/><line x1="12" y1="7" x2="12" y2="17"/></svg>,
    check2: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>,
    monitor: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    users: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    building: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
    tree: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>,
    card: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    adduser: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
    shield: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    settings: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    bell: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    search: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    logout: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    plus: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    x: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    check: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="20 6 9 17 4 12"/></svg>,
    edit: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    eye: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    download: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    arrow: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    moon: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    help: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    map: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    trending: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    print: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
    send: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    terminal: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
    activity: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    chevron: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="6 9 12 15 18 9"/></svg>,
    star: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    briefcase: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
    video: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  };
  return d[n] || null;
};

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   ROOT APP
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function App() {
  const [db, setDb] = useState(() => Store.load());
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [search, setSearch] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const toggleDropdown = (name) => setActiveDropdown(prev => prev === name ? null : name);

  const save = useCallback((key, val) => {
    setDb(prev => { const next = {...prev,[key]:val}; Store.set(key,val); return next; });
  }, []);

  const unread = db.notifications.filter(n => !n.read && (!n.to || n.to === user?.id)).length;

  const login = (email, pass) => {
    const u = db.users.find(x => x.email.toLowerCase() === email.toLowerCase());
    if (u && (pass==='Password123'||pass==='admin123'||pass==='emp123')) {
      save('users', db.users.map(x => x.id===u.id ? {...x,lastLogin:new Date().toISOString()} : x));
      setUser(u); setView('dashboard'); return true;
    }
    alert('Invalid credentials.\nUse Password123 or click a portal card for instant access.');
    return false;
  };
  const logout = () => { setUser(null); setView('login'); };

  if (view==='login' || !user) return <LoginPage login={login} db={db} />;

  const isHR = user.role==='admin';
  const isSA = user.role==='super_admin';
  const isEmp = user.role==='employee';

  const getUserPermissionRole = (u) => {
    if (!u) return 'employee';
    if (u.role === 'super_admin') return 'super_admin';
    if (u.role === 'admin') return 'admin';
    const title = (u.title || '').toLowerCase();
    if (title.includes('manager')) return 'manager';
    if (title.includes('recruiter')) return 'recruiter';
    if (title.includes('billing') || title.includes('finance') || title.includes('accounts')) return 'finance';
    return 'employee';
  };

  const currentPermRole = user ? getUserPermissionRole(user) : 'employee';
  const userPerms = (db.permissions && db.permissions[currentPermRole]) || {
    payroll: user ? (user.role === 'super_admin' || user.role === 'admin' || user.title?.toLowerCase().includes('billing')) : false,
    attendance: user ? (user.role === 'super_admin' || user.role === 'admin' || user.title?.toLowerCase().includes('manager')) : false,
    deleteEmp: user ? (user.role === 'super_admin' || user.role === 'admin') : false,
    approveLeave: user ? (user.role === 'super_admin' || user.role === 'admin' || user.title?.toLowerCase().includes('manager')) : false,
    reports: user ? (user.role === 'super_admin' || user.role === 'admin' || user.title?.toLowerCase().includes('recruiter') || user.title?.toLowerCase().includes('billing')) : false,
  };
  const canViewGlobalPayroll = userPerms.payroll;
  const canEditAttendance = userPerms.attendance;
  const canDeleteEmployee = userPerms.deleteEmp;
  const canApproveLeaves = userPerms.approveLeave;
  const canAccessReports = userPerms.reports;

  const pages = {
    dashboard: <DashboardPage db={db} save={save} user={user} setView={setView} />,
    employees: <EmployeesPage db={db} save={save} user={user} />,
    departments: <DepartmentsPage db={db} save={save} user={user} />,
    orgchart: <OrgChartPage db={db} />,
    leaves: <LeavesPage db={db} save={save} user={user} />,
    attendance: <AttendancePage db={db} save={save} user={user} />,
    payroll: <PayrollPage db={db} save={save} user={user} />,
    timesheets: <TimesheetsPage db={db} save={save} user={user} />,
    assets: <AssetsPage db={db} save={save} user={user} />,
    expenses: <ExpensesPage db={db} save={save} user={user} />,
    documents: <DocumentsPage db={db} save={save} user={user} />,
    onboarding: <OnboardingPage db={db} save={save} user={user} />,
    notifications: <NotificationsPage db={db} save={save} user={user} />,
    users: <UsersPage db={db} save={save} user={user} />,
    settings: <SettingsPage db={db} save={save} user={user} />,
    tasks: <TasksPage db={db} save={save} user={user} />,
    auditlogs: <AuditLogsPage db={db} save={save} user={user} />,
    backups: <BackupsPage db={db} save={save} user={user} />,
    systemhealth: <SystemHealthPage db={db} save={save} user={user} />,
    apimonitor: <APIMonitorPage db={db} save={save} user={user} />,
    queryterminal: <QueryTerminalPage db={db} save={save} user={user} />,
    auditor: <CredentialAuditorPage db={db} save={save} user={user} />,
    
    // Portal Specific custom pages
    organizations: <OrganizationsPage db={db} save={save} user={user} />,
    permissions: <PermissionsPage db={db} save={save} user={user} />,
    policies: <PoliciesPage />,
    workflows: <WorkflowsPage />,
    integrations: <IntegrationsPage />,
    security: <SecurityPage />,
    reports: <ReportsPage />,
    recruitment: <RecruitmentPage />,
    performance: <PerformancePage user={user} />,
    learning: <LearningPage />,
    helpdesk: <HelpdeskPage user={user} />,
    exit: <ExitPage />,
    directory: <DirectoryPage db={db} />,
    announcements: <AnnouncementsPage db={db} />,
    profile: <ProfilePage db={db} save={save} user={user} />,
    rewards: <RewardsPage db={db} save={save} user={user} />,
    jobs: <InternalJobPortalPage db={db} save={save} user={user} />,
    meetings: <MeetingSchedulerPage db={db} save={save} user={user} />,
  };

  const Nav = ({v,icon,label,badge}) => (
    <div className={`nav-item ${view===v?'active':''}`} onClick={()=>setView(v)}>
      <IC n={icon} s={15} className="nav-icon" />
      <span style={{flex:1}}>{label}</span>
      {badge && <span className="nav-badge">{badge}</span>}
    </div>
  );

  const pendingLeaves = db.leaves.filter(l=>l.status==='pending').length;

  return (
    <div className="app-shell" onClick={() => setActiveDropdown(null)}>
      <header className="cegs-header" onClick={(e) => e.stopPropagation()}>
        <div className="header-left">
          <div className="cegs-logo-capsule" onClick={() => setView('dashboard')} style={{ cursor: 'pointer' }}>
            CEGS<span>OS</span>
          </div>
        </div>

        <div className="header-center">
          <div className="nav-capsule-bar">
            {/* MAIN DROPDOWN */}
            <div className="nav-dropdown-wrapper">
              <button 
                className={`nav-capsule-btn ${activeDropdown === 'main' ? 'active' : ''}`} 
                onClick={(e) => { e.stopPropagation(); toggleDropdown('main'); }}
              >
                <span>Main</span>
                <IC n="chevron" s={10} />
              </button>
              {activeDropdown === 'main' && (
                <div className="nav-dropdown-menu">
                  {isSA && <>
                    <div className="dropdown-item" onClick={() => { setView('dashboard'); setActiveDropdown(null); }}><IC n="dashboard" /> Dashboard</div>
                    <div className="dropdown-item" onClick={() => { setView('users'); setActiveDropdown(null); }}><IC n="users" /> Users</div>
                    <div className="dropdown-item" onClick={() => { setView('settings'); setActiveDropdown(null); }}><IC n="settings" /> System Settings</div>
                  </>}
                  {isHR && <>
                    <div className="dropdown-item" onClick={() => { setView('dashboard'); setActiveDropdown(null); }}><IC n="dashboard" /> Dashboard</div>
                    <div className="dropdown-item" onClick={() => { setView('employees'); setActiveDropdown(null); }}><IC n="users" /> Employees</div>
                    {canAccessReports && <div className="dropdown-item" onClick={() => { setView('reports'); setActiveDropdown(null); }}><IC n="trending" /> Reports</div>}
                    <div className="dropdown-item" onClick={() => { setView('helpdesk'); setActiveDropdown(null); }}><IC n="help" /> Help Desk</div>
                  </>}
                  {isEmp && <>
                    <div className="dropdown-item" onClick={() => { setView('dashboard'); setActiveDropdown(null); }}><IC n="dashboard" /> Dashboard</div>
                    <div className="dropdown-item" onClick={() => { setView('profile'); setActiveDropdown(null); }}><IC n="users" /> My Profile</div>
                    <div className="dropdown-item" onClick={() => { setView('directory'); setActiveDropdown(null); }}><IC n="users" /> Directory</div>
                    <div className="dropdown-item" onClick={() => { setView('announcements'); setActiveDropdown(null); }}><IC n="bell" /> Announcements</div>
                    <div className="dropdown-item" onClick={() => { setView('helpdesk'); setActiveDropdown(null); }}><IC n="help" /> Help Desk</div>
                    <div className="dropdown-item" onClick={() => { setView('exit'); setActiveDropdown(null); }}><IC n="logout" /> Exit</div>
                  </>}
                </div>
              )}
            </div>

            {/* CAMPAIGN HUB DROPDOWN */}
            <div className="nav-dropdown-wrapper">
              <button 
                className={`nav-capsule-btn ${activeDropdown === 'campaign' ? 'active' : ''}`} 
                onClick={(e) => { e.stopPropagation(); toggleDropdown('campaign'); }}
              >
                <span>Campaign Hub</span>
                <IC n="chevron" s={10} />
              </button>
              {activeDropdown === 'campaign' && (
                <div className="nav-dropdown-menu">
                  {isSA && <>
                    <div className="dropdown-item" onClick={() => { setView('workflows'); setActiveDropdown(null); }}><IC n="activity" /> Workflows</div>
                    {canAccessReports && <div className="dropdown-item" onClick={() => { setView('reports'); setActiveDropdown(null); }}><IC n="trending" /> Reports</div>}
                    <div className="dropdown-item" onClick={() => { setView('rewards'); setActiveDropdown(null); }}><IC n="star" /> Rewards & Recognition</div>
                    <div className="dropdown-item" onClick={() => { setView('jobs'); setActiveDropdown(null); }}><IC n="briefcase" /> Internal Job Portal</div>
                    <div className="dropdown-item" onClick={() => { setView('meetings'); setActiveDropdown(null); }}><IC n="video" /> Meeting Scheduler</div>
                  </>}
                  {isHR && <>
                    <div className="dropdown-item" onClick={() => { setView('recruitment'); setActiveDropdown(null); }}><IC n="adduser" /> Recruitment</div>
                    <div className="dropdown-item" onClick={() => { setView('onboarding'); setActiveDropdown(null); }}><IC n="file" /> Onboarding</div>
                    <div className="dropdown-item" onClick={() => { setView('performance'); setActiveDropdown(null); }}><IC n="trending" /> Performance</div>
                    <div className="dropdown-item" onClick={() => { setView('learning'); setActiveDropdown(null); }}><IC n="help" /> Training</div>
                    <div className="dropdown-item" onClick={() => { setView('rewards'); setActiveDropdown(null); }}><IC n="star" /> Rewards & Recognition</div>
                    <div className="dropdown-item" onClick={() => { setView('jobs'); setActiveDropdown(null); }}><IC n="briefcase" /> Internal Job Portal</div>
                    <div className="dropdown-item" onClick={() => { setView('meetings'); setActiveDropdown(null); }}><IC n="video" /> Meeting Scheduler</div>
                  </>}
                  {isEmp && <>
                    <div className="dropdown-item" onClick={() => { setView('performance'); setActiveDropdown(null); }}><IC n="trending" /> Performance</div>
                    <div className="dropdown-item" onClick={() => { setView('learning'); setActiveDropdown(null); }}><IC n="help" /> Learning</div>
                    <div className="dropdown-item" onClick={() => { setView('timesheets'); setActiveDropdown(null); }}><IC n="file" /> Timesheets</div>
                    {canAccessReports && <div className="dropdown-item" onClick={() => { setView('reports'); setActiveDropdown(null); }}><IC n="trending" /> Reports</div>}
                    <div className="dropdown-item" onClick={() => { setView('rewards'); setActiveDropdown(null); }}><IC n="star" /> Rewards & Recognition</div>
                    <div className="dropdown-item" onClick={() => { setView('jobs'); setActiveDropdown(null); }}><IC n="briefcase" /> Internal Job Portal</div>
                    <div className="dropdown-item" onClick={() => { setView('meetings'); setActiveDropdown(null); }}><IC n="video" /> Meeting Scheduler</div>
                  </>}
                </div>
              )}
            </div>

            {/* BILLING & SUPPORT DROPDOWN */}
            <div className="nav-dropdown-wrapper">
              <button 
                className={`nav-capsule-btn ${activeDropdown === 'billing' ? 'active' : ''}`} 
                onClick={(e) => { e.stopPropagation(); toggleDropdown('billing'); }}
              >
                <span>Billing & Support</span>
                <IC n="chevron" s={10} />
              </button>
              {activeDropdown === 'billing' && (
                <div className="nav-dropdown-menu">
                  {isSA && <>
                    <div className="dropdown-item" onClick={() => { setView('organizations'); setActiveDropdown(null); }}><IC n="building" /> Organizations</div>
                    <div className="dropdown-item" onClick={() => { setView('permissions'); setActiveDropdown(null); }}><IC n="shield" /> Roles & Permissions</div>
                    <div className="dropdown-item" onClick={() => { setView('departments'); setActiveDropdown(null); }}><IC n="building" /> Departments</div>
                    <div className="dropdown-item" onClick={() => { setView('policies'); setActiveDropdown(null); }}><IC n="file" /> Policies</div>
                    <div className="dropdown-item" onClick={() => { setView('integrations'); setActiveDropdown(null); }}><IC n="settings" /> Integrations</div>
                    <div className="dropdown-item" onClick={() => { setView('auditlogs'); setActiveDropdown(null); }}><IC n="file" /> Audit Logs</div>
                    <div className="dropdown-item" onClick={() => { setView('security'); setActiveDropdown(null); }}><IC n="shield" /> Security</div>
                  </>}
                  {isHR && <>
                    {canEditAttendance && <div className="dropdown-item" onClick={() => { setView('attendance'); setActiveDropdown(null); }}><IC n="clock" /> Attendance</div>}
                    {canApproveLeaves && <div className="dropdown-item" onClick={() => { setView('leaves'); setActiveDropdown(null); }}><IC n="calendar" /> Leave {pendingLeaves > 0 && <span className="nav-badge" style={{ display: 'inline-flex', marginLeft: 6, position: 'static' }}>{pendingLeaves}</span>}</div>}
                    {canViewGlobalPayroll && <div className="dropdown-item" onClick={() => { setView('payroll'); setActiveDropdown(null); }}><IC n="card" /> Payroll</div>}
                    <div className="dropdown-item" onClick={() => { setView('documents'); setActiveDropdown(null); }}><IC n="file" /> Documents</div>
                    <div className="dropdown-item" onClick={() => { setView('assets'); setActiveDropdown(null); }}><IC n="monitor" /> Assets</div>
                    <div className="dropdown-item" onClick={() => { setView('auditor'); setActiveDropdown(null); }}><IC n="shield" /> Compliance</div>
                  </>}
                  {isEmp && <>
                    <div className="dropdown-item" onClick={() => { setView('attendance'); setActiveDropdown(null); }}><IC n="clock" /> Attendance</div>
                    <div className="dropdown-item" onClick={() => { setView('leaves'); setActiveDropdown(null); }}><IC n="calendar" /> Leave</div>
                    <div className="dropdown-item" onClick={() => { setView('payroll'); setActiveDropdown(null); }}><IC n="card" /> Payroll</div>
                    <div className="dropdown-item" onClick={() => { setView('documents'); setActiveDropdown(null); }}><IC n="file" /> Documents</div>
                    <div className="dropdown-item" onClick={() => { setView('assets'); setActiveDropdown(null); }}><IC n="monitor" /> Assets</div>
                  </>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="header-right">
          <button className="cegs-btn-setting" onClick={() => setView('settings')}>
            <IC n="settings" s={14} />
            <span>Setting</span>
          </button>
          <button className="cegs-btn-bell" onClick={() => setView('notifications')}>
            <IC n="bell" s={15} />
            <span className="cegs-bell-blue-dot" />
          </button>
          <button className="cegs-btn-avatar" onClick={() => setView(isEmp ? 'profile' : 'dashboard')}>
            {user.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0, 2) || 'JD'}
          </button>
        </div>
      </header>

      <div className="main-area">
        <main className="page-content anim-fadein" key={view}>
          {pages[view] || pages.dashboard}
        </main>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   LOGIN / WORKSPACE PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function LoginPage({ login, db }) {
  const checkNetworkWhitelist = async () => {
    const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5001' : '';
    try {
      const res = await fetch(`${API_BASE}/auth/check-ip`);
      if (res.status === 403) {
        const data = await res.json();
        alert(data.error || 'Access denied. Please connect to the office network to log in.');
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Connection to backend whitelist check failed:', err);
      // In local offline mode or connection issues, default to proceed
      return true;
    }
  };

  const [mode, setMode] = useState('portal'); // portal | creds
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const quickLogin = async role => {
    const isWhitelisted = await checkNetworkWhitelist();
    if (!isWhitelisted) return;
    const map = {employee:'madiha@cegs.com',admin:'nusrath@cegs.com',super_admin:'superadmin@cegs.com'};
    setLoading(role);
    await new Promise(r=>setTimeout(r,400));
    login(map[role],'Password123');
    setLoading(false);
  };

  const handleCreds = async e => {
    e.preventDefault(); 
    const isWhitelisted = await checkNetworkWhitelist();
    if (!isWhitelisted) return;
    setLoading('creds');
    await new Promise(r=>setTimeout(r,400));
    login(email,pass); setLoading(false);
  };

  if (mode==='creds') return (
    <div className="login-scene anim-fadein">
      <div className="login-art">
        <div style={{position:'relative',zIndex:1,width:'100%'}}>
          <div style={{fontFamily:'Outfit',fontSize:12,fontWeight:800,textTransform:'uppercase',letterSpacing:'2px',color:'var(--amber)',marginBottom:12}}>CEGS Portal HRMS</div>
          <div className="login-art-title">The Modern<br/>Workforce Platform</div>
          <div className="login-art-sub">Role-based portals, real-time analytics, and complete workforce management in one system.</div>
          <div className="login-art-grid">
            {[['6','Active Portals'],['16','HR Modules'],['100%','Data Integrity'],['24/7','Availability']].map(([v,l])=>(
              <div key={l} className="login-art-stat">
                <div className="login-art-stat-val">{v}</div>
                <div className="login-art-stat-lab">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="login-form-side">
        <div className="login-box anim-fadeup">
          <div className="login-brand">
            <div className="login-brand-icon">C</div>
            <span>CEGS<span>Portal</span></span>
          </div>
          <div className="login-h">Welcome back</div>
          <div className="login-p">Sign in to your workspace</div>
          <form onSubmit={handleCreds}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" autoFocus required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="------------" required />
            </div>
            <button type="submit" className="btn btn-dark" style={{width:'100%',height:46,fontSize:14,marginTop:8}} disabled={loading==='creds'}>
              {loading==='creds' ? 'Signing In...' : 'Access Dashboard'} <IC n="arrow" s={16} />
            </button>
          </form>
          <div className="login-back" onClick={()=>setMode('portal')}>← Back to workspace selection</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="ws-root">
      <div className="ws-eyebrow"><span className="ws-eyebrow-dot"/>&nbsp; System Online · All modules operational</div>
      <div className="ws-brand">
        <div className="ws-brand-icon">C</div>
        <div className="ws-brand-name">CEGS<span>Portal</span></div>
      </div>
      <h1 className="ws-headline">Choose your <span className="highlight">workspace</span></h1>
      <p className="ws-sub">Select a portal to access your personalised dashboard and tools. Each role provides tailored modules and permissions.</p>

      <div className="ws-grid stagger">
        {/* Employee Portal */}
        <div className="pc pc-cream anim-fadeup" onClick={()=>quickLogin('employee')}>
          <div className="pc-top">
            <div className="pc-icon"><IC n="monitor" s={28} /></div>
            <span className="pc-pill pill-blue">Employee Portal</span>
          </div>
          <div className="pc-body">
            <div className="pc-name">CEGS-OS</div>
            <p className="pc-desc">Access attendance tracking, leave requests, timesheet logging, expense claims, asset inventory and download your payslips.</p>
            <button className="pc-cta" disabled={loading==='employee'}>
              {loading==='employee' ? 'Opening...' : <><span>OPEN PORTAL</span> <IC n="arrow" s={15} /></>}
            </button>
          </div>
        </div>

        {/* HR Admin */}
        <div className="pc pc-dark anim-fadeup" onClick={()=>quickLogin('admin')}>
          <div className="pc-top">
            <div className="pc-icon"><IC n="settings" s={28} /></div>
            <span className="pc-pill pill-amber">HR Admin Panel</span>
          </div>
          <div className="pc-body">
            <div className="pc-name">CEGS-Core</div>
            <p className="pc-desc">Manage the employee directory, approve leave and expenses, run payroll cycles, onboard new hires and review timesheets.</p>
            <button className="pc-cta" disabled={loading==='admin'}>
              {loading==='admin' ? 'Opening...' : <><span>OPEN PANEL</span> <IC n="arrow" s={15} /></>}
            </button>
          </div>
        </div>

        {/* Super Admin */}
        <div className="pc pc-void anim-fadeup" onClick={()=>quickLogin('super_admin')}>
          <div className="pc-top">
            <div className="pc-icon"><IC n="shield" s={28} /></div>
            <span className="pc-pill pill-white">Super Admin</span>
          </div>
          <div className="pc-body">
            <div className="pc-name">CEGS-Shield</div>
            <p className="pc-desc">Full system control. Manage user roles, configure policies, permission matrices, audit logs and all system-wide settings.</p>
            <button className="pc-cta" disabled={loading==='super_admin'}>
              {loading==='super_admin' ? 'Opening...' : <><span>SYSTEM ACCESS</span> <IC n="arrow" s={15} /></>}
            </button>
          </div>
        </div>
      </div>

      <span className="ws-footer-link" onClick={()=>setMode('creds')}>Sign in with custom credentials instead</span>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   PAGE HEADER COMPONENT
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function PageHdr({ title, sub, children }) {
  return (
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28,gap:16,flexWrap:'wrap'}}>
      <div>
        <div className="page-title">{title}</div>
        {sub && <div className="page-subtitle">{sub}</div>}
      </div>
      {children && <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{children}</div>}
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   MODAL COMPONENT
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function Modal({ open, onClose, title, subtitle, children }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-hdr">
          <div>
            <div className="modal-title">{title}</div>
            {subtitle && <div className="modal-subtitle">{subtitle}</div>}
          </div>
          <button className="modal-close" onClick={onClose}><IC n="x" s={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DashboardPage({ db, save, user, setView }) {
  const getUserPermissionRole = (u) => {
    if (!u) return 'employee';
    if (u.role === 'super_admin') return 'super_admin';
    if (u.role === 'admin') return 'admin';
    const title = (u.title || '').toLowerCase();
    if (title.includes('manager')) return 'manager';
    if (title.includes('recruiter')) return 'recruiter';
    if (title.includes('billing') || title.includes('finance') || title.includes('accounts')) return 'finance';
    return 'employee';
  };
  const currentPermRole = getUserPermissionRole(user);
  const userPerms = db.permissions?.[currentPermRole] || {};
  const isAdmin = userPerms.reports || userPerms.payroll || userPerms.approveLeave || ['admin', 'super_admin'].includes(user.role);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Personal Info Form State
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    email: user.email || '',
    phone: user.phone || '',
    bio: user.bio || 'UI/UX Designer & Fullstack Engineer'
  });

  const saveProfile = () => {
    save('users', db.users.map(u => u.id === user.id ? { ...u, ...profileForm } : u));
    setIsEditing(false);
  };

  // Calendar Slider State
  // Get current week dynamically (real live calendar)
  const getWeekDates = () => {
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const week = [];
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday = d.toDateString() === today.toDateString();
      week.push({
        day: dayNames[d.getDay()],
        date: String(d.getDate()).padStart(2, '0'),
        monthName: d.toLocaleString('default', { month: 'long' }),
        year: d.getFullYear(),
        fullDateStr: d.toISOString().split('T')[0],
        isToday
      });
    }
    return week;
  };
  const weekdays = getWeekDates();
  const todayIdx = weekdays.findIndex(w => w.isToday);
  const [activeDay, setActiveDay] = useState(todayIdx >= 0 ? todayIdx : 3);

  // Team Slider scrolling Ref
  const teamSliderRef = useRef(null);
  const scrollTeam = (dir) => {
    if (teamSliderRef.current) {
      teamSliderRef.current.scrollBy({ left: dir * 180, behavior: 'smooth' });
    }
  };

  // Onboarding Checklist state
  const [checklist, setChecklist] = useState([
    { label: 'Office Tour', done: true, sub: '100% Complete' },
    { label: 'Introduction to Management', done: true, sub: '50% Review' },
    { label: 'Work Tool setup', done: true, sub: '25% Setup' },
    { label: 'Intro to Colleagues', done: false, sub: 'Not Started' },
    { label: 'Job Responsibilities alignment', done: false, sub: 'Not Started' }
  ]);

  const toggleCheck = (idx) => {
    setChecklist(checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c));
  };

  const addCheckItem = () => {
    const label = prompt('Enter new onboarding task description:');
    if (label) {
      setChecklist([...checklist, { label, done: false, sub: 'Not Started' }]);
    }
  };

  const deleteLastCheckItem = () => {
    if (checklist.length > 0) {
      setChecklist(checklist.slice(0, -1));
    }
  };

  // Task lists filtered by status
  const userTasks = db.workTasks.filter(t => isAdmin || t.uid === user.id);
  const todoTasks = userTasks.filter(t => ['todo', 'pending'].includes(t.status));
  const progressTasks = userTasks.filter(t => t.status === 'in_progress');
  const completedTasks = userTasks.filter(t => t.status === 'completed');
  const incompleteTasks = userTasks.filter(t => t.status === 'incomplete');

  const moveTask = (id, newStatus) => {
    save('workTasks', db.workTasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  return (
    <div className="modern-dash-layout anim-fadeup">
      {/* LEFT MAIN AREA */}
      <div className="modern-dash-main">
        {/* ROW 1: Greeting banner & Profile details */}
        <div className="dash-row-1">
          {/* Welcome Greeting widget */}
          <div className="welcome-widget">
            <div className="welcome-title">{user.name.split(' ')[0]}, today you have to work</div>
            <div className="welcome-sub" style={{ display: 'flex', alignItems: 'center' }}>
              On 3rd task 
              <div className="welcome-progress-bar">
                <div className="welcome-progress-fill" style={{ width: '25%' }}></div>
              </div>
              <span style={{ marginLeft: 8, fontWeight: 700, color: 'var(--purple)', fontSize: 13 }}>25%</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Maintain operational velocity. Check your assigned board items below to transition statuses.
            </p>
          </div>

          {/* Personal profile details widget */}
          <div className="personal-profile-card">
            <button className="profile-card-edit-btn" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? 'Cancel' : 'Edit ✏'}
            </button>
            <div className="profile-card-header">
              <img src={user.avatar} className="profile-card-avatar" alt="" />
              <div>
                <div className="profile-card-name">{user.name}</div>
                <div className="profile-card-title">{user.title || 'CEGS Associate'}</div>
              </div>
            </div>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input className="form-input" style={{ padding: '6px 10px', fontSize: 12.5 }} value={profileForm.avatar} onChange={e => setProfileForm({ ...profileForm, avatar: e.target.value })} placeholder="Profile Image URL" />
                <input className="form-input" style={{ padding: '6px 10px', fontSize: 12.5 }} value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="Email address" />
                <input className="form-input" style={{ padding: '6px 10px', fontSize: 12.5 }} value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="Phone Number" />
                <textarea className="form-input" style={{ padding: '6px 10px', fontSize: 12.5, minHeight: 48 }} value={profileForm.bio} onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="Short bio..." />
                <button className="btn btn-sm btn-dark" style={{ alignSelf: 'flex-start' }} onClick={saveProfile}>Save</button>
              </div>
            ) : (
              <>
                <div className="profile-card-details">
                  <div className="profile-card-detail-item">
                    <span className="profile-card-detail-label">Email</span>
                    <span className="profile-card-detail-value" style={{ fontSize: 12, wordBreak: 'break-all' }}>{user.email}</span>
                  </div>
                  <div className="profile-card-detail-item">
                    <span className="profile-card-detail-label">Phone</span>
                    <span className="profile-card-detail-value">{user.phone || '+1 212 555 0000'}</span>
                  </div>
                </div>
                <div className="profile-card-bio">
                  <span className="profile-card-detail-label" style={{ display: 'block', marginBottom: 4 }}>Bio / Focus Area</span>
                  {user.bio || 'UI/UX Designer & Enterprise Infrastructure Developer.'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ROW 2: Calendar planner slider */}
        <div className="calendar-schedule-widget">
          <div className="calendar-header">
            <div className="calendar-title">Calendar / Schedule</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>{weekdays[activeDay] ? `${weekdays[activeDay].monthName} ${weekdays[activeDay].year}` : 'July 2026'} ➔</div>
          </div>
          <div className="calendar-slider-container">
            {weekdays.map((w, idx) => {
              const isSunday = w.day === 'Sunday';
              return (
                <div 
                  key={idx} 
                  className={`cal-capsule ${activeDay === idx ? 'active' : ''} ${isSunday ? 'sunday-blur' : ''}`} 
                  onClick={() => !isSunday && setActiveDay(idx)}
                  style={isSunday ? { filter: 'blur(1px) grayscale(100%)', opacity: 0.4, pointerEvents: 'none' } : {}}
                >
                  <span className="cal-capsule-day">{w.day.slice(0, 3)} {isSunday && '(Holiday)'}</span>
                  <span className="cal-capsule-date">{w.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ROW 3: Summary Boxes */}
        <div className="summary-widget-container">
          <div className="summary-title">Summary metrics</div>
          <div className="summary-cards-grid">
            <div className="summary-box-card">
              <div className="summary-box-icon" style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--green-dark)' }}>
                <IC n="check2" s={18} />
              </div>
              <div className="summary-box-details">
                <span className="summary-box-value">{completedTasks.length} Completed</span>
                <span className="summary-box-label">Board tasks</span>
              </div>
            </div>
            <div className="summary-box-card">
              <div className="summary-box-icon" style={{ background: 'rgba(139, 92, 246, 0.08)', color: 'var(--purple)' }}>
                <IC n="activity" s={18} />
              </div>
              <div className="summary-box-details">
                <span className="summary-box-value">{progressTasks.length} In Progress</span>
                <span className="summary-box-label">Underway</span>
              </div>
            </div>
            <div className="summary-box-card">
              <div className="summary-box-icon" style={{ background: 'rgba(245, 158, 11, 0.08)', color: 'var(--amber-dark)' }}>
                <IC n="clock" s={18} />
              </div>
              <div className="summary-box-details">
                <span className="summary-box-value">{todoTasks.length} Tasks</span>
                <span className="summary-box-label">To Do list</span>
              </div>
            </div>
            <div className="summary-box-card">
              <div className="summary-box-icon" style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--red-dark)' }}>
                <IC n="x" s={18} />
              </div>
              <div className="summary-box-details">
                <span className="summary-box-value">{incompleteTasks.length} Incomplete</span>
                <span className="summary-box-label">Backlogs</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 4: Team Slider (Horizontal carousel of 8+ members) */}
        <div className="team-widget">
          <div className="team-header">
            <div className="team-title">Team members ({db.users.length})</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="slider-nav-btn" onClick={() => scrollTeam(-1)}>◂</button>
              <button className="slider-nav-btn" onClick={() => scrollTeam(1)}>▸</button>
            </div>
          </div>
          <div className="team-slider-wrapper">
            <div className="team-slider-container" ref={teamSliderRef}>
              {db.users.map((u, idx) => {
                const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#F97316', '#EF4444', '#EC4899', '#6366F1'];
                const color = colors[idx % colors.length];
                return (
                  <div key={u.id} className="team-slide-card">
                    <div className="team-card-color-bar" style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)` }} />
                    <img src={u.avatar} className="team-card-avatar" alt="" style={{ border: `3px solid ${color}` }} />
                    <div className="team-card-name">{u.name}</div>
                    <div className="team-card-role">{u.title || 'Engineer'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ROW 5: Task Board Kanban list */}
        <div className="taskboard-widget">
          <div className="taskboard-header">
            <div className="taskboard-title">Task Board</div>
          </div>
          <div className="taskboard-columns-grid">
            {/* COLUMN 1: TO DO */}
            <div className="taskboard-column">
              <div className="taskboard-column-header">
                <span className="taskboard-column-name">To Do</span>
                <span className="taskboard-column-count">{todoTasks.length}</span>
              </div>
              {todoTasks.map(t => (
                <div key={t.id} className="taskboard-card">
                  <div className="taskboard-card-title">{t.title}</div>
                  <div className="taskboard-card-desc">{t.desc}</div>
                  <div className="taskboard-card-footer">
                    <span className="taskboard-card-id">#{t.id}</span>
                    <button className="btn btn-xs btn-ghost" onClick={() => moveTask(t.id, 'in_progress')}>Start ➔</button>
                  </div>
                </div>
              ))}
            </div>

            {/* COLUMN 2: IN PROGRESS */}
            <div className="taskboard-column">
              <div className="taskboard-column-header">
                <span className="taskboard-column-name">In Progress</span>
                <span className="taskboard-column-count">{progressTasks.length}</span>
              </div>
              {progressTasks.map(t => (
                <div key={t.id} className="taskboard-card">
                  <div className="taskboard-card-title">{t.title}</div>
                  <div className="taskboard-card-desc">{t.desc}</div>
                  <div className="taskboard-card-footer">
                    <span className="taskboard-card-id">#{t.id}</span>
                    <button className="btn btn-xs btn-ghost" style={{ color: 'var(--green-dark)' }} onClick={() => moveTask(t.id, 'completed')}>Finish</button>
                  </div>
                </div>
              ))}
            </div>

            {/* COLUMN 3: COMPLETED */}
            <div className="taskboard-column">
              <div className="taskboard-column-header">
                <span className="taskboard-column-name">Completed</span>
                <span className="taskboard-column-count">{completedTasks.length}</span>
              </div>
              {completedTasks.map(t => (
                <div key={t.id} className="taskboard-card">
                  <div className="taskboard-card-title" style={{ textDecoration: 'line-through', opacity: 0.6 }}>{t.title}</div>
                  <div className="taskboard-card-desc" style={{ opacity: 0.6 }}>{t.desc}</div>
                  <div className="taskboard-card-footer">
                    <span className="taskboard-card-id">#{t.id}</span>
                    <span className="badge b-success">Closed</span>
                  </div>
                </div>
              ))}
            </div>

            {/* COLUMN 4: INCOMPLETE */}
            <div className="taskboard-column">
              <div className="taskboard-column-header">
                <span className="taskboard-column-name">Incomplete</span>
                <span className="taskboard-column-count">{incompleteTasks.length}</span>
              </div>
              {incompleteTasks.map(t => (
                <div key={t.id} className="taskboard-card" style={{ borderLeft: '3px solid var(--red)' }}>
                  <div className="taskboard-card-title">{t.title}</div>
                  <div className="taskboard-card-desc">{t.desc}</div>
                  <div className="taskboard-card-footer">
                    <span className="taskboard-card-id">#{t.id}</span>
                    <button className="btn btn-xs btn-ghost" onClick={() => moveTask(t.id, 'todo')}>Reopen</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT FLOATING SIDEBAR */}
      <div className="modern-dash-sidebar">
        {/* WIDGET 1: Onboarding Card */}
        <div className="card">
          <div className="card-hdr" style={{ paddingBottom: 10 }}>
            <div>
              <div className="section-title">Onboarding Pipeline</div>
              <div className="section-sub">Synchronise corporate hire plans</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <span className="badge b-success" style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>New Hires</span>
            <span className="badge b-gray" style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>Existing Staff</span>
          </div>
          <div className="form-row" style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontSize: 10 }}>Start Date</label>
              <input type="date" className="form-input" style={{ padding: '4px 8px', fontSize: 12 }} defaultValue="2026-07-20" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontSize: 10 }}>End Date</label>
              <input type="date" className="form-input" style={{ padding: '4px 8px', fontSize: 12 }} defaultValue="2026-08-30" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Onboarding Required</span>
            <label className="switch-control">
              <input type="checkbox" defaultChecked />
              <span className="switch-slider"></span>
            </label>
          </div>
          <div>
            <div style={{ display: 'flex', justifyBetween: 'space-between', fontSize: 11.5, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Onboarding Status</span>
              <span style={{ fontWeight: 800, color: 'var(--purple)' }}>35% Done</span>
            </div>
            <div className="progress-track" style={{ background: 'var(--border)' }}>
              <div className="progress-fill" style={{ width: '35%', background: 'var(--purple)' }} />
            </div>
          </div>
        </div>

        {/* WIDGET 2: Interactive Checklist */}
        <div className="checklist-card">
          <div className="checklist-header">
            <div className="checklist-title">Checklist tracker</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>July 2026</div>
          </div>
          <div className="checklist-items-list">
            {checklist.map((c, idx) => (
              <div key={idx} className="checklist-row-item">
                <div className="checklist-item-details">
                  <span className="checklist-item-label" style={{ textDecoration: c.done ? 'line-through' : 'none', opacity: c.done ? 0.6 : 1 }}>{c.label}</span>
                  <span className="checklist-item-sub">{c.sub}</span>
                </div>
                <label className="switch-control">
                  <input type="checkbox" checked={c.done} onChange={() => toggleCheck(idx)} />
                  <span className="switch-slider"></span>
                </label>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <button className="btn btn-sm btn-ghost" style={{ flex: 1, padding: '6px' }} onClick={addCheckItem}>+ Add Item</button>
            <button className="btn btn-sm btn-red" style={{ padding: '6px 12px' }} onClick={deleteLastCheckItem}>- Delete</button>
          </div>
        </div>

        {/* WIDGET 3: Progress Donut Graph */}
        <div className="donut-graph-widget">
          <div style={{ fontWeight: 800, fontSize: 14 }}>Graph Status Overview</div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '20px 0' }}>
            <svg className="donut-chart-svg">
              <circle className="donut-ring-track" cx="70" cy="70" r="54" />
              <circle className="donut-ring-fill" cx="70" cy="70" r="54" 
                      stroke="var(--purple)" 
                      strokeDasharray={`${(60 / 100) * (2 * Math.PI * 54)} ${2 * Math.PI * 54}`} />
              <circle className="donut-ring-fill" cx="70" cy="70" r="54" 
                      stroke="var(--amber)" 
                      strokeDasharray={`${(20 / 100) * (2 * Math.PI * 54)} ${2 * Math.PI * 54}`}
                      strokeDashoffset={`-${(60 / 100) * (2 * Math.PI * 54)}`} />
            </svg>
            <div className="donut-inner-text">
              <div className="donut-value">60%</div>
              <div className="donut-label">Total Progress</div>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Verification targets are computed from checklist items and credential auditor compliance logs.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   EMPLOYEES PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function EmployeesPage({ db, save, user }) {
  const [search, setSearch] = useState('');
  const [deptF, setDeptF] = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const getUserPermissionRole = (u) => {
    if (!u) return 'employee';
    if (u.role === 'super_admin') return 'super_admin';
    if (u.role === 'admin') return 'admin';
    const title = (u.title || '').toLowerCase();
    if (title.includes('manager')) return 'manager';
    if (title.includes('recruiter')) return 'recruiter';
    if (title.includes('billing') || title.includes('finance') || title.includes('accounts')) return 'finance';
    return 'employee';
  };
  const currentPermRole = getUserPermissionRole(user);
  const canEdit = db.permissions?.[currentPermRole]?.deleteEmp || ['admin','super_admin'].includes(user.role);

  const list = db.users.filter(u=>
    (deptF==='all'||u.deptId===parseInt(deptF)) &&
    (statusF==='all'||u.status===statusF) &&
    (u.name.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase())||u.eid.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => { setForm({name:'',email:'',role:'employee',deptId:3,title:'',joined:new Date().toISOString().split('T')[0],phone:'',salary:3500,status:'active',eid:`EMP-00${db.users.length+1}`,avatar:`https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,reportsTo:null}); setModal('form'); };
  const openEdit = u => { setForm({...u}); setModal('form'); };
  const save_ = e => {
    e.preventDefault();
    if (form.id) { save('users', db.users.map(u=>u.id===form.id?form:u)); }
    else { save('users', [...db.users, {...form,id:Date.now()}]); }
    setModal(null);
  };
  const deactivate = id => { if(confirm('Deactivate this employee?')) save('users', db.users.map(u=>u.id===id?{...u,status:'inactive'}:u)); };

  return (
    <div className="anim-fadeup">
      <PageHdr title="Employee Directory" sub={`${db.users.length} people across ${db.departments.length} departments`}>
        {canEdit && <button className="btn btn-dark" onClick={openAdd}><IC n="plus"/> Add Employee</button>}
      </PageHdr>

      <div className="card" style={{marginBottom:20}}>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:1,minWidth:200}}>
            <IC n="search" s={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}}/>
            <input className="form-input" style={{paddingLeft:38}} placeholder="Search by name, email, or ID..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-input" style={{width:180}} value={deptF} onChange={e=>setDeptF(e.target.value)}>
            <option value="all">All Departments</option>
            {db.departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="form-input" style={{width:150}} value={statusF} onChange={e=>setStatusF(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>Title</th><th>Joined</th><th>Salary</th><th>Status</th>{canEdit&&<th>Actions</th>}</tr></thead>
            <tbody>
              {list.length===0&&<tr><td colSpan={canEdit?8:7}><div className="empty-state"><span className="empty-state-icon"><IC n="search" s={48} style={{color:'var(--text-muted)'}}/></span><h3>No results</h3><p>Try adjusting your search or filters</p></div></td></tr>}
              {list.map(u=>{
                const dept=db.departments.find(d=>d.id===u.deptId);
                return <tr key={u.id}>
                  <td>
                    <div className="emp-cell">
                      <img src={u.avatar} className="tbl-av" alt=""/>
                      <div>
                        <div style={{fontWeight:700,fontSize:14}}>{u.name}</div>
                        <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:'JetBrains Mono,monospace'}}>{u.eid}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${u.role==='super_admin'?'b-purple':u.role==='admin'?'b-info':'b-gray'}`}><span className="badge-dot"/>{u.role.replace('_',' ')}</span></td>
                  <td>
                    {dept && <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13}}>
                      <span style={{width:8,height:8,borderRadius:'50%',background:dept.color,display:'inline-block'}}/>
                      {dept.name}
                    </span>}
                  </td>
                  <td style={{fontSize:13}}>{u.title}</td>
                  <td style={{fontSize:13,color:'var(--text-muted)'}}>{u.joined}</td>
                  <td style={{fontFamily:'JetBrains Mono,monospace',fontWeight:600,fontSize:13}}>₹{u.salary?.toLocaleString()}</td>
                  <td><span className={`badge ${u.status==='active'?'b-success':u.status==='on_leave'?'b-pending':'b-error'}`}><span className="badge-dot"/>{u.status.replace('_',' ')}</span></td>
                  {canEdit&&<td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-xs btn-ghost" onClick={()=>openEdit(u)}><IC n="edit" s={12}/></button>
                      {u.status==='active'&&u.id!==user.id&&canEdit&&<button className="btn btn-xs btn-red" onClick={()=>deactivate(u.id)}><IC n="trash" s={12}/></button>}
                    </div>
                  </td>}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal==='form'} onClose={()=>setModal(null)} title={form.id?'Edit Employee':'Add New Employee'} subtitle={form.id?`Editing ${form.name}`:'Fill in the details to create a new employee record'}>
        <form onSubmit={save_}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} required /></div>
            <div className="form-group"><label className="form-label">Email Address</label><input type="email" className="form-input" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Role</label><select className="form-input" value={form.role||'employee'} onChange={e=>setForm({...form,role:e.target.value})}><option value="employee">Employee</option><option value="admin">Admin (HR)</option><option value="super_admin">Super Admin</option></select></div>
            <div className="form-group"><label className="form-label">Department</label><select className="form-input" value={form.deptId||1} onChange={e=>setForm({...form,deptId:parseInt(e.target.value)})}>{db.departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          </div>
          <div className="form-group"><label className="form-label">Job Title</label><input className="form-input" value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Senior Software Engineer" required /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Join Date</label><input type="date" className="form-input" value={form.joined||''} onChange={e=>setForm({...form,joined:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Monthly Salary (₹)</label><input type="number" className="form-input" value={form.salary||3500} onChange={e=>setForm({...form,salary:parseFloat(e.target.value)})} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+1 555 000 0000" /></div>
            <div className="form-group"><label className="form-label">Reports To</label><select className="form-input" value={form.reportsTo||''} onChange={e=>setForm({...form,reportsTo:e.target.value?parseInt(e.target.value):null})}><option value="">- Direct (CEO) -</option>{db.users.filter(u=>u.id!==form.id).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          </div>
          <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button><button type="submit" className="btn btn-dark">Save Employee</button></div>
        </form>
      </Modal>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   DEPARTMENTS PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function DepartmentsPage({ db, save, user }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const colors = ['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444','#F97316','#EC4899'];

  const openAdd = () => { setForm({name:'',code:'',managerId:'',budget:0,color:colors[0]}); setModal(true); };
  const openEdit = d => { setForm({...d}); setModal(true); };
  const save_ = e => {
    e.preventDefault();
    if(form.id){ save('departments',db.departments.map(d=>d.id===form.id?form:d)); }
    else { save('departments',[...db.departments,{...form,id:Date.now()}]); }
    setModal(false);
  };
  const del = id => { if(confirm('Delete department? Employees will need to be reassigned.')) save('departments',db.departments.filter(d=>d.id!==id)); };

  return (
    <div className="anim-fadeup">
      <PageHdr title="Departments" sub={`${db.departments.length} active divisions`}>
        <button className="btn btn-dark" onClick={openAdd}><IC n="plus"/> New Department</button>
      </PageHdr>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:18}}>
        {db.departments.map(d=>{
          const manager=db.users.find(u=>u.id===d.managerId);
          const members=db.users.filter(u=>u.deptId===d.id);
          const utilPct=65+Math.floor(Math.random()*25);
          return <div key={d.id} className="card" style={{padding:24,cursor:'default'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
            <div style={{width:52,height:52,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,background:`${d.color}18`}}><IC n="building" s={24} style={{color:'var(--text-muted)'}}/></div>
              <span style={{fontSize:11,fontWeight:800,background:`${d.color}18`,color:d.color,padding:'4px 12px',borderRadius:99,textTransform:'uppercase',letterSpacing:1}}>{d.code}</span>
            </div>
            <div style={{fontFamily:'Outfit',fontWeight:800,fontSize:20,letterSpacing:'-.5px',marginBottom:6}}>{d.name}</div>
            <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:18}}>Manager: {manager?.name||'Unassigned'}</div>
            <div style={{marginBottom:6,display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:600}}>
              <span>Budget Utilization</span>
              <span>₹{(d.budget*(utilPct/100)).toLocaleString()} / ₹{d.budget?.toLocaleString()}</span>
            </div>
            <div className="progress-track progress-md" style={{marginBottom:18}}><div className="progress-fill" style={{width:`${utilPct}%`,background:d.color}}/></div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex'}}>
                {members.slice(0,4).map((m,i)=><img key={m.id} src={m.avatar} style={{width:28,height:28,borderRadius:'50%',border:'2px solid #fff',marginLeft:i?-8:0,objectFit:'cover'}} alt=""/>)}
                <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:members.length>1?8:0,fontWeight:600,alignSelf:'center'}}>{members.length} member{members.length!==1?'s':''}</span>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-xs btn-ghost" onClick={()=>openEdit(d)}><IC n="edit" s={12}/></button>
                <button className="btn btn-xs btn-red" onClick={()=>del(d.id)}><IC n="trash" s={12}/></button>
              </div>
            </div>
          </div>;
        })}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={form.id?'Edit Department':'New Department'}>
        <form onSubmit={save_}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
            <div className="form-group"><label className="form-label">Code</label><input className="form-input" value={form.code||''} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} maxLength={6} required/></div>
          </div>
          <div className="form-group"><label className="form-label">Manager</label><select className="form-input" value={form.managerId||''} onChange={e=>setForm({...form,managerId:parseInt(e.target.value)})}><option value="">- Unassigned -</option>{db.users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Annual Budget (₹)</label><input type="number" className="form-input" value={form.budget||0} onChange={e=>setForm({...form,budget:parseFloat(e.target.value)})}/></div>
          <div className="form-group"><label className="form-label">Accent Color</label><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{colors.map(c=><div key={c} onClick={()=>setForm({...form,color:c})} style={{width:32,height:32,borderRadius:9,background:c,cursor:'pointer',border:form.color===c?'3px solid #111':'3px solid transparent',transition:'all .2s'}}/>) }</div></div>
          <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button><button type="submit" className="btn btn-dark">Save Department</button></div>
        </form>
      </Modal>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   ORG CHART PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function OrgChartPage({ db }) {
  const root = db.users.find(u=>!u.reportsTo);
  const getKids = id => db.users.filter(u=>u.reportsTo===id);

  const Node = ({ emp, depth=0 }) => {
    if (!emp) return null;
    const kids = getKids(emp.id);
    const dept = db.departments.find(d=>d.id===emp.deptId);
    return (
      <div className="org-connector">
        <div className="org-node">
          <img src={emp.avatar} className="org-av" alt=""/>
          <div className="org-name">{emp.name}</div>
          <div className="org-title">{emp.title}</div>
          {dept && <div className="org-dept" style={{background:`${dept.color}18`,color:dept.color}}>{dept.name}</div>}
        </div>
        {kids.length>0 && <>
          <div className="org-line-v"/>
          <div style={{display:'flex',alignItems:'flex-start',gap:0,position:'relative'}}>
            {kids.length>1 && <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',height:2,background:'var(--amber)',width:`calc(100% - 80px)`}}/>}
            {kids.map(k=>(
              <div key={k.id} className="org-child">
                <div className="org-line-v"/>
                <Node emp={k} depth={depth+1} />
              </div>
            ))}
          </div>
        </>}
      </div>
    );
  };

  return (
    <div className="anim-fadeup">
      <PageHdr title="Organization Chart" sub="Visual hierarchy and reporting structure"/>
      <div className="card">
        <div className="org-canvas" style={{overflowX:'auto',paddingBottom:32}}>
          <div style={{display:'inline-flex',flexDirection:'column',alignItems:'center',minWidth:'100%'}}>
            {root ? <Node emp={root}/> : <div className="empty-state"><IC n="tree" s={48} style={{color:'var(--text-muted)'}}/><h3>No hierarchy found</h3></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   LEAVES PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function LeavesPage({ db, save, user }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({type:'vacation',start:'',end:'',reason:''});
  const [filter, setFilter] = useState('all');
  const getUserPermissionRole = (u) => {
    if (!u) return 'employee';
    if (u.role === 'super_admin') return 'super_admin';
    if (u.role === 'admin') return 'admin';
    const title = (u.title || '').toLowerCase();
    if (title.includes('manager')) return 'manager';
    if (title.includes('recruiter')) return 'recruiter';
    if (title.includes('billing') || title.includes('finance') || title.includes('accounts')) return 'finance';
    return 'employee';
  };
  const currentPermRole = getUserPermissionRole(user);
  const isAdmin = db.permissions?.[currentPermRole]?.approveLeave || ['admin','super_admin'].includes(user.role);

  const submit = e => {
    e.preventDefault();
    save('leaves',[{id:Date.now(),uid:user.id,...form,status:'pending',applied:new Date().toISOString().split('T')[0]},...db.leaves]);
    setModal(false); setForm({type:'vacation',start:'',end:'',reason:''});
    alert('Leave request submitted successfully!');
  };

  const decide = (id,status) => {
    const note = status==='rejected' ? prompt('Rejection reason:') : null;
    if(status==='rejected'&&note===null) return;
    save('leaves',db.leaves.map(l=>l.id===id?{...l,status,by:user.id,note}:l));
  };

  const myLeaves = db.leaves.filter(l=>l.uid===user.id);
  const vacUsed=myLeaves.filter(l=>l.type==='vacation'&&l.status==='approved').length;
  const sickUsed=myLeaves.filter(l=>l.type==='sick'&&l.status==='approved').length;
  const casualUsed=myLeaves.filter(l=>l.type==='casual'&&l.status==='approved').length;
  const list=(isAdmin?db.leaves:myLeaves).filter(l=>filter==='all'||l.status===filter);

  const balances=[{l:'Vacation',used:vacUsed,tot:20,c:'#F59E0B'},{l:'Sick',used:sickUsed,tot:15,c:'#3B82F6'},{l:'Casual',used:casualUsed,tot:10,c:'#10B981'},{l:'Personal',used:1,tot:7,c:'#8B5CF6'}];

  return (
    <div className="anim-fadeup">
      <PageHdr title="Leave Management" sub={`${list.length} requests ${filter!=='all'?`(${filter})`:''}`}>
        <button className="btn btn-dark" onClick={()=>setModal(true)}><IC n="plus"/> Apply for Leave</button>
      </PageHdr>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {balances.map(b=>(
          <div key={b.l} className="card" style={{padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,alignItems:'flex-start'}}>
              <div style={{fontWeight:700,fontSize:14}}>{b.l}</div>
              <div style={{fontFamily:'Outfit',fontSize:22,fontWeight:900,color:b.c}}>{b.tot-b.used}</div>
            </div>
            <div className="progress-track progress-sm" style={{marginBottom:6}}><div className="progress-fill" style={{width:`${(b.used/b.tot)*100}%`,background:b.c}}/></div>
            <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:600}}>{b.used} used of {b.tot} days</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="tabs-bar">
          {['all','pending','approved','rejected'].map(f=>(
            <button key={f} className={`tab-btn ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)} {f!=='all'&&<span style={{fontSize:11,marginLeft:4,opacity:.7}}>({(isAdmin?db.leaves:myLeaves).filter(l=>l.status===f).length})</span>}
            </button>
          ))}
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Applied</th><th>Status</th>{isAdmin&&<th>Actions</th>}</tr></thead>
            <tbody>
              {list.length===0&&<tr><td colSpan={9}><div className="empty-state"><IC n="calendar" s={48} style={{color:'var(--text-muted)'}}/><h3>No requests</h3><p>No leave requests match this filter</p></div></td></tr>}
              {list.map(l=>{
                const emp=db.users.find(u=>u.id===l.uid);
                const days=Math.ceil((new Date(l.end)-new Date(l.start))/(1000*60*60*24))+1;
                return <tr key={l.id}>
                  <td><div className="emp-cell"><img src={emp?.avatar} className="tbl-av" alt=""/><div><div style={{fontWeight:700,fontSize:13}}>{emp?.name}</div><div style={{fontSize:11,color:'var(--text-muted)'}}>{emp?.title}</div></div></div></td>
                  <td><span className="badge b-info" style={{textTransform:'capitalize'}}>{l.type}</span></td>
                  <td style={{fontSize:13,fontWeight:600}}>{l.start}</td>
                  <td style={{fontSize:13,fontWeight:600}}>{l.end}</td>
                  <td style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:'var(--amber-dark)'}}>{days}d</td>
                  <td style={{fontSize:13,maxWidth:220,color:'var(--text-secondary)'}}>{l.reason}</td>
                  <td style={{fontSize:12,color:'var(--text-muted)'}}>{l.applied}</td>
                  <td><span className={`badge ${l.status==='approved'?'b-success':l.status==='rejected'?'b-error':'b-pending'}`}><span className="badge-dot"/>{l.status}</span></td>
                  {isAdmin&&<td>
                    {l.status==='pending'
                      ?<div style={{display:'flex',gap:5}}><button className="btn btn-xs btn-green" onClick={()=>decide(l.id,'approved')}><IC n="check" s={11}/> Approve</button><button className="btn btn-xs btn-red" onClick={()=>decide(l.id,'rejected')}><IC n="x" s={11}/></button></div>
                      :<span style={{fontSize:12,color:'var(--text-muted)'}}>Decided</span>}
                  </td>}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Apply for Leave" subtitle="Your request will be sent to HR for review">
        <form onSubmit={submit}>
          <div className="form-group"><label className="form-label">Leave Type</label>
            <select className="form-input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
              <option value="vacation">Vacation</option><option value="sick">Sick Leave</option><option value="casual">Casual</option><option value="personal">Personal</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Start Date</label><input type="date" className="form-input" value={form.start} onChange={e=>setForm({...form,start:e.target.value})} required/></div>
            <div className="form-group"><label className="form-label">End Date</label><input type="date" className="form-input" value={form.end} onChange={e=>setForm({...form,end:e.target.value})} required/></div>
          </div>
          <div className="form-group"><label className="form-label">Reason</label><textarea className="form-input" rows={3} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Briefly describe the reason for your leave..." required/></div>
          <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button><button type="submit" className="btn btn-dark"><IC n="send" s={14}/> Submit Request</button></div>
        </form>
      </Modal>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   ATTENDANCE PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function AttendancePage({ db, save, user }) {
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const intRef = useRef(null);
  const getUserPermissionRole = (u) => {
    if (!u) return 'employee';
    if (u.role === 'super_admin') return 'super_admin';
    if (u.role === 'admin') return 'admin';
    const title = (u.title || '').toLowerCase();
    if (title.includes('manager')) return 'manager';
    if (title.includes('recruiter')) return 'recruiter';
    if (title.includes('billing') || title.includes('finance') || title.includes('accounts')) return 'finance';
    return 'employee';
  };
  const currentPermRole = getUserPermissionRole(user);
  const isAdmin = db.permissions?.[currentPermRole]?.attendance || ['admin','super_admin'].includes(user.role);
  const today = new Date().toISOString().split('T')[0];
  const todayRec = db.attendance.find(a=>a.uid===user.id&&a.date===today);

  useEffect(()=>{
    if(running){ intRef.current=setInterval(()=>setSecs(s=>s+1),1000); }
    else { clearInterval(intRef.current); }
    return()=>clearInterval(intRef.current);
  },[running]);

  const fmt = s=>`${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const clockIn = () => {
    if(todayRec){ alert('Already checked in today!'); return; }
    const now=new Date();
    const status=(now.getHours()>10 || (now.getHours()===10 && now.getMinutes()>15)) ? 'late' : 'present';
    save('attendance',[{id:Date.now(),uid:user.id,date:today,in:now.toTimeString().substr(0,5),out:null,status,hrs:0},...db.attendance]);
    setRunning(true);
  };

  const clockOut = () => {
    if(!todayRec||todayRec.out){ alert(!todayRec?'Clock in first!':'Already clocked out.'); return; }
    const hrs=parseFloat((secs/3600).toFixed(2))||8.0;
    save('attendance',db.attendance.map(a=>a.uid===user.id&&a.date===today?{...a,out:new Date().toTimeString().substr(0,5),hrs}:a));
    setRunning(false); setSecs(0);
  };

  const myLogs = isAdmin?db.attendance:db.attendance.filter(a=>a.uid===user.id);
  const presentDays = db.attendance.filter(a=>a.uid===user.id&&a.status==='present').length;
  const lateDays = db.attendance.filter(a=>a.uid===user.id&&a.status==='late').length;
  const totalHrs = db.attendance.filter(a=>a.uid===user.id).reduce((s,a)=>s+a.hrs,0);

  return (
    <div className="anim-fadeup">
      <PageHdr title="Attendance" sub="Track your daily work hours and review history"/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
        <div className="timer-card">
          <div className="timer-label">LIVE WORK TIMER</div>
          <div className="timer-digits">{fmt(secs)}</div>
          <div className="timer-actions">
            <button className="btn btn-amber" onClick={clockIn} style={{flex:1}} disabled={!!todayRec}>
              {todayRec ? '✔ Clocked In' : 'Clock In'}
            </button>
            <button className="btn btn-ghost" onClick={clockOut} style={{flex:1,color:'#fff',borderColor:'rgba(255,255,255,0.2)'}} disabled={!running}>
              Clock Out
            </button>
          </div>
          {todayRec && <div style={{marginTop:16,fontSize:13,color:'rgba(255,255,255,0.45)',fontFamily:'JetBrains Mono,monospace'}}>
            IN: {todayRec.in} {todayRec.out && `  |  OUT: ${todayRec.out}`}
          </div>}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          {[{v:presentDays,l:'Days Present',c:'#10B981',bg:'#D1FAE5'},{v:lateDays,l:'Late Arrivals',c:'#F59E0B',bg:'#FEF3C7'},{v:Math.round(totalHrs),l:'Total Hours',c:'#3B82F6',bg:'#DBEAFE'},{v:`${Math.round((presentDays/(presentDays+lateDays||1))*100)}%`,l:'On-Time Rate',c:'#8B5CF6',bg:'#EDE9FE'}].map((s,i)=>(
            <div key={i} className="card" style={{padding:20}}>
              <div style={{fontSize:28,fontFamily:'Outfit',fontWeight:900,color:s.c,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',fontWeight:600}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'5fr 3fr',gap:20}}>
        <div className="card">
          <div className="card-hdr"><div className="section-title">Attendance Log</div></div>
          <div className="tbl-wrap">
            <table className="tbl">
              Clock Out
              <tbody>
              <span className="empty-state-icon"><IC n="terminal" s={48} style={{color:'var(--text-muted)'}}/></span>
                {myLogs.sort((a,b)=>b.date.localeCompare(a.date)).map(a=>{
                  const emp=db.users.find(u=>u.id===a.uid);
                  return <tr key={a.id}>
                    <td style={{fontWeight:700,fontFamily:'JetBrains Mono,monospace',fontSize:13}}>{a.date}</td>
                    {isAdmin&&<td><div className="emp-cell"><img src={emp?.avatar} className="tbl-av" alt=""/>{emp?.name}</div></td>}
                    <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:13}}>{a.in}</td>
                    <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:13}}>{a.out||<span style={{color:'var(--amber)',fontWeight:700}}>Active</span>}</td>
                    <td style={{fontWeight:700}}>{a.hrs||'-'}h</td>
                    <td><span className={`badge ${a.status==='present'?'b-success':a.status==='late'?'b-pending':'b-error'}`}><span className="badge-dot"/>{a.status}</span></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-hdr"><div className="section-title">July 2026</div></div>
          <div className="cal-grid">
            {['S','M','T','W','T','F','S'].map((d,i)=><div key={i} className="cal-hdr">{d}</div>)}
            {[0,1,2].map(i=><div key={'e'+i} className="cal-day empty"/>)}
            {Array.from({length:31},(_,i)=>{
              const day=i+1;
              const ds=`2026-07-${String(day).padStart(2,'0')}`;
              const rec=db.attendance.find(a=>a.uid===user.id&&a.date===ds);
              const cls=rec?(rec.status==='present'?'present':'late'):'';
              return <div key={day} className={`cal-day ${cls} ${day===13?'today':''}`} title={rec?`In:${rec.in} Out:${rec.out||'ongoing'}`:'No record'}>{day}</div>;
            })}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:16,fontSize:12}}>
            {[{c:'present',label:'Present'},{c:'late',label:'Late'},{c:'empty',label:'No Record'}].map(item=>(
              <div key={item.c} style={{display:'flex',alignItems:'center',gap:6}}>
                <div className={`cal-day ${item.c}`} style={{width:16,height:16,borderRadius:4,minWidth:16,fontSize:0}}/>
                <span style={{color:'var(--text-muted)'}}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   PAYROLL PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function PayrollPage({ db, save, user }) {
  const [month, setMonth] = useState(7);
  const [year] = useState(2026);
  const [payslip, setPayslip] = useState(null);
  const getUserPermissionRole = (u) => {
    if (!u) return 'employee';
    if (u.role === 'super_admin') return 'super_admin';
    if (u.role === 'admin') return 'admin';
    const title = (u.title || '').toLowerCase();
    if (title.includes('manager')) return 'manager';
    if (title.includes('recruiter')) return 'recruiter';
    if (title.includes('billing') || title.includes('finance') || title.includes('accounts')) return 'finance';
    return 'employee';
  };
  const currentPermRole = getUserPermissionRole(user);
  const isAdmin = db.permissions?.[currentPermRole]?.payroll || ['admin','super_admin'].includes(user.role);

  const runPayroll = () => {
    const active=db.users.filter(u=>['active','on_leave'].includes(u.status));
    const recs=active.map((emp,i)=>{
      const allowances=Math.round(emp.salary*.12);
      const deductions=Math.round((emp.salary+allowances)*.09);
      return {id:Date.now()+i,uid:emp.id,month:parseInt(month),year,basic:emp.salary,allowances,overtime:0,bonus:0,deductions,net:emp.salary+allowances-deductions,status:'processed',date:new Date().toISOString().split('T')[0]};
    });
    const old=db.payroll.filter(p=>!(p.month===parseInt(month)&&p.year===year));
    save('payroll',[...old,...recs]);
    alert(`✔ Payroll processed for ${recs.length} employees for month ${month}/${year}`);
  };

  const list=isAdmin?db.payroll:db.payroll.filter(p=>p.uid===user.id);
  const totalNet=list.reduce((s,p)=>s+p.net,0);

  return (
    <div className="anim-fadeup">
      <PageHdr title="Payroll" sub="Salary processing, payslips & financial records">
        {isAdmin&&<div style={{display:'flex',gap:10}}>
          <select className="form-input" style={{width:130}} value={month} onChange={e=>setMonth(e.target.value)}>
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=><option key={i} value={i+1}>{m}</option>)}
          </select>
          <button className="btn btn-amber" onClick={runPayroll}>⚡ Run Payroll</button>
        </div>}
      </PageHdr>

      {isAdmin&&<div className="stats-grid stagger" style={{marginBottom:24}}>
        {[{l:'Total Disbursed',v:`₹${totalNet.toLocaleString()}`,bg:'#D1FAE5',ic:'#059669',icon:'card'},{l:'Employees Paid',v:new Set(list.map(p=>p.uid)).size,bg:'#DBEAFE',ic:'#2563EB',icon:'users'},{l:'Avg Salary',v:`₹${Math.round(totalNet/Math.max(list.length,1)).toLocaleString()}`,bg:'#FEF3C7',ic:'#D97706',icon:'trending'}].map((s,i)=>(
          <div key={i} className="stat-c">
            <div className="stat-icon-wrap" style={{background:s.bg}}><IC n={s.icon} s={20} c={s.ic}/></div>
            <div><div className="stat-label">{s.l}</div><div className="stat-value">{s.v}</div></div>
          </div>
        ))}
      </div>}

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Employee</th><th>Period</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th>Net Salary</th><th>Status</th><th>Payslip</th></tr></thead>
            <tbody>
              {list.length===0&&<tr><td colSpan={8}><div className="empty-state"><span className="empty-state-icon"><IC n="card" s={48} style={{color:'var(--text-muted)'}}/></span><h3>No payroll records</h3><p>Click "Run Payroll" to process salaries for this period</p></div></td></tr>}
              {list.map(p=>{
                const emp=db.users.find(u=>u.id===p.uid);
                const monthName=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(p.month||7)-1];
                return <tr key={p.id}>
                  <td><div className="emp-cell"><img src={emp?.avatar} className="tbl-av" alt=""/><div><div style={{fontWeight:700,fontSize:13}}>{emp?.name}</div><div style={{fontSize:11,color:'var(--text-muted)'}}>{emp?.eid}</div></div></div></td>
                  <td style={{fontSize:13,color:'var(--text-muted)'}}>{monthName} {p.year}</td>
                  <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:13}}>₹{p.basic?.toLocaleString()}</td>
                  <td style={{color:'var(--green-dark)',fontWeight:600,fontSize:13}}>+₹{p.allowances?.toLocaleString()}</td>
                  <td style={{color:'var(--red-dark)',fontWeight:600,fontSize:13}}>-₹{p.deductions?.toLocaleString()}</td>
                  <td style={{fontFamily:'Outfit,sans-serif',fontWeight:900,fontSize:18,color:'var(--text-primary)'}}>₹{p.net?.toLocaleString()}</td>
                  <td><span className="badge b-success"><span className="badge-dot"/>{p.status}</span></td>
                  <td><button className="btn btn-xs btn-ghost" onClick={()=>setPayslip(p)}><IC n="eye" s={12}/> View</button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!payslip} onClose={()=>setPayslip(null)} title="Payslip Document" subtitle="Official salary statement">
        {payslip&&<>
          <div className="payslip-doc">
            <div className="payslip-hdr">
              <div className="payslip-company">CEGS Corp.</div>
              <div className="payslip-addr">42 Wall Street, Suite 1800, New York, NY 10005</div>
              <div className="payslip-period">SALARY SLIP - {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][(payslip.month||7)-1]} {payslip.year}</div>
            </div>
            <div style={{marginBottom:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:13}}>
              <div><span style={{color:'var(--text-muted)'}}>Employee:</span> <strong>{db.users.find(u=>u.id===payslip.uid)?.name}</strong></div>
              <div><span style={{color:'var(--text-muted)'}}>Employee ID:</span> <strong className="mono">{db.users.find(u=>u.id===payslip.uid)?.eid}</strong></div>
              <div><span style={{color:'var(--text-muted)'}}>Designation:</span> <strong>{db.users.find(u=>u.id===payslip.uid)?.title}</strong></div>
              <div><span style={{color:'var(--text-muted)'}}>Pay Date:</span> <strong>{payslip.date}</strong></div>
            </div>
            <div className="payslip-row"><span>Basic Salary</span><span>₹{payslip.basic?.toLocaleString()}</span></div>
            <div className="payslip-row"><span>Housing & Transport Allowances</span><span style={{color:'var(--green-dark)'}}>+₹{payslip.allowances?.toLocaleString()}</span></div>
            <div className="payslip-row"><span>Overtime</span><span style={{color:'var(--green-dark)'}}>+₹{payslip.overtime||0}</span></div>
            <div className="payslip-row"><span>Performance Bonus</span><span style={{color:'var(--green-dark)'}}>+₹{payslip.bonus||0}</span></div>
            <div className="payslip-row"><span>Tax & Provident Fund Deductions</span><span style={{color:'var(--red-dark)'}}>-₹{payslip.deductions?.toLocaleString()}</span></div>
            <div className="payslip-total"><span>Net Salary</span><span style={{color:'var(--green-dark)'}}>₹{payslip.net?.toLocaleString()}</span></div>
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={()=>setPayslip(null)}>Close</button>
            <button className="btn btn-dark" onClick={()=>window.print()}><IC n="print" s={14}/> Print / Download</button>
          </div>
        </>}
      </Modal>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   TIMESHEETS PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function TimesheetsPage({ db, save, user }) {
  const [form, setForm] = useState({project:'Project Aurora',task:'',hours:8,date:new Date().toISOString().split('T')[0]});
  const isAdmin=['admin','super_admin'].includes(user.role);

  const submit=e=>{
    e.preventDefault();
    save('timesheets',[{id:Date.now(),uid:user.id,...form,hours:parseFloat(form.hours),status:'pending'},...db.timesheets]);
    setForm({...form,task:''});
    alert('Time log submitted!');
  };
  const decide=(id,status)=>save('timesheets',db.timesheets.map(t=>t.id===id?{...t,status,by:user.id}:t));
  const del=id=>{if(confirm('Delete this log?'))save('timesheets',db.timesheets.filter(t=>t.id!==id));};
  const list=isAdmin?db.timesheets:db.timesheets.filter(t=>t.uid===user.id);
  const totalH=list.reduce((s,t)=>s+t.hours,0);

  return (
    <div className="anim-fadeup">
      <PageHdr title="Timesheets" sub={`${totalH}h logged across ${list.length} entries`}/>
      <div style={{display:'grid',gridTemplateColumns:'340px 1fr',gap:20}}>
        <div className="card">
          <div className="card-hdr"><div className="section-title">Log Hours</div></div>
          <form onSubmit={submit}>
            <div className="form-group"><label className="form-label">Project</label>
              <select className="form-input" value={form.project} onChange={e=>setForm({...form,project:e.target.value})}>
                <option>Project Aurora</option><option>Q3 Campaign</option><option>HR Onboarding</option><option>AWS Infrastructure</option><option>Internal Tools</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Hours</label><input type="number" min={0.5} max={24} step={0.5} className="form-input" value={form.hours} onChange={e=>setForm({...form,hours:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
            </div>
            <div className="form-group"><label className="form-label">Task Description</label><textarea className="form-input" rows={3} value={form.task} onChange={e=>setForm({...form,task:e.target.value})} placeholder="What did you work on?" required/></div>
            <button type="submit" className="btn btn-dark" style={{width:'100%'}}><IC n="plus" s={14}/> Log Hours</button>
          </form>
        </div>

        <div className="card">
          <div className="card-hdr"><div className="section-title">Log History</div></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Employee</th><th>Date</th><th>Project</th><th>Hours</th><th>Task</th><th>Status</th>{isAdmin&&<th>Actions</th>}</tr></thead>
              <tbody>
              {list.length===0&&<tr><td colSpan={isAdmin?7:6}><div className="empty-state"><span className="empty-state-icon"><IC n="clock" s={48} style={{color:'var(--text-muted)'}}/></span><p>No time logs yet</p></div></td></tr>}
                {list.sort((a,b)=>b.date.localeCompare(a.date)).map(t=>{
                  const emp=db.users.find(u=>u.id===t.uid);
                  return <tr key={t.id}>
                    <td><div className="emp-cell"><img src={emp?.avatar} className="tbl-av" alt=""/>{emp?.name}</div></td>
                    <td style={{fontSize:12,fontFamily:'JetBrains Mono,monospace'}}>{t.date}</td>
                    <td><span className="tag" style={{fontSize:11}}>{t.project}</span></td>
                    <td style={{fontFamily:'Outfit,sans-serif',fontWeight:800,fontSize:16,color:'var(--amber-dark)'}}>{t.hours}h</td>
                    <td style={{fontSize:13,maxWidth:200,color:'var(--text-secondary)'}}>{t.task}</td>
                    <td><span className={`badge ${t.status==='approved'?'b-success':t.status==='rejected'?'b-error':'b-pending'}`}><span className="badge-dot"/>{t.status}</span></td>
                    {isAdmin&&<td><div style={{display:'flex',gap:5}}>
                      {t.status==='pending'&&<><button className="btn btn-xs btn-green" onClick={()=>decide(t.id,'approved')}><IC n="check" s={11}/></button><button className="btn btn-xs btn-red" onClick={()=>decide(t.id,'rejected')}><IC n="x" s={11}/></button></>}
                      <button className="btn btn-xs btn-ghost" onClick={()=>del(t.id)}><IC n="trash" s={11}/></button>
                    </div></td>}
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   ASSETS PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function AssetsPage({ db, save, user }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [filter, setFilter] = useState('all');
  const isAdmin=['admin','super_admin'].includes(user.role);
  const catIcons={'Laptop':'Laptop','Monitor':'Monitor','Peripheral':'Peripheral','Audio':'Audio','Mobile':'Mobile','Other':'Asset'};

  const list=isAdmin?db.assets.filter(a=>filter==='all'||a.status===filter):db.assets.filter(a=>a.uid===user.id);
  const openAdd=()=>{setForm({name:'',serial:'',cat:'Laptop',status:'available',uid:null,condition:'New',loc:''});setModal(true);};
  const openEdit=a=>{setForm({...a});setModal(true);};
  const save_=e=>{e.preventDefault();if(form.id){save('assets',db.assets.map(a=>a.id===form.id?form:a));}else{save('assets',[...db.assets,{...form,id:Date.now()}]);}setModal(false);};
  const del=id=>{if(confirm('Delete asset?'))save('assets',db.assets.filter(a=>a.id!==id));};

  return (
    <div className="anim-fadeup">
      <PageHdr title="Asset Registry" sub={`${db.assets.length} assets tracked`}>
        {isAdmin&&<button className="btn btn-dark" onClick={openAdd}><IC n="plus"/> Add Asset</button>}
      </PageHdr>

      {isAdmin&&<div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {['all','available','assigned','maintenance'].map(f=>(
          <button key={f} className="btn btn-sm btn-ghost" style={{...(filter===f?{background:'var(--void)',color:'#fff',borderColor:'var(--void)'}:{})}} onClick={()=>setFilter(f)}>
            {f==='all'?'All Assets':f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:16}}>
        {list.map(a=>{
          const emp=db.users.find(u=>u.id===a.uid);
          return <div key={a.id} className="card" style={{padding:22}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:'var(--amber)'}}>{catIcons[a.cat]||'Asset'}</div>
              <span className={`badge ${a.status==='available'?'b-success':a.status==='assigned'?'b-info':'b-orange'}`}><span className="badge-dot"/>{a.status}</span>
            </div>
            <div style={{fontWeight:800,fontSize:15,letterSpacing:'-.3px',marginBottom:4}}>{a.name}</div>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--text-muted)',marginBottom:12}}>{a.serial}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:12,marginBottom:14}}>
              <div style={{background:'var(--bg-body)',padding:'6px 10px',borderRadius:8}}><div style={{color:'var(--text-muted)',marginBottom:1}}>Category</div><div style={{fontWeight:700}}>{a.cat}</div></div>
              <div style={{background:'var(--bg-body)',padding:'6px 10px',borderRadius:8}}><div style={{color:'var(--text-muted)',marginBottom:1}}>Condition</div><div style={{fontWeight:700}}>{a.condition}</div></div>
              <div style={{background:'var(--bg-body)',padding:'6px 10px',borderRadius:8}}><div style={{color:'var(--text-muted)',marginBottom:1}}>Location</div><div style={{fontWeight:700}}>{a.loc}</div></div>
              <div style={{background:'var(--bg-body)',padding:'6px 10px',borderRadius:8}}><div style={{color:'var(--text-muted)',marginBottom:1}}>Assigned To</div><div style={{fontWeight:700}}>{emp?.name?.split(' ')[0]||'-'}</div></div>
            </div>
            {isAdmin&&<div style={{display:'flex',gap:6}}>
              <button className="btn btn-sm btn-ghost" style={{flex:1}} onClick={()=>openEdit(a)}><IC n="edit" s={12}/> Edit</button>
              <button className="btn btn-sm btn-red" onClick={()=>del(a.id)}><IC n="trash" s={12}/></button>
            </div>}
          </div>;
        })}
        {list.length===0&&<div className="empty-state"><span className="empty-state-icon"><IC n="card" s={48} style={{color:'var(--text-muted)'}}/></span><h3>No assets found</h3></div>}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={form.id?'Edit Asset':'Add Asset'}>
        <form onSubmit={save_}>
          <div className="form-group"><label className="form-label">Asset Name</label><input className="form-input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Serial Number</label><input className="form-input mono" value={form.serial||''} onChange={e=>setForm({...form,serial:e.target.value})}/></div>
            <div className="form-group"><label className="form-label">Category</label><select className="form-input" value={form.cat||'Laptop'} onChange={e=>setForm({...form,cat:e.target.value})}>{Object.keys(catIcons).map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={form.status||'available'} onChange={e=>setForm({...form,status:e.target.value})}><option value="available">Available</option><option value="assigned">Assigned</option><option value="maintenance">Maintenance</option></select></div>
            <div className="form-group"><label className="form-label">Condition</label><select className="form-input" value={form.condition||'Good'} onChange={e=>setForm({...form,condition:e.target.value})}><option>New</option><option>Excellent</option><option>Good</option><option>Fair</option><option>Needs Repair</option></select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={form.loc||''} onChange={e=>setForm({...form,loc:e.target.value})}/></div>
            <div className="form-group"><label className="form-label">Assign To</label><select className="form-input" value={form.uid||''} onChange={e=>setForm({...form,uid:e.target.value?parseInt(e.target.value):null})}><option value="">- Unassigned -</option>{db.users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          </div>
          <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button><button type="submit" className="btn btn-dark">Save Asset</button></div>
        </form>
      </Modal>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   EXPENSES PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function ExpensesPage({ db, save, user }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({title:'',cat:'Cloud & Infra',amount:'',date:new Date().toISOString().split('T')[0],notes:''});
  const isAdmin=['admin','super_admin'].includes(user.role);

  const submit=e=>{
    e.preventDefault();
    save('expenses',[{id:Date.now(),uid:user.id,...form,amount:parseFloat(form.amount),status:'pending'},...db.expenses]);
    setModal(false); setForm({title:'',cat:'Cloud & Infra',amount:'',date:new Date().toISOString().split('T')[0],notes:''});
    alert('Expense claim submitted!');
  };
  const decide=(id,status)=>{
    const note=status==='rejected'?prompt('Rejection reason:'):null;
    if(status==='rejected'&&note===null)return;
    save('expenses',db.expenses.map(e=>e.id===id?{...e,status,by:user.id,note}:e));
  };

  const list=isAdmin?db.expenses:db.expenses.filter(e=>e.uid===user.id);
  const approved=list.filter(e=>e.status==='approved').reduce((s,e)=>s+e.amount,0);
  const pending=list.filter(e=>e.status==='pending').reduce((s,e)=>s+e.amount,0);

  return (
    <div className="anim-fadeup">
      <PageHdr title="Expenses" sub={`$${approved.toLocaleString()} approved · $${pending.toLocaleString()} pending`}>
        <button className="btn btn-dark" onClick={()=>setModal(true)}><IC n="plus"/> File Claim</button>
      </PageHdr>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Employee</th><th>Description</th><th>Category</th><th>Amount</th><th>Date</th><th>Status</th>{isAdmin&&<th>Actions</th>}</tr></thead>
            <tbody>
              {list.length===0&&<tr><td colSpan={isAdmin?7:6}><div className="empty-state"><span className="empty-state-icon"><IC n="receipt" s={48} style={{color:'var(--text-muted)'}}/></span><h3>No expense claims</h3><p>File a claim to get started</p></div></td></tr>}
              {list.sort((a,b)=>b.date.localeCompare(a.date)).map(e=>{
                const emp=db.users.find(u=>u.id===e.uid);
                return <tr key={e.id}>
                  <td><div className="emp-cell"><img src={emp?.avatar} className="tbl-av" alt=""/><div><div style={{fontWeight:700,fontSize:13}}>{emp?.name}</div><div style={{fontSize:11,color:'var(--text-muted)'}}>{emp?.title}</div></div></div></td>
                  <td style={{fontWeight:600,maxWidth:220}}>{e.title}</td>
                  <td><span className="tag" style={{fontSize:11}}>{e.cat}</span></td>
                  <td style={{fontFamily:'JetBrains Mono,monospace',fontWeight:800,fontSize:15}}>${parseFloat(e.amount).toLocaleString()}</td>
                  <td style={{fontSize:12,color:'var(--text-muted)'}}>{e.date}</td>
                  <td><span className={`badge ${e.status==='approved'?'b-success':e.status==='rejected'?'b-error':'b-pending'}`}><span className="badge-dot"/>{e.status}</span></td>
                  {isAdmin&&<td>
                    {e.status==='pending'
                      ?<div style={{display:'flex',gap:5}}><button className="btn btn-xs btn-green" onClick={()=>decide(e.id,'approved')}><IC n="check" s={11}/> Approve</button><button className="btn btn-xs btn-red" onClick={()=>decide(e.id,'rejected')}><IC n="x" s={11}/></button></div>
                      :<span style={{fontSize:12,color:'var(--text-light)'}}>Decided</span>}
                  </td>}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="File Expense Claim" subtitle="Submit a reimbursement request for review">
        <form onSubmit={submit}>
          <div className="form-group"><label className="form-label">Expense Title</label><input className="form-input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. AWS Monthly Subscription" required/></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Category</label><select className="form-input" value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})}><option>Cloud & Infra</option><option>Meals & Entertainment</option><option>Travel</option><option>Office Supplies</option><option>Marketing</option><option>SaaS Tools</option><option>Training</option><option>Other</option></select></div>
            <div className="form-group"><label className="form-label">Amount (USD)</label><input type="number" step="0.01" min="0.01" className="form-input" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00" required/></div>
          </div>
          <div className="form-group"><label className="form-label">Date of Expense</label><input type="date" className="form-input" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
          <div className="form-group"><label className="form-label">Additional Notes</label><textarea className="form-input" rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Context or justification..."/></div>
          <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button><button type="submit" className="btn btn-dark"><IC n="send" s={14}/> Submit Claim</button></div>
        </form>
      </Modal>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   DOCUMENTS PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function DocumentsPage({ db, save, user }) {
  const [modal, setModal] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selTemp, setSelTemp] = useState(1);
  const [selEmp, setSelEmp] = useState(user.id);
  const isAdmin=['admin','super_admin'].includes(user.role);

  const generate=()=>{
    const t=db.templates.find(x=>x.id===parseInt(selTemp));
    const emp=db.users.find(x=>x.id===parseInt(selEmp));
    const issuer=db.users.find(u=>u.role==='admin'||u.role==='super_admin');
    if(!t||!emp) return;
    const today=new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
    const body=t.body.replace(/\{\{NAME\}\}/g,emp.name).replace(/\{\{EID\}\}/g,emp.eid).replace(/\{\{JOIN\}\}/g,emp.joined).replace(/\{\{TITLE\}\}/g,emp.title).replace(/\{\{ISSUER\}\}/g,issuer?.name||'HR Manager').replace(/\{\{TODAY\}\}/g,today);
    const doc={id:Date.now(),uid:parseInt(selEmp),title:`${t.name} - ${emp.name}`,type:t.name,body,date:new Date().toISOString().split('T')[0]};
    save('documents',[doc,...db.documents]);
    setModal(false); setPreview(doc);
  };

  const myDocs=isAdmin?db.documents:db.documents.filter(d=>d.uid===user.id);

  return (
    <div className="anim-fadeup">
      <PageHdr title="Documents" sub="HR letters, certificates & generated records">
        {isAdmin&&<button className="btn btn-dark" onClick={()=>setModal(true)}><IC n="plus"/> Generate Document</button>}
      </PageHdr>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
        {myDocs.map(doc=>(
          <div key={doc.id} className="card" style={{padding:24}}>
            <div style={{marginBottom:14}}><IC n="file" s={36} style={{color:'var(--amber)'}}/></div>
            <div style={{fontWeight:800,fontSize:15,marginBottom:6,letterSpacing:'-.3px'}}>{doc.title}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:4}}><span className="badge b-gray">{doc.type}</span></div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:18}}>Generated {doc.date}</div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-sm btn-ghost" style={{flex:1}} onClick={()=>setPreview(doc)}><IC n="eye" s={12}/> Preview</button>
              <button className="btn btn-sm btn-dark" onClick={()=>window.print()}><IC n="print" s={12}/></button>
            </div>
          </div>
        ))}
        {myDocs.length===0&&<div className="empty-state"><span className="empty-state-icon"><IC n="file" s={48} style={{color:'var(--text-muted)'}}/></span><h3>No documents yet</h3><p>{isAdmin?'Generate an HR document using a template':'Documents generated for you will appear here'}</p></div>}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Generate HR Document" subtitle="Select a template and employee to create a document">
        <div className="form-group"><label className="form-label">Template</label><select className="form-input" value={selTemp} onChange={e=>setSelTemp(e.target.value)}>{db.templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div className="form-group"><label className="form-label">For Employee</label><select className="form-input" value={selEmp} onChange={e=>setSelEmp(e.target.value)}>{db.users.map(u=><option key={u.id} value={u.id}>{u.name} ({u.eid})</option>)}</select></div>
        <div className="btn-row"><button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-dark" onClick={generate}>Generate Document</button></div>
      </Modal>

      <Modal open={!!preview} onClose={()=>setPreview(null)} title={preview?.title||'Document'}>
        {preview&&<>
          <div className="doc-preview">{preview.body}</div>
          <div className="btn-row"><button className="btn btn-ghost" onClick={()=>setPreview(null)}>Close</button><button className="btn btn-dark" onClick={()=>window.print()}><IC n="print" s={14}/> Print</button></div>
        </>}
      </Modal>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   ONBOARDING PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function OnboardingPage({ db, save, user }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({uid:'',role:'',start:''});

  const toggle=tid=>save('tasks',db.tasks.map(t=>t.id===tid?{...t,done:t.done?0:1}:t));
  const addHire=e=>{
    e.preventDefault();
    const id=Date.now();
    save('onboarding',[...db.onboarding,{id,uid:parseInt(form.uid),role:form.role,start:form.start,progress:0,status:'in_progress'}]);
    const newTasks=[{task:'Submit ID proofs & tax documents',who:'employee'},{task:'Configure payroll & bank account',who:'admin'},{task:'Provision equipment (laptop, peripherals)',who:'admin'},{task:'Complete orientation & HR handbook',who:'employee'},{task:'Setup accounts (email, Slack, tools)',who:'admin'},{task:'First week 1:1 with team lead',who:'employee'}];
    save('tasks',[...db.tasks,...newTasks.map((t,i)=>({id:Date.now()+i+1,hid:id,...t,done:0}))]);
    setModal(false);
  };

  return (
    <div className="anim-fadeup">
      <PageHdr title="Onboarding" sub="New hire checklists and progress tracking">
        <button className="btn btn-dark" onClick={()=>setModal(true)}><IC n="adduser"/> Add New Hire</button>
      </PageHdr>

              <span className="empty-state-icon"><IC n="terminal" s={48} style={{color:'var(--text-muted)'}}/></span>

      {db.onboarding.map(hire=>{
        const emp=db.users.find(u=>u.id===hire.uid);
        const hireTasks=db.tasks.filter(t=>t.hid===hire.id);
        const done=hireTasks.filter(t=>t.done).length;
        const pct=hireTasks.length?Math.round((done/hireTasks.length)*100):0;
        const pctColor=pct===100?'var(--green)':pct>50?'var(--amber)':'var(--blue)';

        return <div key={hire.id} className="card" style={{marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',gap:18,marginBottom:22,flexWrap:'wrap'}}>
            {emp&&<img src={emp.avatar} style={{width:60,height:60,borderRadius:'50%',border:'3px solid var(--amber)',boxShadow:'var(--shadow-amber)'}} alt=""/>}
            <div style={{flex:1}}>
              <div style={{fontFamily:'Outfit',fontWeight:900,fontSize:22,letterSpacing:'-.5px'}}>{emp?.name||'New Hire'}</div>
              <div style={{fontSize:14,color:'var(--text-muted)'}}>{hire.role} · Starting {hire.start}</div>
            </div>
            <div style={{textAlign:'center',background:pct===100?'var(--green-light)':'var(--amber-light)',padding:'12px 20px',borderRadius:16}}>
              <div style={{fontFamily:'Outfit',fontSize:36,fontWeight:900,color:pctColor,lineHeight:1}}>{pct}%</div>
              <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:600,marginTop:2}}>{done}/{hireTasks.length} tasks</div>
            </div>
          </div>
          <div style={{marginBottom:18}}><div className="progress-track progress-lg"><div className="progress-fill" style={{width:`${pct}%`,background:pctColor}}/></div></div>
          <div>
            {hireTasks.map(t=>(
              <div key={t.id} className={`checklist-item ${t.done?'done':''}`}>
                <div className={`check-box ${t.done?'checked':''}`} onClick={()=>toggle(t.id)}>
                  {t.done&&<IC n="check" s={13}/>}
                </div>
                <span className="check-text">{t.task}</span>
                <span className="tag" style={{fontSize:10}}>{t.who}</span>
              </div>
            ))}
          </div>
        </div>;
      })}

      <Modal open={modal} onClose={()=>setModal(false)} title="Start New Hire Onboarding">
        <form onSubmit={addHire}>
          <div className="form-group"><label className="form-label">Employee</label><select className="form-input" value={form.uid} onChange={e=>setForm({...form,uid:e.target.value})} required><option value="">- Select Employee -</option>{db.users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Role / Position</label><input className="form-input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})} placeholder="e.g. Senior Software Engineer" required/></div>
          <div className="form-group"><label className="form-label">Start Date</label><input type="date" className="form-input" value={form.start} onChange={e=>setForm({...form,start:e.target.value})} required/></div>
          <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button><button type="submit" className="btn btn-dark">Begin Onboarding</button></div>
        </form>
      </Modal>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   NOTIFICATIONS PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function NotificationsPage({ db, save, user }) {
  const [activeTab, setActiveTab] = useState('inbox');
  
  // Send state
  const [targetUser, setTargetUser] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notifType, setNotifType] = useState('General');

  // Template state
  const [tplName, setTplName] = useState('');
  const [tplTitle, setTplTitle] = useState('');
  const [tplBody, setTplBody] = useState('');

  // Rules / Channels states
  const [emailEnabled, setEmailEnabled] = useState(db.settings?.notifEmailEnabled ?? true);
  const [smsEnabled, setSmsEnabled] = useState(db.settings?.notifSmsEnabled ?? false);
  const [pushEnabled, setPushEnabled] = useState(db.settings?.notifPushEnabled ?? true);
  const [autoBirthday, setAutoBirthday] = useState(db.settings?.notifAutoBirthday ?? true);
  const [autoAppraisal, setAutoAppraisal] = useState(db.settings?.notifAutoAppraisal ?? true);

  const isHR = user.role === 'admin';
  const isSA = user.role === 'super_admin';
  const canManage = isHR || isSA;

  // Data helpers
  const my = (db.notifications || []).filter(n => !n.to || n.to === user.id);
  const unreadCount = my.filter(n => !n.read).length;

  const handleMarkRead = (id) => {
    const updated = db.notifications.map(n => n.id === id ? { ...n, read: 1 } : n);
    save('notifications', updated);
  };

  const handleMarkAllRead = () => {
    const updated = db.notifications.map(n => {
      if (!n.to || n.to === user.id) {
        return { ...n, read: 1 };
      }
      return n;
    });
    save('notifications', updated);
    alert('All notifications marked as read.');
  };

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!subject || !message) return;

    const newNotif = {
      id: Date.now(),
      from: user.id,
      to: targetUser ? parseInt(targetUser) : null,
      title: subject,
      msg: message,
      type: notifType,
      read: 0,
      at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
      status: scheduledAt ? 'scheduled' : 'sent'
    };

    save('notifications', [newNotif, ...(db.notifications || [])]);
    setTargetUser('');
    setSubject('');
    setMessage('');
    setScheduledAt('');
    setNotifType('General');
    alert(scheduledAt ? 'Notification successfully scheduled!' : 'Notification sent successfully!');
  };

  const handleCreateTemplate = (e) => {
    e.preventDefault();
    if (!tplName || !tplTitle || !tplBody) return;

    const newTpl = {
      id: Date.now(),
      name: tplName,
      title: tplTitle,
      body: tplBody
    };

    save('notificationTemplates', [...(db.notificationTemplates || []), newTpl]);
    setTplName('');
    setTplTitle('');
    setTplBody('');
    alert('Notification template created successfully!');
  };

  const handleApplyTemplate = (tplId) => {
    const tpl = db.notificationTemplates?.find(t => t.id === tplId);
    if (!tpl) return;
    setSubject(tpl.title);
    setMessage(tpl.body);
  };

  const handleSaveRules = (e) => {
    e.preventDefault();
    if (!isSA) return;
    save('settings', {
      ...db.settings,
      notifEmailEnabled: emailEnabled,
      notifSmsEnabled: smsEnabled,
      notifPushEnabled: pushEnabled,
      notifAutoBirthday: autoBirthday,
      notifAutoAppraisal: autoAppraisal
    });
    alert('Rules & channel configuration saved!');
  };

  return (
    <div className="card anim-fadeup" style={{ maxWidth: '100%' }}>
      <div className="card-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="section-title">Smart Notifications</div>
          <div className="section-sub">Receive instant operational alerts, configure dispatch rules, and schedule broadcasts</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${activeTab === 'inbox' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('inbox')}>📥 Inbox ({unreadCount} new)</button>
        {canManage && (
          <>
            <button className={`btn btn-sm ${activeTab === 'send' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('send')}>📣 Send & Schedule</button>
            <button className={`btn btn-sm ${activeTab === 'templates' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('templates')}>📋 Templates</button>
          </>
        )}
        {isSA && (
          <button className={`btn btn-sm ${activeTab === 'rules' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('rules')}>⚙ Rules & Channels</button>
        )}
      </div>

      {/* TABS */}
      {activeTab === 'inbox' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead} disabled={unreadCount === 0}>Mark All Read</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {my.map(n => {
              const sender = db.users?.find(u => u.id === n.from);
              const isScheduled = n.status === 'scheduled';
              return (
                <div 
                  key={n.id} 
                  style={{
                    background: n.read ? 'var(--bg-surface)' : 'var(--bg-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 16,
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                    opacity: isScheduled ? 0.75 : 1
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 24 }}>🔔</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: n.read ? 700 : 900, color: 'var(--text-primary)' }}>{n.title}</div>
                        {n.type && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'var(--accent-light)', color: 'var(--accent)' }}>{n.type}</span>
                        )}
                        {isScheduled && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#FEF3C7', color: '#D97706' }}>SCHEDULED</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{n.msg}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
                        From: {sender?.name || 'System'} · Date: {new Date(n.at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {!n.read && !isScheduled && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleMarkRead(n.id)} style={{ fontSize: 11, padding: '3px 8px' }}>Mark read</button>
                  )}
                </div>
              );
            })}
            {my.length === 0 && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Your notifications inbox is empty.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'send' && canManage && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 20 }}>
          <form onSubmit={handleSendBroadcast} style={{ background: 'var(--bg-raised)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>Broadcast or Schedule Alert</div>
            
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Recipient Employee</label>
              <select className="form-input" value={targetUser} onChange={e => setTargetUser(e.target.value)}>
                <option value="">Broadcast to All Employees</option>
                {db.users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.title})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Alert Category</label>
                <select className="form-input" value={notifType} onChange={e => setNotifType(e.target.value)}>
                  <option value="General">General Broadcast</option>
                  <option value="Salary">Salary Credited</option>
                  <option value="Leave">Leave Approved</option>
                  <option value="Appraisal">Appraisal review</option>
                  <option value="Training">Training assignment</option>
                  <option value="Policy">Policy Update</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Schedule Release (Optional)</label>
                <input className="form-input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Subject / Title</label>
              <input className="form-input" placeholder="e.g. Leave Request Approved" value={subject} onChange={e => setSubject(e.target.value)} required />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Message Content</label>
              <textarea className="form-input" placeholder="Compose alert body..." rows={4} value={message} onChange={e => setMessage(e.target.value)} required />
            </div>

            <button className="btn btn-dark" type="submit">Dispatch Notification</button>
          </form>

          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', marginBottom: 8 }}>Templates Library</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {db.notificationTemplates?.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => handleApplyTemplate(t.id)} 
                  style={{
                    border: '1px solid var(--border)',
                    padding: 12,
                    borderRadius: 8,
                    background: 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  className="tab-hover"
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Subject: {t.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && canManage && (
        <form onSubmit={handleCreateTemplate} style={{ background: 'var(--bg-raised)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', maxWidth: 600 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>Create Notification Template</div>
          
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Template Unique Name</label>
            <input className="form-input" placeholder="e.g. Leave Rejection Notice" value={tplName} onChange={e => setTplName(e.target.value)} required />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Default Title</label>
            <input className="form-input" placeholder="e.g. Leave Application Update" value={tplTitle} onChange={e => setTplTitle(e.target.value)} required />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Template Body (Use standard placeholder texts)</label>
            <textarea className="form-input" placeholder="e.g. Hi {{name}}, unfortunately your leave request has been declined..." rows={4} value={tplBody} onChange={e => setTplBody(e.target.value)} required />
          </div>

          <button className="btn btn-dark" type="submit">Save Template</button>
        </form>
      )}

      {activeTab === 'rules' && isSA && (
        <form onSubmit={handleSaveRules} style={{ background: 'var(--bg-raised)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', maxWidth: 600 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>Rules & Channel Configuration</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Email Dispatch Integration</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Send mirror notifications to employee primary emails</div>
              </div>
              <input type="checkbox" checked={emailEnabled} onChange={e => setEmailEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
            </div>

            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>SMS Text Dispatch</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Send notification summaries via Twilio SMS API</div>
              </div>
              <input type="checkbox" checked={smsEnabled} onChange={e => setSmsEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
            </div>

            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Web Push Notifications</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Trigger browser popups when CEGSOS is in background</div>
              </div>
              <input type="checkbox" checked={pushEnabled} onChange={e => setPushEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
            </div>

            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Auto Birthday Reminders</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Automatically trigger birthday posts at midnight</div>
              </div>
              <input type="checkbox" checked={autoBirthday} onChange={e => setAutoBirthday(e.target.checked)} style={{ width: 18, height: 18 }} />
            </div>

            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Auto Appraisal Warnings</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Warn employees 15 days before appraisal deadlines</div>
              </div>
              <input type="checkbox" checked={autoAppraisal} onChange={e => setAutoAppraisal(e.target.checked)} style={{ width: 18, height: 18 }} />
            </div>
          </div>

          <button className="btn btn-dark" type="submit">Save Settings Policies</button>
        </form>
      )}
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   USER MANAGEMENT PAGE (Super Admin)
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function UsersPage({ db, save, user }) {
  const changeRole=(uid,role)=>save('users',db.users.map(u=>u.id===uid?{...u,role}:u));
  const toggleStatus=uid=>save('users',db.users.map(u=>u.id===uid?{...u,status:u.status==='active'?'inactive':'active'}:u));

  const modules=['Dashboard','Attendance','Leave Requests','Timesheets','Expenses','Documents','Assets','Employees','Departments','Org Chart','Payroll','Onboarding','User Management','System Settings'];
  const employeeAccess=[1,1,1,1,1,1,1,0,0,0,0,0,0,0];
  const adminAccess=[1,1,1,1,1,1,1,1,1,1,1,1,0,0];

  return (
    <div className="anim-fadeup">
      <PageHdr title="User Management" sub="Role assignment, access control & permissions"/>

      <div className="card" style={{marginBottom:24}}>
        <div className="card-hdr"><div className="section-title">Module Access Matrix</div><span className="badge b-purple">Super Admin view only</span></div>
        <div style={{overflowX:'auto'}}>
          <table className="perm-tbl">
            <thead><tr><th>Module</th><th>Employee</th><th>Admin (HR)</th><th>Super Admin</th></tr></thead>
            <tbody>
              {modules.map((m,i)=>(
                <tr key={m}>
                  <td>{m}</td>
                  <td><input type="checkbox" className="perm-check" checked={!!employeeAccess[i]} readOnly/></td>
                  <td><input type="checkbox" className="perm-check" checked={!!adminAccess[i]} readOnly/></td>
                  <td><input type="checkbox" className="perm-check" checked readOnly/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-hdr"><div className="section-title">All System Users</div><span className="tag">{db.users.length} accounts</span></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>User</th><th>Current Role</th><th>Status</th><th>Department</th><th>Last Login</th><th>Change Role</th><th>Actions</th></tr></thead>
            <tbody>
              {db.users.map(u=>{
                const dept=db.departments.find(d=>d.id===u.deptId);
                return <tr key={u.id}>
                  <td><div className="emp-cell"><img src={u.avatar} className="tbl-av" alt=""/><div><div style={{fontWeight:700,fontSize:13}}>{u.name}</div><div style={{fontSize:11,color:'var(--text-muted)',fontFamily:'JetBrains Mono,monospace'}}>{u.email}</div></div></div></td>
                  <td><span className={`badge ${u.role==='super_admin'?'b-purple':u.role==='admin'?'b-info':'b-gray'}`}><span className="badge-dot"/>{u.role.replace('_',' ')}</span></td>
                  <td><span className={`badge ${u.status==='active'?'b-success':u.status==='on_leave'?'b-pending':'b-error'}`}><span className="badge-dot"/>{u.status.replace('_',' ')}</span></td>
                  <td>{dept&&<span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:13}}><span style={{width:8,height:8,borderRadius:'50%',background:dept.color,display:'inline-block'}}/>{dept.name}</span>}</td>
                  <td style={{fontSize:12,color:'var(--text-muted)',fontFamily:'JetBrains Mono,monospace'}}>{u.lastLogin?new Date(u.lastLogin).toLocaleDateString():'-'}</td>
                  <td>
                    <select className="form-input" style={{width:140,fontSize:12}} value={u.role} onChange={e=>changeRole(u.id,e.target.value)} disabled={u.id===user.id}>
                      <option value="employee">Employee</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td>
                    <button className={`btn btn-sm ${u.status==='active'?'btn-red':'btn-green'}`} onClick={()=>toggleStatus(u.id)} disabled={u.id===user.id}>
                      {u.status==='active'?'Deactivate':'Activate'}
                    </button>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   SETTINGS PAGE (Super Admin)
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function SettingsPage({ db, save, user }) {
  const isSA = user.role === 'super_admin';
  const [tab, setTab] = useState('company');
  const [s, setS] = useState(JSON.parse(JSON.stringify(db.settings)));
  const [saved, setSaved] = useState(false);

  // User-specific preferences state
  const [userPrefs, setUserPrefs] = useState(() => {
    const defaultPrefs = {
      emailNotifications: true,
      weeklyDigest: false,
      darkMode: false,
      compactView: false,
      defaultLanguage: 'English'
    };
    try {
      const stored = localStorage.getItem('prefs_' + user.id);
      return stored ? JSON.parse(stored) : defaultPrefs;
    } catch {
      return defaultPrefs;
    }
  });

  const saveUserPrefs = (e) => {
    e.preventDefault();
    localStorage.setItem('prefs_' + user.id, JSON.stringify(userPrefs));
    alert('User preferences saved successfully.');
  };

  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      alert('New password and confirmation do not match!');
      return;
    }
    alert('Password updated successfully! (Mock confirmation)');
    setPasswordForm({ current: '', newPass: '', confirm: '' });
  };

  if (!isSA) {
    return (
      <div className="card anim-fadeup" style={{ maxWidth: 720 }}>
        <div className="card-hdr">
          <div>
            <div className="section-title">My Settings</div>
            <div className="section-sub">Configure your personal application preferences and account security settings</div>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, marginTop: 10 }}>
          {/* Preferences Form */}
          <form onSubmit={saveUserPrefs} className="card" style={{ padding: 20, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', marginBottom: 16 }}>Interface & Notifications</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Email Notifications</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Receive email alerts on status changes and announcements</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={userPrefs.emailNotifications} 
                  onChange={e => setUserPrefs({ ...userPrefs, emailNotifications: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Weekly Digest</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Get a weekly summary of timesheets and attendance history</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={userPrefs.weeklyDigest} 
                  onChange={e => setUserPrefs({ ...userPrefs, weeklyDigest: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Compact View Mode</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Reduce table row paddings to fit more content on screen</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={userPrefs.compactView} 
                  onChange={e => setUserPrefs({ ...userPrefs, compactView: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>

              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Preferred Language</label>
                <select 
                  className="form-input" 
                  value={userPrefs.defaultLanguage} 
                  onChange={e => setUserPrefs({ ...userPrefs, defaultLanguage: e.target.value })}
                  style={{ marginTop: 4 }}
                >
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                </select>
              </div>
            </div>
            
            <button className="btn btn-dark" style={{ marginTop: 20 }} type="submit">Save Preferences</button>
          </form>

          {/* Password Reset Form */}
          <form onSubmit={handlePasswordChange} className="card" style={{ padding: 20, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', marginBottom: 16 }}>Change Password</div>
            
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input 
                type="password" 
                className="form-input" 
                value={passwordForm.current} 
                onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                required 
              />
            </div>
            
            <div className="form-row" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={passwordForm.newPass} 
                  onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={passwordForm.confirm} 
                  onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  required 
                />
              </div>
            </div>
            
            <button className="btn btn-dark" style={{ marginTop: 20 }} type="submit">Update Password</button>
          </form>
        </div>
      </div>
    );
  }

  // Fallback for Super Admin System Settings (Original Settings Page)


  const saveFn = () => {
    save('settings', s);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2500);
  };

  const Section = ({ title, children }) => (
    <div className="card" style={{marginBottom:20}}>
      <div className="card-hdr"><div className="section-title">{title}</div></div>
      {children}
    </div>
  );

  return (
    <div className="anim-fadeup">
      <PageHdr title="System Settings" sub="Configure company, policies & security parameters">
        <button className="btn btn-amber" onClick={saveFn} style={{...(saved?{background:'var(--green)',boxShadow:'none'}:{})}}>
          {saved ? <><IC n="check" s={14}/> Saved!</> : 'Save All Changes'}
        </button>
      </PageHdr>

      <div className="tabs-bar">
        {[['company','Company'],['hours','Hours'],['leave','Leave'],['payroll','Payroll'],['security','Security']].map(([k,l])=>(
          <button key={k} className={`tab-btn ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab==='company'&&<Section title="Company Profile">
        <div className="form-row">
          <div className="form-group"><label className="form-label">Company Name</label><input className="form-input" value={s.company?.name||''} onChange={e=>setS({...s,company:{...s.company,name:e.target.value}})}/></div>
          <div className="form-group"><label className="form-label">Tax ID</label><input className="form-input mono" value={s.company?.taxId||''} onChange={e=>setS({...s,company:{...s.company,taxId:e.target.value}})}/></div>
        </div>
        <div className="form-group"><label className="form-label">Head Office Address</label><input className="form-input" value={s.company?.address||''} onChange={e=>setS({...s,company:{...s.company,address:e.target.value}})}/></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Contact Phone</label><input className="form-input" value={s.company?.phone||''} onChange={e=>setS({...s,company:{...s.company,phone:e.target.value}})}/></div>
          <div className="form-group"><label className="form-label">HR Email</label><input type="email" className="form-input" value={s.company?.email||''} onChange={e=>setS({...s,company:{...s.company,email:e.target.value}})}/></div>
        </div>
        <div className="form-group"><label className="form-label">Website</label><input className="form-input" value={s.company?.website||''} onChange={e=>setS({...s,company:{...s.company,website:e.target.value}})}/></div>
      </Section>}

      {tab==='hours'&&<Section title="Working Hours Configuration">
        <div className="form-row">
          <div className="form-group"><label className="form-label">Shift Start</label><input type="time" className="form-input" value={s.hours?.start||'10:00'} onChange={e=>setS({...s,hours:{...s.hours,start:e.target.value}})}/></div>
          <div className="form-group"><label className="form-label">Shift End</label><input type="time" className="form-input" value={s.hours?.end||'19:00'} onChange={e=>setS({...s,hours:{...s.hours,end:e.target.value}})}/></div>
        </div>
        <div className="form-group" style={{maxWidth:300}}><label className="form-label">Late Grace Period (minutes)</label><input type="number" min={0} max={60} className="form-input" value={s.hours?.grace||15} onChange={e=>setS({...s,hours:{...s.hours,grace:parseInt(e.target.value)}})}/></div>
        <div className="form-group"><label className="form-label">Working Days</label><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>{
            const active=(s.hours?.days||['Mon','Tue','Wed','Thu','Fri']).includes(d);
            return <div key={d} style={{width:48,height:40,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .2s',background:active?'var(--void)':'var(--bg-body)',color:active?'var(--amber)':'var(--text-muted)',border:active?'none':'1px solid var(--border)'}} onClick={()=>{const days=s.hours?.days||[];const next=days.includes(d)?days.filter(x=>x!==d):[...days,d];setS({...s,hours:{...s.hours,days:next}});}}>{d}</div>;
          })}
        </div></div>
      </Section>}

      {tab==='leave'&&<Section title="Annual Leave Allowances">
        <div className="form-row">
          <div className="form-group"><label className="form-label">Vacation Days</label><input type="number" min={0} className="form-input" value={s.leave?.vacation||20} onChange={e=>setS({...s,leave:{...s.leave,vacation:parseInt(e.target.value)}})}/></div>
          <div className="form-group"><label className="form-label">Sick Days</label><input type="number" min={0} className="form-input" value={s.leave?.sick||15} onChange={e=>setS({...s,leave:{...s.leave,sick:parseInt(e.target.value)}})}/></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Casual Days</label><input type="number" min={0} className="form-input" value={s.leave?.casual||10} onChange={e=>setS({...s,leave:{...s.leave,casual:parseInt(e.target.value)}})}/></div>
          <div className="form-group"><label className="form-label">Personal Days</label><input type="number" min={0} className="form-input" value={s.leave?.personal||7} onChange={e=>setS({...s,leave:{...s.leave,personal:parseInt(e.target.value)}})}/></div>
        </div>
        <div className="form-group"><label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}><input type="checkbox" checked={s.leave?.carryForward||false} onChange={e=>setS({...s,leave:{...s.leave,carryForward:e.target.checked}})} style={{width:18,height:18,accentColor:'var(--amber)'}}/><span style={{fontWeight:600,fontSize:14}}>Allow carry-forward of unused leave to next year</span></label></div>
      </Section>}

      {tab==='payroll'&&<Section title="Payroll & Tax Configuration">
        <div className="form-row">
          <div className="form-group"><label className="form-label">Income Tax Rate (%)</label><input type="number" step=".1" min={0} max={50} className="form-input" value={s.payroll?.taxPct||10} onChange={e=>setS({...s,payroll:{...s.payroll,taxPct:parseFloat(e.target.value)}})}/></div>
          <div className="form-group"><label className="form-label">Provident Fund (%)</label><input type="number" step=".1" min={0} max={20} className="form-input" value={s.payroll?.pfPct||5} onChange={e=>setS({...s,payroll:{...s.payroll,pfPct:parseFloat(e.target.value)}})}/></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Overtime Rate (₹/hr)</label><input type="number" min={0} className="form-input" value={s.payroll?.overtimeRate||28} onChange={e=>setS({...s,payroll:{...s.payroll,overtimeRate:parseFloat(e.target.value)}})}/></div>
          <div className="form-group"><label className="form-label">Pay Cycle</label><select className="form-input" value={s.payroll?.payCycle||'Monthly'} onChange={e=>setS({...s,payroll:{...s.payroll,payCycle:e.target.value}})}><option>Monthly</option><option>Bi-Weekly</option><option>Weekly</option></select></div>
        </div>
      </Section>}

      {tab==='security'&&<Section title="Security & Access Control">
        <div className="form-row">
          <div className="form-group"><label className="form-label">Session Timeout (minutes)</label><input type="number" min={15} max={480} className="form-input" value={s.security?.sessionTimeout||120} onChange={e=>setS({...s,security:{...s.security,sessionTimeout:parseInt(e.target.value)}})}/></div>
          <div className="form-group"><label className="form-label">Minimum Password Length</label><input type="number" min={6} max={32} className="form-input" value={s.security?.minPasswordLen||8} onChange={e=>setS({...s,security:{...s.security,minPasswordLen:parseInt(e.target.value)}})}/></div>
        </div>
        <div className="form-group"><label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}><input type="checkbox" checked={s.security?.twoFactor||false} onChange={e=>setS({...s,security:{...s.security,twoFactor:e.target.checked}})} style={{width:18,height:18,accentColor:'var(--amber)'}}/><span style={{fontWeight:600,fontSize:14}}>Enable two-factor authentication (2FA) for all admin accounts</span></label></div>
      </Section>}
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   TASWS PAGE (Employees & Admins)
   ======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function TasksPage({ db, save, user }) {
  const [tab, setTab] = useState('todays');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', desc: '', priority: 'medium', dueDate: new Date().toISOString().split('T')[0], uid: user.id });
  const isAdmin = ['admin', 'super_admin'].includes(user.role);
  const [empFilter, setEmpFilter] = useState(isAdmin ? 'all' : user.id);

  const today = new Date().toISOString().split('T')[0];
  const list = db.workTasks.filter(t => {
    const matchEmp = empFilter === 'all' ? true : t.uid === parseInt(empFilter);
    return matchEmp;
  });

  const getFilteredTasks = () => {
    switch (tab) {
      case 'todays':
        return list.filter(t => t.dueDate === today);
      case 'completed':
        return list.filter(t => t.status === 'completed');
      case 'pending':
        return list.filter(t => t.status === 'pending');
      case 'upcoming':
        return list.filter(t => t.status === 'pending' && t.dueDate > today);
      default:
        return list;
    }
  };

  const filtered = getFilteredTasks();

  const toggleTask = id => {
    save('workTasks', db.workTasks.map(t => t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));
  };

  const deleteTask = id => {
    if (confirm('Delete this task?')) {
      save('workTasks', db.workTasks.filter(t => t.id !== id));
    }
  };

  const submit = e => {
    e.preventDefault();
    const newTask = {
      id: Date.now(),
      uid: parseInt(form.uid),
      title: form.title,
      desc: form.desc,
      status: 'pending',
      priority: form.priority,
      dueDate: form.dueDate
    };
    save('workTasks', [newTask, ...db.workTasks]);
    setModal(false);
    setForm({ title: '', desc: '', priority: 'medium', dueDate: today, uid: user.id });
  };

  const getPriorityBadge = p => {
    switch (p) {
      case 'high': return 'b-error';
      case 'medium': return 'b-pending';
      case 'low': return 'b-info';
      default: return 'b-gray';
    }
  };

  return (
    <div className="anim-fadeup">
      <PageHdr title="Task Planner" sub="Organise daily goals and track completion progress">
        {isAdmin && <button className="btn btn-dark" onClick={() => setModal(true)}><IC n="plus"/> Add Task</button>}
      </PageHdr>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: "Today's Tasks", count: list.filter(t => t.dueDate === today).length, c: 'var(--amber)' },
          { label: "Pending Tasks", count: list.filter(t => t.status === 'pending').length, c: 'var(--red)' },
          { label: "Completed Tasks", count: list.filter(t => t.status === 'completed').length, c: 'var(--green)' },
          { label: "Upcoming Tasks", count: list.filter(t => t.status === 'pending' && t.dueDate > today).length, c: 'var(--blue)' }
        ].map((cCard, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{cCard.label}</span>
                  <span style={{ fontSize: 24 }}><IC n="search" s={24} style={{color:'var(--text-muted)'}}/></span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div className="tabs-bar" style={{ margin: 0, border: 'none' }}>
            {[
              { k: 'todays', l: "Today's Tasks" },
              { k: 'pending', l: 'Pending Tasks' },
              { k: 'completed', l: 'Completed Tasks' },
              { k: 'upcoming', l: 'Upcoming Tasks' }
            ].map(tTab => (
              <button key={tTab.k} className={`tab-btn ${tab === tTab.k ? 'active' : ''}`} onClick={() => setTab(tTab.k)}>
                {tTab.l}
              </button>
            ))}
          </div>
          {isAdmin && (
            <select className="form-input" style={{ width: 200 }} value={empFilter} onChange={e => setEmpFilter(e.target.value)}>
              <option value="all">All Employees</option>
              {db.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && (
            <div className="empty-state">
              <span className="empty-state-icon"></span>
              <h3>No tasks found</h3>
              <p>Everything is caught up for this view</p>
            </div>
          )}
          {filtered.map(t => {
            const assignee = db.users.find(u => u.id === t.uid);
            return (
              <div key={t.id} className={`checklist-item ${t.status === 'completed' ? 'done' : ''}`} style={{ padding: '16px 20px', borderRadius: 16 }}>
                <div className={`check-box ${t.status === 'completed' ? 'checked' : ''}`} onClick={() => toggleTask(t.id)}>
                  {t.status === 'completed' && <IC n="check" s={14} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="check-text" style={{ fontSize: 15, fontWeight: 700 }}>{t.title}</span>
                    <span className={`badge ${getPriorityBadge(t.priority)}`} style={{ fontSize: 9, padding: '2px 8px' }}>{t.priority}</span>
                    <span className="tag" style={{ fontSize: 10, padding: '2px 8px' }}>Due: {t.dueDate}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{t.desc}</div>
                  {isAdmin && assignee && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                      <img src={assignee.avatar} style={{ width: 18, height: 18, borderRadius: '50%' }} alt=""/>
                      <span>Assigned to: {assignee.name}</span>
                    </div>
                  )}
                </div>
                <button className="btn btn-icon btn-icon-sm btn-ghost" onClick={() => deleteTask(t.id)} style={{ alignSelf: 'center' }}>
                  <IC n="trash" s={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Create New Task">
        <form onSubmit={submit}>
          <div className="form-group"><label className="form-label">Task Title</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Code Review" required /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} placeholder="Details about what needs to be done..." required /></div>
          {isAdmin && (
            <div className="form-group"><label className="form-label">Assign To</label>
              <select className="form-input" value={form.uid} onChange={e => setForm({ ...form, uid: e.target.value })}>
                {db.users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.title})</option>)}
              </select>
            </div>
          )}
          <div className="form-row">
            <div className="form-group"><label className="form-label">Priority</label>
              <select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Due Date</label><input type="date" className="form-input" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required /></div>
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-dark">Create Task</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   SUPER ADMIN DASHBOARD PAGE
   ======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function SADashboardPage({ db, save, user, setView }) {
  const activeSessions = 4;
  const dbSize = JSON.stringify(db).length;

  return (
    <div className="anim-fadeup">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'Outfit', fontSize: 30, fontWeight: 900, letterSpacing: '-.8px', marginBottom: 4 }}>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,letterSpacing:'-.4px',color:'var(--red)'}}>Saif's System Command Console</h2>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Super Admin Management Center</div>
      </div>

      <div className="stats-grid stagger">
        {[
          { label: 'System Status', val: 'Healthy', sub: 'All systems operational', icon: 'shield', bg: '#D1FAE5', ic: '#059669' },
          { label: 'Active Sessions', val: activeSessions, sub: 'Users currently logged in', icon: 'users', bg: '#DBEAFE', ic: '#2563EB' },
          { label: 'Database Footprint', val: `${(dbSize / 1024).toFixed(1)} KB`, sub: 'LocalStorage usage', icon: 'database', bg: '#FEF3C7', ic: '#D97706' },
          { label: 'Audit Records', val: db.auditLogs.length, sub: 'Events logged globally', icon: 'file', bg: '#EDE9FE', ic: '#7C3AED' }
        ].map((s, i) => (
          <div key={i} className="stat-c">
            <div className="stat-icon-wrap" style={{ background: s.bg }}><IC n={s.icon} s={20} c={s.ic}/></div>
            <div style={{ flex: 1 }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.val}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="section-title">Critical System Events</div>
                <div className="section-sub">Security, logins and settings actions</div>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => setView('auditlogs')}>View Logs</button>
            </div>
            {db.auditLogs.slice(0, 5).map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{log.user} - <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{log.action}</span></div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{log.details}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }} className="mono">{log.ip}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(log.time).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-hdr"><div className="section-title">Infrastructure Config</div></div>
            {[
              { k: 'API Environment', v: 'Production-Active' },
              { k: 'Token Authentication', v: 'JWT Base64 Encrypted' },
              { k: 'Session State', v: 'Mock Relational DB Layer' },
              { k: 'Server Target', v: 'http://localhost:8080' },
              { k: 'Antigravity Host OS', v: 'Windows Shell Sandbox' }
            ].map(item => (
              <div key={item.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{item.k}</span>
                <span style={{ fontWeight: 700 }} className="mono">{item.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   AUDIT LOGS PAGE (Super Admin)
   ======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function AuditLogsPage({ db }) {
  return (
    <div className="anim-fadeup">
      <PageHdr title="System Audit Logs" sub="Real-time security log tracking of portal usage"/>
      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>User / Account</th>
                <th>Operation</th>
                <th>Details</th>
                <th>IP Address</th>
                <th>Event Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {db.auditLogs.map(log => (
                <tr key={log.id}>
                  <td><strong>{log.user}</strong></td>
                  <td><span className="badge b-info"><span className="badge-dot"/>{log.action}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{log.details}</td>
                  <td className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{log.ip}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(log.time).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   BACKUPS PAGE (Super Admin)
   ======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function BackupsPage({ db, save }) {
  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `hrms_backup_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const resetData = () => {
    if (confirm('Reset entire system database to default seeds? All customization will be overwritten.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="anim-fadeup">
      <PageHdr title="Backups & Data Management" sub="Secure backup exports and factory database resetting"/>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-hdr"><div className="section-title">Database Utilities</div></div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Download complete backup of the relational database table states, or restore the database to seed state.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-dark" onClick={exportData}><IC n="download"/> Export DB JSON</button>
          <button className="btn btn-red" onClick={resetData}>Reset Defaults</button>
          </div>
        </div>

        <div className="card">
          <div className="card-hdr"><div className="section-title">Table Space Footprints</div></div>
          {Object.keys(db).map(key => (
            <div key={key} style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span className="mono" style={{ textTransform: 'capitalize' }}>{key}</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {Array.isArray(db[key]) ? `${db[key].length} records` : '1 config object'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   SYSTEM HEALTH PAGE (Super Admin)
   ======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function SystemHealthPage() {
  const [latency, setLatency] = useState(42);

  useEffect(() => {
    const int = setInterval(() => {
      setLatency(38 + Math.floor(Math.random() * 15));
    }, 3000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="anim-fadeup">
      <PageHdr title="System Health & Infrastructure Monitor" sub="Real-time CPU status, logs and execution speeds"/>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { l: 'CPU Processor Load', v: '12%', sub: 'Healthy performance', c: 'var(--green)' },
          { l: 'System Memory', v: '4.2 GB / 16 GB', sub: 'Low RAM overhead', c: 'var(--green)' },
          { l: 'Request Latency', v: `${latency} ms`, sub: 'Low network cost', c: 'var(--green)' }
        ].map((h, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{h.l}</div>
            <div style={{ fontFamily: 'Outfit', fontSize: 28, fontWeight: 900, color: h.c, marginBottom: 4 }}>{h.v}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-hdr"><div className="section-title">Mock Server Node Console Outputs</div></div>
        <div className="doc-preview" style={{ background: '#0F0F0F', color: '#10B981', maxHeight: 300 }}>
          [SYSTEM LOG] Server successfully initialized on port 8080.{"\n"}
          [SYSTEM LOG] Connecting local DB instance storage key: vp_hrms_v3_users...{"\n"}
          [SYSTEM LOG] Connection successful. Initialized state size: 167.3 KB.{"\n"}
          [SYSTEM LOG] Session token authenticated for Jordan Lee (UID: 3).{"\n"}
          [SYSTEM LOG] Load balancing optimized: latency is steady at {latency}ms.{"\n"}
          [SYSTEM LOG] Ready for requests.
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   API ENDPOINT MONITOR PAGE (Super Admin)
   ======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function APIMonitorPage({ db }) {
  const [load, setLoad] = useState(1);
  const [routes, setRoutes] = useState([
    { path: '/api/v1/auth/login', method: 'POST', calls: 3420, errorRate: 0.1, baseLatency: 14 },
    { path: '/api/v1/employees/list', method: 'GET', calls: 8940, errorRate: 0.0, baseLatency: 35 },
    { path: '/api/v1/leaves/approve', method: 'POST', calls: 210, errorRate: 0.5, baseLatency: 82 },
    { path: '/api/v1/payroll/run', method: 'POST', calls: 45, errorRate: 1.2, baseLatency: 280 },
    { path: '/api/v1/attendance/clockin', method: 'POST', calls: 1420, errorRate: 0.0, baseLatency: 22 },
    { path: '/api/v1/expenses/claim', method: 'POST', calls: 310, errorRate: 0.0, baseLatency: 45 },
    { path: '/api/v1/timesheets/log', method: 'POST', calls: 1250, errorRate: 0.2, baseLatency: 18 }
  ]);

  useEffect(() => {
    const int = setInterval(() => {
      setRoutes(prev => prev.map(r => {
        // Add random variations to requests count
        const addition = Math.floor(Math.random() * 5 * load);
        return {
          ...r,
          calls: r.calls + addition,
          // Calculate dynamic latency based on load multiplier
          latency: Math.round((r.baseLatency + (Math.random() * 10 - 5)) * load)
        };
      }));
    }, 2000);
    return () => clearInterval(int);
  }, [load]);

  const totalCalls = routes.reduce((s, r) => s + r.calls, 0);

  return (
    <div className="anim-fadeup">
      <PageHdr title="API Endpoint Performance Monitor" sub="Real-time web service metrics, latency and request rates"/>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <div className="card">
          <div className="card-hdr">
            <div>
              <div className="section-title">Active Routes & Performance Matrix</div>
              <div className="section-sub">Endpoints mapped by Node.js server router</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Simulated Server Load:</span>
              <select className="form-input" style={{ width: 120, padding: '6px 12px', fontSize: 13 }} value={load} onChange={e => setLoad(parseFloat(e.target.value))}>
                <option value={1}>1.0x (Idle)</option>
                <option value={1.8}>1.8x (Normal)</option>
                <option value={3.5}>3.5x (Peak)</option>
                <option value={6.0}>6.0x (Stress)</option>
              </select>
            </div>
          </div>

          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Endpoint Route</th>
                  <th>Request Count</th>
                  <th>Avg Latency</th>
                  <th>Error Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`badge ${r.method === 'GET' ? 'b-success' : 'b-info'}`} style={{ padding: '3px 8px', fontSize: 9 }}>
                        {r.method}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{r.path}</td>
                    <td className="mono" style={{ fontSize: 13 }}>{r.calls.toLocaleString()} reqs</td>
                    <td className="mono" style={{ fontSize: 13, fontWeight: 800, color: r.latency > 150 ? 'var(--red-dark)' : 'var(--text-primary)' }}>
                      {r.latency || r.baseLatency} ms
                    </td>
                    <td className="mono" style={{ fontSize: 13 }}>{r.errorRate.toFixed(2)}%</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: r.latency > 300 ? 'var(--red-dark)' : 'var(--green-dark)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.latency > 300 ? 'var(--red)' : 'var(--green)', display: 'inline-block' }} />
                        {r.latency > 300 ? 'Degraded' : 'Nominal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-hdr"><div className="section-title">Traffic Overview</div></div>
            <div style={{ padding: '10px 0' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>AGGREGATE REQUEST TRAFFIC</div>
              <div style={{ fontFamily: 'Outfit', fontSize: 32, fontWeight: 900, color: 'var(--amber-dark)', marginTop: 4 }}>
                {totalCalls.toLocaleString()}
              </div>
            </div>
            <div className="divider" style={{ margin: '12px 0' }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)' }}>SSL Cipher</span>
              <strong>TLS_AES_256_GCM</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)' }}>Load Distribution</span>
              <strong>Least-Latency Ring</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>HTTP Engine</span>
              <strong>HTTP/2 Keep-Alive</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   DATABASE SQL QUERY TERMINAL PAGE (Super Admin)
   ======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function QueryTerminalPage({ db }) {
  const [query, setQuery] = useState("SELECT name, title, role FROM users;");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const tables = ['users', 'departments', 'workTasks', 'leaves', 'attendance', 'payroll', 'timesheets', 'assets', 'expenses', 'documents', 'onboarding', 'notifications', 'settings'];

  const executeQuery = (overrideQuery) => {
    const qStr = overrideQuery || query;
    const clean = qStr.trim().replace(/;$/, '');
    const match = clean.match(/select\s+(.+?)\s+from\s+(\w+)/i);
    
    if (!match) {
      setError("Syntax Error: Only 'SELECT [fields] FROM [tableName]' query format is supported.");
      setResult(null);
      return;
    }
    
    const fields = match[1].split(',').map(f => f.trim());
    const table = match[2].trim();
    
    // Check if table exists
    const dbKey = Object.keys(db).find(k => k.toLowerCase() === table.toLowerCase());
    if (!dbKey) {
      setError(`Database Error: Table '${table}' does not exist.`);
      setResult(null);
      return;
    }
    
    const tableData = db[dbKey];
    const records = Array.isArray(tableData) ? tableData : [tableData];
    
    // Map records to specified fields
    const filtered = records.map(r => {
      if (fields[0] === '*') return r;
      const res = {};
      fields.forEach(f => {
        // Handle case insensitivity in field matching
        const realKey = Object.keys(r).find(k => k.toLowerCase() === f.toLowerCase());
        if (realKey) res[realKey] = r[realKey];
      });
      return res;
    });
    
    setError(null);
    setResult(filtered);
  };

  const handleQuickTable = (tbl) => {
    const q = `SELECT * FROM ${tbl};`;
    setQuery(q);
    executeQuery(q);
  };

  return (
    <div className="anim-fadeup">
      <PageHdr title="SQL Database Query Terminal" sub="Simulate raw relational queries on system localStorage database tables"/>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: 14 }}>
            System Tables
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tables.map(tbl => (
              <div key={tbl} className="tag" style={{ justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} onClick={() => handleQuickTable(tbl)}>
                <span>{tbl}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}></span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-hdr"><div className="section-title">Interactive Terminal Prompt</div></div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input className="form-input mono" style={{ flex: 1, background: '#0F0F0F', color: '#10B981', border: '1px solid rgba(255,255,255,0.1)' }} value={query} onChange={e => setQuery(e.target.value)} placeholder="SELECT * FROM users;" />
              <button className="btn btn-dark" onClick={() => executeQuery()}><IC n="send" s={14}/> Run Query</button>
            </div>
            
            {error && (
              <div style={{ background: 'var(--red-light)', borderLeft: '4px solid var(--red)', padding: '12px 16px', borderRadius: 8, color: 'var(--red-dark)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
                {error}
              </div>
            )}

            {result && (
              <div className="tbl-wrap" style={{ marginTop: 10, maxHeight: 380, overflowY: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      {Object.keys(result[0] || {}).map(col => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, idx) => (
                          <td key={idx} className="mono" style={{ fontSize: 12.5 }}>
                            {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!result && !error && (
              <div className="empty-state" style={{ padding: 40 }}>
              <span className="empty-state-icon"><IC n="terminal" s={48} style={{color:'var(--text-muted)'}}/></span>
                <p>Type a SQL command or click a quick table to view relational data outputs.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   CREDENTIAL AUDITOR PAGE (HR & Auditor)
   ======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function CredentialAuditorPage({ db, save, user }) {
  const [subView, setSubView] = useState('dashboard'); // dashboard | candidate
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | verified | review | fraud
  const [selectedAudit, setSelectedAudit] = useState(null); // for audit report modal
  
  // Verification Scan simulation states
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanFile, setScanFile] = useState(null);
  
  // Form states
  const [form, setForm] = useState({
    name: '',
    type: 'Degree/Diploma',
    serial: '',
    institution: '',
    year: '2026'
  });

  const audits = db.verihrmAudits || [];

  // Compute stats dynamically
  const totalAudited = audits.length;
  const verifiedPasses = audits.filter(a => a.status === 'VERIFIED').length;
  const flaggedWarnings = audits.filter(a => a.status === 'REVIEW REQ' || a.status === 'REVIEW').length;
  const fraudBlocks = audits.filter(a => a.status === 'FRAUD ALERT' || a.status === 'FRAUD').length;

  const handleStartVerification = (e) => {
    e.preventDefault();
    if (!form.name || !form.serial || !form.institution) {
      alert('Please fill out all credential details first.');
      return;
    }
    
    setScanning(true);
    setScanStep(0);
    setScanProgress(0);
    
    // Simulate steps
    const steps = [
      { p: 25, s: 'Checking anti-tampering scan...' },
      { p: 50, s: 'Extracting cryptographic signatures...' },
      { p: 75, s: 'Analyzing QR mapping data...' },
      { p: 100, s: 'Running OCR content review...' }
    ];
    
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setScanProgress(steps[currentStep].p);
        setScanStep(currentStep + 1);
        currentStep++;
      } else {
        clearInterval(interval);
        
        // Finalize calculation
        const fileNameLower = (scanFile?.name || '').toLowerCase();
        let score = 85;
        let status = 'VERIFIED';
        
        if (fileNameLower.includes('tampered')) {
          score = 15;
          status = 'FRAUD ALERT';
        } else if (fileNameLower.includes('mismatch')) {
          score = 45;
          status = 'FRAUD';
        } else if (form.name.toLowerCase() === 'jane doe') {
          score = 75;
          status = 'REVIEW REQ';
        }
        
        const newAudit = {
          id: Date.now(),
          auditId: `V-${Math.floor(100000 + Math.random() * 900000)}`,
          name: form.name,
          type: form.type,
          serial: form.serial,
          institution: form.institution,
          year: parseInt(form.year),
          score: score,
          status: status,
          date: new Date().toLocaleString()
        };
        
        save('verihrmAudits', [newAudit, ...audits]);
        setScanning(false);
        setScanFile(null);
        setForm({ name: '', type: 'Degree/Diploma', serial: '', institution: '', year: '2026' });
        setSubView('dashboard');
        alert(`Verification Complete! Authenticity score: ${score}% (${status})`);
      }
    }, 800);
  };

  const forceVerify = (id) => {
    save('verihrmAudits', audits.map(a => a.id === id ? { ...a, status: 'VERIFIED', score: 95 } : a));
  };

  const markVerified = (auditId) => {
    save('verihrmAudits', audits.map(a => a.auditId === auditId ? { ...a, status: 'VERIFIED', score: 95 } : a));
    setSelectedAudit(null);
  };

  const markFraud = (auditId) => {
    save('verihrmAudits', audits.map(a => a.auditId === auditId ? { ...a, status: 'FRAUD', score: 15 } : a));
    setSelectedAudit(null);
  };

  // Filter & Search audits
  const filteredAudits = audits.filter(a => {
    const matchesSearch = 
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.auditId.toLowerCase().includes(search.toLowerCase()) ||
      a.institution.toLowerCase().includes(search.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filter === 'verified') return a.status === 'VERIFIED';
    if (filter === 'review') return a.status === 'REVIEW REQ' || a.status === 'REVIEW';
    if (filter === 'fraud') return a.status === 'FRAUD ALERT' || a.status === 'FRAUD';
    return true;
  });

  return (
    <div className="anim-fadeup">
      {/* verihrm header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit', fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>VeriHRM</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 20, color: 'var(--text-muted)' }}>
              BACKGROUND CREDENTIALS TRUST ENGINE
            </span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={`btn ${subView === 'candidate' ? 'btn-amber' : 'btn-ghost'}`} onClick={() => setSubView('candidate')}>
            Candidate Portal
          </button>
          <button className={`btn ${subView === 'dashboard' ? 'btn-amber' : 'btn-ghost'}`} onClick={() => setSubView('dashboard')}>
            Auditor & HR Dashboard
          </button>
        </div>
      </div>

      {subView === 'candidate' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card">
            <div className="card-hdr"><div className="section-title">Verify Your Credentials</div></div>
            <form onSubmit={handleStartVerification} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">CANDIDATE FULL NAME</label>
                <input className="form-input" placeholder="e.g., Jane Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required disabled={scanning}/>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CERTIFICATE TYPE</label>
                  <select className="form-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})} disabled={scanning}>
                    <option value="Degree/Diploma">Degree/Diploma</option>
                    <option value="Professional Certification">Professional Certification</option>
                    <option value="Employment Record">Employment Record</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">CERTIFICATE ID / SERIAL NO.</label>
                  <input className="form-input" placeholder="e.g., CERT-12345" value={form.serial} onChange={e => setForm({...form, serial: e.target.value})} required disabled={scanning}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ISSUING INSTITUTION</label>
                  <input className="form-input" placeholder="e.g., Stanford University" value={form.institution} onChange={e => setForm({...form, institution: e.target.value})} required disabled={scanning}/>
                </div>
                <div className="form-group">
                  <label className="form-label">YEAR OF ISSUE / PASSING</label>
                  <input className="form-input" type="number" min={1980} max={2030} value={form.year} onChange={e => setForm({...form, year: e.target.value})} required disabled={scanning}/>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">UPLOAD DOCUMENT (PDF, JPEG, OR PNG)</label>
                <div className="doc-preview" style={{ border: '2px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.01)', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                  <input type="file" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} onChange={e => setScanFile(e.target.files[0])} disabled={scanning}/>
                  <IC n="download" s={24} style={{transform:'rotate(180deg)',marginBottom:8,color:'var(--text-muted)'}}/>
                  <strong style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {scanFile ? scanFile.name : "Drag & drop certificate here"}
                  </strong>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>or click to browse files (Max 5MB)</span>
                </div>
              </div>

              <button className="btn btn-amber" type="submit" style={{ height: 46, fontSize: 14, fontWeight: 700 }} disabled={scanning}>
                {scanning ? "Verifying..." : "Start Certificate Verification"}
              </button>

              <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: 8, padding: '12px 16px', color: 'var(--amber-dark)', fontSize: 12, marginTop: 10 }}>
                TIP: <strong>DEVELOPER TIP:</strong> To test different fraud signatures, try uploading files named <strong>tampered.pdf</strong> (for Photoshop metadata triggers) or <strong>mismatch.pdf</strong> (for Candidate OCR data discrepancy).
              </div>
            </form>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 40, border: '1px solid rgba(255,255,255,0.03)' }}>
            {scanning ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', border: '4px solid rgba(245,158,11,0.1)', borderTop: '4px solid var(--amber)', animation: 'spin 1s linear infinite' }}/>
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ background: 'var(--amber)', height: '100%', width: `${scanProgress}%`, transition: 'width 0.4s ease' }}/>
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>Scan in Progress ({scanProgress}%)</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                    {scanStep === 1 && "Running Anti-Tampering scanner checks..."}
                    {scanStep === 2 && "Validating document Cryptographic signatures..."}
                    {scanStep === 3 && "Verifying secure QR registration index maps..."}
                    {scanStep === 4 && "Checking candidate name OCR matching tables..."}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'inline-flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: 16 }}><IC n="file" s={36} style={{color:'var(--text-muted)'}}/></div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Pending Submission</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8, maxWidth: 300 }}>
                  Complete the details form and upload a credential file to launch the anti-fraud scan.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'TOTAL AUDITED', value: totalAudited, color: 'var(--text-primary)' },
              { label: 'VERIFIED PASSES', value: verifiedPasses, color: 'var(--green-dark)' },
              { label: 'FLAGGED WARNINGS', value: flaggedWarnings, color: 'var(--amber-dark)' },
              { label: 'FRAUD BLOCKS', value: fraudBlocks, color: 'var(--red-dark)' }
            ].map((st, i) => (
              <div key={i} className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>{st.label}</div>
                <div style={{ fontFamily: 'Outfit', fontSize: 28, fontWeight: 900, color: st.color }}>{st.value}</div>
              </div>
            ))}
          </div>

          <div className="card">
            {/* search and filter tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <input className="form-input" style={{ maxWidth: 320 }} placeholder="Search by candidate name, ID, or issuer..." value={search} onChange={e => setSearch(e.target.value)}/>
              
              <div className="tabs-bar" style={{ margin: 0, border: 'none' }}>
                {[
                  { k: 'all', l: 'ALL' },
                  { k: 'verified', l: 'VERIFIED' },
                  { k: 'review', l: 'REVIEW' },
                  { k: 'fraud', l: 'FRAUD' }
                ].map(t => (
                  <button key={t.k} className={`tab-btn ${filter === t.k ? 'active' : ''}`} onClick={() => setFilter(t.k)}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {/* table */}
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Audit ID</th>
                    <th>Candidate Name</th>
                    <th>Document Details</th>
                    <th>Trust Score</th>
                    <th>Compliance Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudits.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state" style={{ padding: 30 }}>
                  <span style={{ fontSize: 24 }}><IC n="search" s={24} style={{color:'var(--text-muted)'}}/></span>
                          <p style={{ marginTop: 8 }}>No matching audit logs found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAudits.map(a => (
                      <tr key={a.id}>
                        <td className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
                          <div>{a.auditId}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{a.date}</div>
                        </td>
                        <td style={{ fontWeight: 700, textTransform: 'capitalize' }}>{a.name}</td>
                        <td style={{ fontSize: 12.5 }}>
                          <strong>{a.type}</strong> <span style={{ color: 'var(--text-muted)' }}>{a.serial}</span>
                          <div style={{ color: 'var(--text-secondary)', marginTop: 2, fontSize: 11.5 }}>{a.institution} ({a.year})</div>
                        </td>
                        <td>
                          <span style={{ 
                            fontWeight: 800, 
                            color: a.score >= 85 ? 'var(--green-dark)' : a.score >= 50 ? 'var(--amber-dark)' : 'var(--red-dark)' 
                          }}>
                            {a.score}%
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            a.status === 'VERIFIED' ? 'b-success' : 
                            (a.status === 'REVIEW REQ' || a.status === 'REVIEW') ? 'b-pending' : 'b-error'
                          }`}>
                            <span className="badge-dot"/>
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="btn btn-xs btn-ghost" onClick={() => setSelectedAudit(a)}>
                              Audit Report
                            </button>
                            {a.status !== 'VERIFIED' && (
                              <button className="btn btn-xs btn-amber" onClick={() => forceVerify(a.id)}>
                                Force Verify
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* modal - Certificate Audit Findings */}
      {selectedAudit && (
      <Modal open={true} onClose={() => setSelectedAudit(null)} title="Certificate Audit Findings" subtitle={`Audit ID: ${selectedAudit.auditId} - Generated ${selectedAudit.date}`}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 20, marginBottom: 20 }}>
            {/* Authenticity Score column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, background: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Authenticity Score
                </span>
                {/* SVG circular progress */}
                <svg width="110" height="110" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10"/>
                  <circle cx="60" cy="60" r="50" fill="none" 
                          stroke={selectedAudit.score >= 85 ? 'var(--green)' : selectedAudit.score >= 50 ? 'var(--amber)' : 'var(--red)'} 
                          strokeWidth="10"
                          strokeDasharray="314.15" 
                          strokeDashoffset={314.15 * (1 - selectedAudit.score / 100)}
                          strokeLinecap="round" 
                          transform="rotate(-90 60 60)"/>
                  <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontFamily="Outfit" fontSize="24" fontWeight="900">
                    {selectedAudit.score}%
                  </text>
                </svg>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', display: 'block', marginBottom: 10 }}>
                  Certificate Details
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>CANDIDATE</div>
                    <strong style={{ textTransform: 'capitalize' }}>{selectedAudit.name}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>ISSUING UNIVERSITY / INST</div>
                    <strong style={{ textTransform: 'capitalize' }}>{selectedAudit.institution}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance checkpoints column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 18 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>
                  Compliance Checkpoints
                </span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Anti-Tampering File Scan', desc: 'Checks file structure modifications', pass: selectedAudit.score > 20 },
                    { label: 'Cryptographic Signature', desc: 'Checks CA digital certificate', pass: selectedAudit.score >= 80 },
                    { label: 'Secure QR Mapping', desc: 'Validates issuer validation portal', pass: selectedAudit.score >= 70 },
                    { label: 'OCR Content Review', desc: 'Compares text declarations', pass: selectedAudit.score > 15 && selectedAudit.score !== 45 },
                    { label: 'Registry ID Match', desc: 'Validates ID against mock databases', pass: selectedAudit.score >= 50 }
                  ].map((chk, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{chk.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{chk.desc}</div>
                      </div>
                      <span style={{ fontSize: 14 }}>{chk.pass ? '✔ PASS' : '⚠ WARN'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* alerts box */}
              {selectedAudit.score < 85 && (
                <div style={{ background: selectedAudit.score < 30 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)', border: selectedAudit.score < 30 ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(245, 158, 11, 0.15)', borderRadius: 12, padding: '16px 20px', marginTop: 16 }}>
                  <div style={{ fontWeight: 800, color: selectedAudit.score < 30 ? 'var(--red-dark)' : 'var(--amber-dark)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13.5 }}>
                    {selectedAudit.score < 30 ? 'CRITICAL: Security Block Alert' : 'WARNING: Review Action Required'}
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5 }}>
                    {selectedAudit.score === 15 && "Photoshop/Illustrator metadata found. File structure has been modified."}
                    {selectedAudit.score === 45 && "Candidate name does not match the name extracted from the document registry."}
                    {selectedAudit.score === 75 && "The uploaded file does not contain a machine-verifiable digital signature."}
                    {![15, 45, 75].includes(selectedAudit.score) && "Compliance checkpoints did not achieve 100% verification threshold."}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 10 }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Compliance action updates candidate profile verification status.</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setSelectedAudit(null)}>Close Review</button>
              <button className="btn btn-error" onClick={() => markFraud(selectedAudit.auditId)}>Reject & Flag Fraud</button>
              <button className="btn btn-success" onClick={() => markVerified(selectedAudit.auditId)}>Approve & Mark Verified</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   PORTAL SPECIFIC CUSTOM PAGES
   ========================================================================== */

function OrganizationsPage({ db, save, user }) {
  const [orgs, setOrgs] = useState([
    { id: 1, name: 'CEGS Corp.', domain: 'cegs.com', employees: 142, plan: 'Enterprise Plus', status: 'Active' },
    { id: 2, name: 'Vlocal India Pvt Ltd', domain: 'vlocal.in', employees: 88, plan: 'Professional', status: 'Active' },
    { id: 3, name: 'CEGS Technologies Inc.', domain: 'cegs.org', employees: 54, plan: 'Basic Starter', status: 'Suspended' },
  ]);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [plan, setPlan] = useState('Professional');

  const addOrg = () => {
    if (!name || !domain) return;
    setOrgs([...orgs, { id: Date.now(), name, domain, employees: 1, plan, status: 'Active' }]);
    setName(''); setDomain('');
  };

  return (
    <div className="card anim-fadeup">
      <div className="card-hdr">
        <div>
          <div className="section-title">Organizations Management</div>
          <div className="section-sub">Configure multi-tenant SaaS clients and instances</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input className="form-input" style={{ flex: 1 }} placeholder="Company Name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="form-input" style={{ flex: 1 }} placeholder="Domain (e.g. company.com)" value={domain} onChange={e=>setDomain(e.target.value)} />
        <select className="form-input" style={{ flex: 1 }} value={plan} onChange={e=>setPlan(e.target.value)}>
          <option>Basic Starter</option>
          <option>Professional</option>
          <option>Enterprise Plus</option>
        </select>
        <button className="btn btn-dark" onClick={addOrg}><IC n="plus"/> Add Org</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Organization</th><th>Domain</th><th>Active Users</th><th>License Plan</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {orgs.map(o => (
              <tr key={o.id}>
                <td style={{ fontWeight: 700 }}>{o.name}</td>
                <td><span className="tag" style={{ fontFamily: 'JetBrains Mono,monospace' }}>{o.domain}</span></td>
                <td>{o.employees} staff</td>
                <td><span className={`badge ${o.plan==='Enterprise Plus'?'b-success':'b-pending'}`}>{o.plan}</span></td>
                <td><span className={`badge ${o.status==='Active'?'b-success':'b-error'}`}>{o.status}</span></td>
                <td>
                  <button className="btn btn-xs btn-ghost" onClick={()=>alert(`Configuring settings for ${o.name}...`)}><IC n="settings" s={12}/> Config</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PermissionsPage({ db, save, user }) {
  const [matrix, setMatrix] = useState(() => db.permissions || {
    super_admin: { payroll: true, attendance: true, deleteEmp: true, approveLeave: true, reports: true },
    admin: { payroll: true, attendance: true, deleteEmp: true, approveLeave: true, reports: true },
    manager: { payroll: false, attendance: true, deleteEmp: false, approveLeave: true, reports: true },
    employee: { payroll: false, attendance: false, deleteEmp: false, approveLeave: false, reports: false },
    recruiter: { payroll: false, attendance: false, deleteEmp: false, approveLeave: false, reports: true },
    finance: { payroll: true, attendance: false, deleteEmp: false, approveLeave: false, reports: true },
  });

  const toggle = (role, key) => {
    const updated = {
      ...matrix,
      [role]: { ...matrix[role], [key]: !matrix[role][key] }
    };
    setMatrix(updated);
    save('permissions', updated);
  };

  return (
    <div className="card anim-fadeup">
      <div className="card-hdr">
        <div>
          <div className="section-title">Roles & Global Permissions Matrix</div>
          <div className="section-sub">Configure functional policy thresholds for system roles</div>
        </div>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Role Designation</th>
              <th>View Payroll</th>
              <th>Edit Attendance</th>
              <th>Delete Employee</th>
              <th>Approve Leaves</th>
              <th>Access Reports</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(matrix).map(role => (
              <tr key={role}>
                <td style={{ textTransform: 'none', fontWeight: 700 }}>{role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</td>
                {['payroll', 'attendance', 'deleteEmp', 'approveLeave', 'reports'].map(perm => (
                  <td key={perm} style={{ textAlign: 'center' }}>
                    <label className="switch-control" style={{ display: 'inline-block' }}>
                      <input type="checkbox" checked={matrix[role][perm]} onChange={()=>toggle(role, perm)} />
                      <span className="switch-slider"></span>
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PoliciesPage() {
  const [policies, setPolicies] = useState([
    { id: 1, name: 'Standard Paid Leave policy', type: 'Leave', val: '20 Days / year', status: 'Active' },
    { id: 2, name: 'Overtime allowance rate', type: 'Attendance', val: '₹2,000 / hour', status: 'Active' },
    { id: 3, name: 'Cloud SaaS expense limit', type: 'Expense', val: '₹25,000 / claim', status: 'Active' },
    { id: 4, name: 'Remote work stipend', type: 'Allowance', val: '₹5,000 / month', status: 'Suspended' },
  ]);

  return (
    <div className="card anim-fadeup">
      <div className="card-hdr">
        <div>
          <div className="section-title">Company HR Policies Configuration</div>
          <div className="section-sub">Manage allowances, leave allocations, and policy boundaries</div>
        </div>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Policy Name</th><th>Classification</th><th>Threshold Values</th><th>Status</th><th>Override</th></tr></thead>
          <tbody>
            {policies.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700 }}>{p.name}</td>
                <td><span className="tag">{p.type}</span></td>
                <td style={{ fontFamily: 'JetBrains Mono,monospace' }}>{p.val}</td>
                <td><span className={`badge ${p.status==='Active'?'b-success':'b-error'}`}>{p.status}</span></td>
                <td>
                  <button className="btn btn-xs btn-ghost" onClick={()=>alert('Modifying policy parameters...')}><IC n="edit" s={12}/> Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WorkflowsPage() {
  const [flows, setFlows] = useState([
    { id: 1, name: 'Leave Approval Pipeline', steps: 'Employee → Manager → HR Head', status: 'Active' },
    { id: 2, name: 'Expense Reimbursement Run', steps: 'Employee → Finance Team → VP Approval', status: 'Active' },
    { id: 3, name: 'Recruitment Offer Issuance', steps: 'Recruiter → HR Lead → CEO Signoff', status: 'Active' },
  ]);

  return (
    <div className="card anim-fadeup">
      <div className="card-hdr">
        <div>
          <div className="section-title">Approval Workflows Builder</div>
          <div className="section-sub">Define multi-stage approval routings and validation check gates</div>
        </div>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Workflow Registry</th><th>Routing Steps</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {flows.map(f => (
              <tr key={f.id}>
                <td style={{ fontWeight: 700 }}>{f.name}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    {f.steps.split(' → ').map((s, idx, arr) => (
                      <React.Fragment key={idx}>
                        <span className="tag" style={{ background: 'var(--purple-light)', color: 'var(--purple)', fontWeight: 700 }}>{s}</span>
                        {idx < arr.length - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </td>
                <td><span className="badge b-success">{f.status}</span></td>
                <td>
                  <button className="btn btn-xs btn-ghost" onClick={()=>alert('Opening Visual Pipeline Designer...')}><IC n="settings" s={12}/> Designer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IntegrationsPage() {
  const [services, setServices] = useState([
    { id: 'gsuite', name: 'Google Workspace', desc: 'Sync users accounts directory and Google Calendars', status: true },
    { id: 'slack', name: 'Slack Messaging', desc: 'Post check-in events and logs to corporate channels', status: true },
    { id: 'm365', name: 'Microsoft 365', desc: 'Azure AD integration and active directories mapping', status: false },
    { id: 'zoom', name: 'Zoom Conferencing', desc: 'Automatically schedule virtual video interviews links', status: false },
    { id: 'bio', name: 'Biometric Attendance Devices', desc: 'Fetch physical office gate clock logs daily', status: false },
  ]);

  const toggle = id => {
    setServices(services.map(s => s.id === id ? { ...s, status: !s.status } : s));
  };

  return (
    <div className="card anim-fadeup">
      <div className="card-hdr">
        <div>
          <div className="section-title">Third-party Service Integrations</div>
          <div className="section-sub">Connect external platforms and identity directory servers</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {services.map(s => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-body)', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{s.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{s.desc}</div>
            </div>
            <label className="switch-control">
              <input type="checkbox" checked={s.status} onChange={()=>toggle(s.id)} />
              <span className="switch-slider"></span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityPage() {
  const [fa, setFa] = useState(true);
  const [timeout, setTimeoutVal] = useState('30 mins');
  const [strength, setStrength] = useState('High');

  return (
    <div className="card anim-fadeup" style={{ maxWidth: 640 }}>
      <div className="card-hdr">
        <div>
          <div className="section-title">System Infrastructure Security Settings</div>
          <div className="section-sub">Set 2FA, session duration timeouts, and key protocols</div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>Require Multi-Factor Authentication (2FA)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label className="switch-control">
            <input type="checkbox" checked={fa} onChange={()=>setFa(!fa)} />
            <span className="switch-slider"></span>
          </label>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fa ? 'Enforced for all admin sessions' : 'Optional'}</span>
        </div>
      </div>
      <div className="form-group" style={{ marginTop: 16 }}>
        <label className="form-label">Auto Logout Idle Session Timeout</label>
        <select className="form-input" value={timeout} onChange={e=>setTimeoutVal(e.target.value)}>
          <option>10 mins</option>
          <option>30 mins</option>
          <option>2 hours</option>
          <option>No timeout</option>
        </select>
      </div>
      <div className="form-group" style={{ marginTop: 16 }}>
        <label className="form-label">Password Policy Threshold</label>
        <select className="form-input" value={strength} onChange={e=>setStrength(e.target.value)}>
          <option>Medium (8 characters)</option>
          <option>High (12 chars, digits & symbols)</option>
          <option>Ultra Strict (14 chars + rotation every 30 days)</option>
        </select>
      </div>
      <button className="btn btn-dark" style={{ marginTop: 16 }} onClick={()=>alert('Security settings successfully committed.')}>Save Parameters</button>
    </div>
  );
}

function ReportsPage() {
  const types = [
    { name: 'Attendance & Regularization Summary', desc: 'Aggregated clock-in timings, late arrivals, and active hours logs', icon: 'clock' },
    { name: 'Payroll Disbursement Registry', desc: 'Net salaries totals, allowance buckets, tax deductions, and PF logs', icon: 'card' },
    { name: 'Leave & Absences Allocation report', desc: 'Vacation rates, carry forwards balance sheets, and utilization metrics', icon: 'calendar' },
    { name: 'Hiring & Headcount Diversity statistics', desc: 'Hiring conversion rates, candidate attrition metrics, and demographics', icon: 'users' },
  ];

  return (
    <div className="anim-fadeup">
      <div style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ fontSize: 24, fontWeight: 900 }}>Reports & Compliance Logs Generator</div>
        <div className="section-sub">Generate and download auditing reports formatted in compliance with standard regulations</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {types.map((t, idx) => (
          <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 15 }}>
                <IC n={t.icon} s={18} style={{ color: 'var(--purple)' }} />
                {t.name}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.4 }}>{t.desc}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-sm btn-ghost" onClick={()=>alert('Downloading spreadsheet report...')}><IC n="file" s={12}/> CSV Format</button>
              <button className="btn btn-sm btn-dark" onClick={()=>alert('Generating printable PDF report...')}><IC n="print" s={12}/> Export PDF</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecruitmentPage() {
  const [pipeline, setPipeline] = useState([
    { id: 1, name: 'Mason Morison', role: 'UI Developer', stage: 'Applied', score: '82%' },
    { id: 2, name: 'David More', role: 'UX Consultant', stage: 'Interview', score: '94%' },
    { id: 3, name: 'Marinda Lauren', role: 'DevOps Lead', stage: 'Offered', score: '88%' },
    { id: 4, name: 'Mathew Marshall', role: 'QA Tester', stage: 'Applied', score: '76%' },
  ]);

  const advance = (id, nextStage) => {
    setPipeline(pipeline.map(p => p.id === id ? { ...p, stage: nextStage } : p));
  };

  return (
    <div className="card anim-fadeup">
      <div className="card-hdr">
        <div>
          <div className="section-title">Hiring & Candidate Recruitment Pipeline</div>
          <div className="section-sub">Monitor job postings applicants and interview stages</div>
        </div>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Candidate Name</th><th>Job Role</th><th>Match Score</th><th>Current Stage</th><th>Hiring Actions</th></tr></thead>
          <tbody>
            {pipeline.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700 }}>{p.name}</td>
                <td><span className="tag">{p.role}</span></td>
                <td style={{ fontWeight: 600 }}>{p.score}</td>
                <td>
                  <span className={`badge ${p.stage==='Offered'?'b-success':p.stage==='Interview'?'b-pending':'b-gray'}`}>{p.stage}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {p.stage === 'Applied' && <button className="btn btn-xs btn-ghost" onClick={()=>advance(p.id, 'Interview')}>Schedule Interview</button>}
                    {p.stage === 'Interview' && <button className="btn btn-xs btn-ghost" onClick={()=>advance(p.id, 'Offered')}>Approve & Offer</button>}
                    {p.stage === 'Offered' && <span style={{ fontSize: 12, color: 'var(--green-dark)', fontWeight: 600 }}>Offer Extended</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PerformancePage({ user }) {
  const goals = [
    { title: 'Core Interface Refactoring', target: 'Achieve 100% markup verification on Vite compiler', score: '98%', kpi: 'Build Errors: 0' },
    { title: 'Response Speed Optimization', target: 'Decrease API endpoint query delays below 150ms', score: '85%', kpi: 'Latency logs limit' },
    { title: 'CEGS Audit Engine deployment', target: 'Automate certificate scan rules verification scripts', score: '100%', kpi: 'Trust module online' },
  ];

  return (
    <div className="card anim-fadeup">
      <div className="card-hdr">
        <div>
          <div className="section-title">Performance reviews & Target KPIs</div>
          <div className="section-sub">Track active goals, manager evaluations, and feedback records</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        {goals.map((g, idx) => (
          <div key={idx} style={{ background: 'var(--bg-body)', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{g.title}</div>
              <span className="badge b-success" style={{ fontWeight: 800 }}>{g.score} rating</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong>Objective:</strong> {g.target}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}><strong>KPI Metrics:</strong> {g.kpi}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LearningPage() {
  const [courses, setCourses] = useState([
    { id: 1, title: 'CEGS Information Security Awareness', progress: 100, status: 'Completed' },
    { id: 2, title: 'Fullstack React Architecture with Vite & esbuild', progress: 75, status: 'In Progress' },
    { id: 3, title: 'Relational Database Optimization (SQLite3)', progress: 20, status: 'Assigned' },
  ]);

  return (
    <div className="card anim-fadeup">
      <div className="card-hdr">
        <div>
          <div className="section-title">Assigned Training Courses & Certifications</div>
          <div className="section-sub">Up-skill and monitor onboarding compliance requirements</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {courses.map(c => (
          <div key={c.id} style={{ background: 'var(--bg-body)', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.title}</div>
              <span className={`badge ${c.progress===100?'b-success':'b-pending'}`}>{c.status}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="progress-track" style={{ flex: 1, background: 'var(--border)' }}>
                <div className="progress-fill" style={{ width: `${c.progress}%`, background: c.progress === 100 ? 'var(--green)' : 'var(--purple)' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 32 }}>{c.progress}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HelpdeskPage({ user }) {
  const [tickets, setTickets] = useState([
    { id: 'TKT-88', title: 'Salary slip deduction breakdown', cat: 'Payroll', status: 'Pending', date: '2026-07-14' },
    { id: 'TKT-82', title: 'VPN login authentication errors', cat: 'IT Support', status: 'Resolved', date: '2026-07-10' },
  ]);
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('IT Support');

  const addTicket = e => {
    e.preventDefault();
    if (!title) return;
    setTickets([{ id: `TKT-${Math.floor(Math.random()*90)+10}`, title, cat, status: 'Pending', date: new Date().toISOString().split('T')[0] }, ...tickets]);
    setTitle('');
  };

  return (
    <div className="dash-grid anim-fadeup">
      <div className="card">
        <div className="card-hdr"><div className="section-title">Support History & Tickets</div></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>ID</th><th>Subject</th><th>Classification</th><th>Status</th><th>Submitted</th></tr></thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id}>
                  <td style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}>{t.id}</td>
                  <td style={{ fontWeight: 700 }}>{t.title}</td>
                  <td><span className="tag">{t.cat}</span></td>
                  <td><span className={`badge ${t.status==='Resolved'?'b-success':'b-pending'}`}>{t.status}</span></td>
                  <td style={{ fontSize: 12 }}>{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="card-hdr"><div className="section-title">File Support Request Ticket</div></div>
        <form onSubmit={addTicket}>
          <div className="form-group">
            <label className="form-label">Subject Description</label>
            <input className="form-input" placeholder="What issues are you experiencing?" value={title} onChange={e=>setTitle(e.target.value)} required />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Department Category</label>
            <select className="form-input" value={cat} onChange={e=>setCat(e.target.value)}>
              <option>IT Support</option>
              <option>Payroll</option>
              <option>HR Policies</option>
            </select>
          </div>
          <button className="btn btn-dark" style={{ marginTop: 16 }} type="submit">Submit Ticket</button>
        </form>
      </div>
    </div>
  );
}

function ExitPage() {
  const steps = [
    { name: 'Formal resignation letter registry', done: true },
    { name: 'Hardware assets physical handover', done: false },
    { name: 'Financial clearance & final settlements', done: false },
    { name: 'Exit feedback feedback interview', done: false },
  ];

  return (
    <div className="card anim-fadeup" style={{ maxWidth: 640 }}>
      <div className="card-hdr">
        <div>
          <div className="section-title">Exit Checklist & Resignation Clearances</div>
          <div className="section-sub">Complete exit checklist guidelines to retrieve settlement releases</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {steps.map((s, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-body)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 16 }}>{s.done ? '✔' : '⏱'}</span>
            <div style={{ flex: 1, fontSize: 13, fontWeight: s.done ? 500 : 700, color: s.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: s.done ? 'line-through' : 'none' }}>
              {s.name}
            </div>
            <span className={`badge ${s.done ? 'b-success' : 'b-pending'}`}>{s.done ? 'Cleared' : 'Pending'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DirectoryPage({ db }) {
  const [search, setSearch] = useState('');
  const list = db.users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="card anim-fadeup">
      <div className="card-hdr">
        <div>
          <div className="section-title">Company Employee Directory</div>
          <div className="section-sub">Search and check contact cards of all team members</div>
        </div>
      </div>
      <input className="form-input" style={{ marginBottom: 20 }} placeholder="Search colleagues by name or role title..." value={search} onChange={e=>setSearch(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {list.map(u => (
          <div key={u.id} className="team-slide-card" style={{ flex: 'none', width: 'auto' }}>
            <div className="team-card-color-bar" style={{ background: 'var(--purple-light)' }}></div>
            <img src={u.avatar} className="team-card-avatar" alt="" />
            <div className="team-card-name">{u.name}</div>
            <div className="team-card-role">{u.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 8, fontFamily: 'JetBrains Mono,monospace' }}>{u.email}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnouncementsPage({ db }) {
  return (
    <div className="card anim-fadeup" style={{ maxWidth: 680 }}>
      <div className="card-hdr">
        <div>
          <div className="section-title">Announcements & Corporate Circulars</div>
          <div className="section-sub">Corporate news and announcements updates</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {db.notifications.slice(0, 3).map(n => (
          <div key={n.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{n.title}</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4 }}>{n.msg}</p>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Published {n.at.split('T')[0]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeetingSchedulerPage({ db, save, user }) {
  const [activeTab, setActiveTab] = useState('meetings');
  const [hostRole, setHostRole] = useState('HR Manager');
  const [subject, setSubject] = useState('');
  const [meetDate, setMeetDate] = useState('');
  const [meetTimeSlot, setMeetTimeSlot] = useState('10:00 AM - 10:30 AM');
  
  const [activeCall, setActiveCall] = useState(null);
  const [localMute, setLocalMute] = useState(false);
  const [localCamOff, setLocalCamOff] = useState(false);

  const [googleCal, setGoogleCal] = useState(db.settings?.calGoogle ?? true);
  const [outlookCal, setOutlookCal] = useState(db.settings?.calOutlook ?? false);
  const [slackNotif, setSlackNotif] = useState(db.settings?.calSlack ?? true);
  const [maxDuration, setMaxDuration] = useState(db.settings?.calMaxDuration ?? 30);

  const isHR = user.role === 'admin';
  const isSA = user.role === 'super_admin';
  const canManage = isHR || isSA;

  const handleRequestMeeting = (e) => {
    e.preventDefault();
    if (!subject || !meetDate || !meetTimeSlot) return;

    const newReq = {
      id: Date.now(),
      hostRole,
      subject,
      date: meetDate,
      timeSlot: meetTimeSlot,
      requesterId: user.id,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    save('meetingRequests', [...(db.meetingRequests || []), newReq]);
    setSubject('');
    setMeetDate('');
    alert('Meeting request submitted successfully!');
  };

  const handleApprove = (meetId) => {
    const updated = db.meetingRequests.map(m => m.id === meetId ? { ...m, status: 'approved' } : m);
    save('meetingRequests', updated);

    const meet = db.meetingRequests.find(m => m.id === meetId);
    if (meet) {
      const newNotif = {
        id: Date.now(),
        from: user.id,
        to: meet.requesterId,
        title: 'Meeting Confirmed! 📅',
        msg: `Your meeting request regarding "${meet.subject}" on ${meet.date} at ${meet.timeSlot} has been approved.`,
        read: 0,
        at: new Date().toISOString()
      };
      save('notifications', [...(db.notifications || []), newNotif]);
    }

    alert('Meeting request approved!');
  };

  const handleDecline = (meetId) => {
    const updated = db.meetingRequests.map(m => m.id === meetId ? { ...m, status: 'declined' } : m);
    save('meetingRequests', updated);

    const meet = db.meetingRequests.find(m => m.id === meetId);
    if (meet) {
      const newNotif = {
        id: Date.now(),
        from: user.id,
        to: meet.requesterId,
        title: 'Meeting Declined',
        msg: `Your meeting request regarding "${meet.subject}" has been declined.`,
        read: 0,
        at: new Date().toISOString()
      };
      save('notifications', [...(db.notifications || []), newNotif]);
    }

    alert('Meeting request declined.');
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    if (!isSA) return;
    save('settings', {
      ...db.settings,
      calGoogle: googleCal,
      calOutlook: outlookCal,
      calSlack: slackNotif,
      calMaxDuration: parseInt(maxDuration)
    });
    alert('Calendar integration configuration saved!');
  };

  const myMeetings = (db.meetingRequests || []).filter(m => m.requesterId === user.id || isHR || isSA);

  return (
    <div className="card anim-fadeup" style={{ maxWidth: '100%' }}>
      <div className="card-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="section-title">Meeting Scheduler & Calendar</div>
          <div className="section-sub">Book meetings, check calendar schedules, and join secure virtual meeting rooms</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${activeTab === 'meetings' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('meetings')}>📅 My Calendar</button>
        <button className={`btn btn-sm ${activeTab === 'book' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('book')}>➕ Request Meeting</button>
        {canManage && (
          <button className={`btn btn-sm ${activeTab === 'review' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('review')}>⚖ Review Requests</button>
        )}
        {isSA && (
          <button className={`btn btn-sm ${activeTab === 'settings' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('settings')}>🔧 Calendar Settings</button>
        )}
      </div>

      {activeCall && (
        <div style={{ background: '#111827', borderRadius: 12, padding: 20, marginBottom: 20, color: '#F3F4F6' }} className="anim-fadeup">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #374151', paddingBottom: 10 }}>
            <div>
              <span style={{ color: '#10B981', fontWeight: 900, marginRight: 8 }}>● LIVE</span>
              <span style={{ fontWeight: 700 }}>Simulated secure Video call room</span>
            </div>
            <div style={{ fontSize: 13, color: '#9CA3AF' }}>Subject: {activeCall.subject}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 220, marginBottom: 20 }}>
            <div style={{ background: '#1F2937', borderRadius: 8, display: 'flex', flexDirection: 'column', justify: 'center', alignItems: 'center', position: 'relative', border: '1px solid #4B5563' }}>
              <div style={{ fontSize: 40 }}>👤</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>{activeCall.hostRole} (Partner)</div>
              <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 11, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4 }}>Connected</div>
            </div>

            <div style={{ background: '#1F2937', borderRadius: 8, display: 'flex', flexDirection: 'column', justify: 'center', alignItems: 'center', position: 'relative', border: '1px solid #4B5563' }}>
              {localCamOff ? (
                <div style={{ fontSize: 32 }}>🚫 Cam Off</div>
              ) : (
                <>
                  <div style={{ fontSize: 40 }}>🎥</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>{user.name} (You)</div>
                </>
              )}
              <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 11, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4 }}>
                {localMute ? 'Muted' : 'Audio On'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-sm" onClick={() => setLocalMute(!localMute)} style={{ background: localMute ? '#EF4444' : '#4B5563', color: '#fff', border: 'none' }}>
              {localMute ? 'Unmute Mic' : 'Mute Mic'}
            </button>
            <button className="btn btn-sm" onClick={() => setLocalCamOff(!localCamOff)} style={{ background: localCamOff ? '#EF4444' : '#4B5563', color: '#fff', border: 'none' }}>
              {localCamOff ? 'Turn Cam On' : 'Turn Cam Off'}
            </button>
            <button className="btn btn-sm btn-dark" onClick={() => setActiveCall(null)} style={{ background: '#DC2626' }}>
              Leave Call
            </button>
          </div>
        </div>
      )}

      {activeTab === 'meetings' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myMeetings.map(meet => {
              const requester = db.users?.find(u => u.id === meet.requesterId);
              const isApproved = meet.status === 'approved';
              return (
                <div 
                  key={meet.id} 
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 16,
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 24 }}>📅</div>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{meet.subject}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Host: {meet.hostRole} · Candidate/Requester: {requester?.name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Time: {meet.date} at {meet.timeSlot}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: meet.status === 'pending' ? '#FEF3C7' : meet.status === 'approved' ? '#D1FAE5' : '#FEE2E2',
                      color: meet.status === 'pending' ? '#D97706' : meet.status === 'approved' ? '#059669' : '#DC2626'
                    }}>
                      {meet.status.toUpperCase()}
                    </span>
                    {isApproved && !activeCall && (
                      <button className="btn btn-dark btn-sm" onClick={() => setActiveCall(meet)}>Join call</button>
                    )}
                  </div>
                </div>
              );
            })}
            {myMeetings.length === 0 && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                You have no scheduled meetings in your calendar.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'book' && (
        <form onSubmit={handleRequestMeeting} style={{ background: 'var(--bg-raised)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', maxWidth: 600 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>Book/Request Meeting</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Meet Partner / Role</label>
              <select className="form-input" value={hostRole} onChange={e => setHostRole(e.target.value)}>
                <option value="HR Manager">HR Manager</option>
                <option value="CEO">CEO</option>
                <option value="IT Support">IT Support Specialist</option>
                <option value="Financial Officer">Chief Financial Officer</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Pre-configured Time Slots</label>
              <select className="form-input" value={meetTimeSlot} onChange={e => setMeetTimeSlot(e.target.value)}>
                <option value="09:00 AM - 09:30 AM">09:00 AM - 09:30 AM</option>
                <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                <option value="11:30 AM - 12:00 PM">11:30 AM - 12:00 PM</option>
                <option value="02:00 PM - 02:30 PM">02:00 PM - 02:30 PM</option>
                <option value="04:00 PM - 04:30 PM">04:00 PM - 04:30 PM</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Requested Date</label>
            <input className="form-input" type="date" value={meetDate} onChange={e => setMeetDate(e.target.value)} required />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Subject / Purpose of Meeting</label>
            <input className="form-input" placeholder="e.g. Q3 Performance appraisal sync" value={subject} onChange={e => setSubject(e.target.value)} required />
          </div>

          <button className="btn btn-dark" type="submit">Submit Request</button>
        </form>
      )}

      {activeTab === 'review' && canManage && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>Requester</th>
                <th style={{ padding: 12 }}>Requested Host</th>
                <th style={{ padding: 12 }}>Subject</th>
                <th style={{ padding: 12 }}>Date & Time Slot</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {db.meetingRequests?.map(meet => {
                const requester = db.users?.find(u => u.id === meet.requesterId);
                return (
                  <tr key={meet.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 700 }}>{requester?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{requester?.title}</div>
                    </td>
                    <td style={{ padding: 12 }}>{meet.hostRole}</td>
                    <td style={{ padding: 12, fontSize: 12 }}>{meet.subject}</td>
                    <td style={{ padding: 12, fontSize: 11 }}>{meet.date} <br/>{meet.timeSlot}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: meet.status === 'pending' ? '#FEF3C7' : meet.status === 'approved' ? '#D1FAE5' : '#FEE2E2',
                        color: meet.status === 'pending' ? '#D97706' : meet.status === 'approved' ? '#059669' : '#DC2626'
                      }}>
                        {meet.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      {meet.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm" onClick={() => handleApprove(meet.id)} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Approve</button>
                          <button className="btn btn-sm" onClick={() => handleDecline(meet.id)} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Decline</button>
                        </div>
                      )}
                      {meet.status !== 'pending' && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Reviewed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!db.meetingRequests || db.meetingRequests.length === 0) && (
                <tr>
                  <td colSpan="6" style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No meeting requests submitted.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && isSA && (
        <form onSubmit={handleSaveSettings} style={{ background: 'var(--bg-raised)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', maxWidth: 600 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>Calendar Integration Config</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Google Calendar API Sync</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto export approved meetings to GSuite Calendars</div>
              </div>
              <input type="checkbox" checked={googleCal} onChange={e => setGoogleCal(e.target.checked)} style={{ width: 18, height: 18 }} />
            </div>

            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Microsoft Outlook Calendar Sync</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto export approved meetings to Microsoft Outlook accounts</div>
              </div>
              <input type="checkbox" checked={outlookCal} onChange={e => setOutlookCal(e.target.checked)} style={{ width: 18, height: 18 }} />
            </div>

            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Slack Channel Alerts</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Notify matching channels on new calendar meetings</div>
              </div>
              <input type="checkbox" checked={slackNotif} onChange={e => setSlackNotif(e.target.checked)} style={{ width: 18, height: 18 }} />
            </div>

            <div className="form-group" style={{ marginTop: 10 }}>
              <label className="form-label">Maximum Meeting Duration Allowed (Minutes)</label>
              <input className="form-input" type="number" min="5" max="240" value={maxDuration} onChange={e => setMaxDuration(e.target.value)} required />
            </div>
          </div>

          <button className="btn btn-dark" type="submit">Save Settings Policies</button>
        </form>
      )}
    </div>
  );
}

function InternalJobPortalPage({ db, save, user }) {
  const [activeTab, setActiveTab] = useState('openings');
  const [applyModal, setApplyModal] = useState(null);
  const [applyType, setApplyType] = useState('Transfer');
  const [applyReason, setApplyReason] = useState('');
  
  const [newTitle, setNewTitle] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newType, setNewType] = useState('Full-time');
  const [newSalary, setNewSalary] = useState('');
  const [newReqs, setNewReqs] = useState('');

  const [interviewModal, setInterviewModal] = useState(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');

  const [minTenure, setMinTenure] = useState(db.settings?.jobPortalMinTenure || 6);
  const [autoApproveHR, setAutoApproveHR] = useState(db.settings?.jobPortalAutoApproveHR || false);

  const isHR = user.role === 'admin';
  const isSA = user.role === 'super_admin';
  const canManage = isHR || isSA;

  const handleApply = (e) => {
    e.preventDefault();
    if (!applyReason) return;
    const newApp = {
      id: Date.now(),
      userId: user.id,
      jobId: applyModal.id,
      type: applyType,
      reason: applyReason,
      status: 'pending',
      appliedAt: new Date().toISOString()
    };
    save('jobApplications', [...(db.jobApplications || []), newApp]);
    setApplyModal(null);
    setApplyReason('');
    alert('Internal job application submitted successfully!');
  };

  const handlePostJob = (e) => {
    e.preventDefault();
    if (!newTitle || !newDept || !newSalary || !newReqs) return;
    const newJob = {
      id: Date.now(),
      title: newTitle,
      department: newDept,
      type: newType,
      salary: newSalary,
      reqs: newReqs,
      status: 'open'
    };
    save('jobs', [...(db.jobs || []), newJob]);
    setNewTitle('');
    setNewDept('');
    setNewSalary('');
    setNewReqs('');
    alert('New internal job opening posted successfully!');
  };

  const handleScheduleInterview = (e) => {
    e.preventDefault();
    if (!interviewDate || !interviewTime) return;
    
    const updatedApps = db.jobApplications.map(app => 
      app.id === interviewModal.id ? { ...app, status: 'interview_scheduled', interviewDate, interviewTime } : app
    );
    save('jobApplications', updatedApps);

    const candidateId = interviewModal.userId;
    const job = db.jobs.find(j => j.id === interviewModal.jobId);
    const newNotif = {
      id: Date.now(),
      from: user.id,
      to: candidateId,
      title: 'Internal Interview Scheduled 📅',
      msg: `Your interview for the ${job?.title || 'Job'} position has been scheduled on ${interviewDate} at ${interviewTime}.`,
      read: 0,
      at: new Date().toISOString()
    };
    save('notifications', [...(db.notifications || []), newNotif]);

    setInterviewModal(null);
    setInterviewDate('');
    setInterviewTime('');
    alert('Interview scheduled and candidate notified!');
  };

  const handleApproveApp = (appId) => {
    const app = db.jobApplications.find(a => a.id === appId);
    if (!app) return;

    const updatedApps = db.jobApplications.map(a => a.id === appId ? { ...a, status: 'approved' } : a);
    save('jobApplications', updatedApps);

    const job = db.jobs.find(j => j.id === app.jobId);
    if (job) {
      const targetDept = db.departments.find(d => d.name.toLowerCase() === job.department.toLowerCase());
      const updatedUsers = db.users.map(u => {
        if (u.id === app.userId) {
          return {
            ...u,
            designation: job.title,
            title: job.title,
            department_id: targetDept ? targetDept.id : u.department_id,
            deptId: targetDept ? targetDept.id : u.deptId
          };
        }
        return u;
      });
      save('users', updatedUsers);
    }

    const newNotif = {
      id: Date.now(),
      from: user.id,
      to: app.userId,
      title: 'Internal Application Approved! 🎉',
      msg: `Congratulations! Your internal transition to ${job?.title || 'the new role'} has been approved. Your profile details have been automatically updated.`,
      read: 0,
      at: new Date().toISOString()
    };
    save('notifications', [...(db.notifications || []), newNotif]);

    alert('Application approved! Candidate profile has been updated.');
  };

  const handleDeclineApp = (appId) => {
    const app = db.jobApplications.find(a => a.id === appId);
    if (!app) return;

    const updatedApps = db.jobApplications.map(a => a.id === appId ? { ...a, status: 'declined' } : a);
    save('jobApplications', updatedApps);

    const job = db.jobs.find(j => j.id === app.jobId);
    const newNotif = {
      id: Date.now(),
      from: user.id,
      to: app.userId,
      title: 'Internal Application Update',
      msg: `Thank you for applying to the ${job?.title || 'position'}. Unfortunately, we will not be moving forward with your application at this time.`,
      read: 0,
      at: new Date().toISOString()
    };
    save('notifications', [...(db.notifications || []), newNotif]);

    alert('Application declined.');
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    if (!isSA) return;
    save('settings', {
      ...db.settings,
      jobPortalMinTenure: parseInt(minTenure),
      jobPortalAutoApproveHR: autoApproveHR
    });
    alert('Portal settings saved!');
  };

  const openJobs = (db.jobs || []).filter(j => j.status === 'open');
  const myApplications = (db.jobApplications || []).filter(a => a.userId === user.id);

  return (
    <div className="card anim-fadeup" style={{ maxWidth: '100%' }}>
      <div className="card-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="section-title">Internal Job Portal</div>
          <div className="section-sub">Explore lateral transfers, promotion openings, and track your career growth inside CEGS</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${activeTab === 'openings' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('openings')}>💼 Open Positions</button>
        <button className={`btn btn-sm ${activeTab === 'my_apps' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('my_apps')}>📂 My Applications</button>
        {canManage && (
          <>
            <button className={`btn btn-sm ${activeTab === 'review' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('review')}>⚖ Review Applications</button>
            <button className={`btn btn-sm ${activeTab === 'post' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('post')}>➕ Post Opening</button>
          </>
        )}
        {isSA && (
          <button className={`btn btn-sm ${activeTab === 'settings' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('settings')}>🔧 Portal Settings</button>
        )}
      </div>

      {activeTab === 'openings' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {openJobs.map(job => (
              <div key={job.id} style={{ border: '1px solid var(--border)', padding: 18, borderRadius: 12, display: 'flex', flexDirection: 'column', justify: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '2px 8px', borderRadius: 4 }}>{job.department}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{job.type}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginTop: 8 }}>{job.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{job.reqs}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 12 }}>Est. Salary: {job.salary}</div>
                </div>
                {user.role === 'employee' && (
                  <button className="btn btn-dark btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => setApplyModal(job)}>Apply Internally</button>
                )}
              </div>
            ))}
            {openJobs.length === 0 && (
              <div style={{ gridColumn: 'span 3', padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No active internal job openings listed at this time.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'my_apps' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>Applied Job</th>
                <th style={{ padding: 12 }}>Type</th>
                <th style={{ padding: 12 }}>Submission Date</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Interview Details</th>
              </tr>
            </thead>
            <tbody>
              {myApplications.map(app => {
                const job = db.jobs?.find(j => j.id === app.jobId);
                return (
                  <tr key={app.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 700 }}>{job?.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{job?.department}</div>
                    </td>
                    <td style={{ padding: 12 }}>{app.type}</td>
                    <td style={{ padding: 12 }}>{app.appliedAt.split('T')[0]}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: app.status === 'pending' ? '#FEF3C7' : app.status === 'approved' ? '#D1FAE5' : app.status === 'interview_scheduled' ? '#DBEAFE' : '#FEE2E2',
                        color: app.status === 'pending' ? '#D97706' : app.status === 'approved' ? '#059669' : app.status === 'interview_scheduled' ? '#2563EB' : '#DC2626'
                      }}>
                        {app.status === 'interview_scheduled' ? 'INTERVIEW' : app.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                      {app.interviewDate ? `${app.interviewDate} at ${app.interviewTime}` : 'None'}
                    </td>
                  </tr>
                );
              })}
              {myApplications.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    You have not submitted any internal job applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'review' && canManage && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>Applicant</th>
                <th style={{ padding: 12 }}>Position Applied</th>
                <th style={{ padding: 12 }}>Type</th>
                <th style={{ padding: 12 }}>Justification / Reason</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {db.jobApplications?.map(app => {
                const applicant = db.users?.find(u => u.id === app.userId);
                const job = db.jobs?.find(j => j.id === app.jobId);
                return (
                  <tr key={app.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 700 }}>{applicant?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Current: {applicant?.designation}</div>
                    </td>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 700 }}>{job?.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Target: {job?.department}</div>
                    </td>
                    <td style={{ padding: 12 }}>{app.type}</td>
                    <td style={{ padding: 12, fontSize: 11, color: 'var(--text-secondary)', maxWidth: 220 }}>{app.reason}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: app.status === 'pending' ? '#FEF3C7' : app.status === 'approved' ? '#D1FAE5' : app.status === 'interview_scheduled' ? '#DBEAFE' : '#FEE2E2',
                        color: app.status === 'pending' ? '#D97706' : app.status === 'approved' ? '#059669' : app.status === 'interview_scheduled' ? '#2563EB' : '#DC2626'
                      }}>
                        {app.status === 'interview_scheduled' ? 'INTERVIEW' : app.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      {app.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm" onClick={() => setInterviewModal(app)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Schedule Interview</button>
                          <button className="btn btn-sm" onClick={() => handleApproveApp(app.id)} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Approve</button>
                          <button className="btn btn-sm" onClick={() => handleDeclineApp(app.id)} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Decline</button>
                        </div>
                      )}
                      {app.status === 'interview_scheduled' && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm" onClick={() => handleApproveApp(app.id)} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Approve</button>
                          <button className="btn btn-sm" onClick={() => handleDeclineApp(app.id)} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Decline</button>
                        </div>
                      )}
                      {['approved', 'declined'].includes(app.status) && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Reviewed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!db.jobApplications || db.jobApplications.length === 0) && (
                <tr>
                  <td colSpan="6" style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No internal applications submitted.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'post' && canManage && (
        <form onSubmit={handlePostJob} style={{ background: 'var(--bg-raised)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', maxWidth: 600 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>Post Internal Job Opening</div>
          
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Job Title</label>
            <input className="form-input" placeholder="e.g. Principal Software Engineer" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-input" value={newDept} onChange={e => setNewDept(e.target.value)} required>
                <option value="">-- Select department --</option>
                {db.departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Job Type</label>
              <select className="form-input" value={newType} onChange={e => setNewType(e.target.value)} required>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Salary Range</label>
            <input className="form-input" placeholder="e.g. ₹1,00,000 - ₹1,20,000" value={newSalary} onChange={e => setNewSalary(e.target.value)} required />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Key Requirements / Eligibility</label>
            <textarea className="form-input" placeholder="Describe mandatory qualifications, skills, and eligibility..." value={newReqs} onChange={e => setNewReqs(e.target.value)} style={{ minHeight: 80 }} required />
          </div>

          <button className="btn btn-dark" type="submit">Post Position</button>
        </form>
      )}

      {activeTab === 'settings' && isSA && (
        <form onSubmit={handleSaveSettings} style={{ background: 'var(--bg-raised)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', maxWidth: 600 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>Configure Promotion / Transfer Policies</div>
          
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Minimum Employee Tenure (Months)</label>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Minimum months of service required before applying internally</div>
            <input className="form-input" type="number" min="0" value={minTenure} onChange={e => setMinTenure(e.target.value)} required />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Auto-Approve Manager Approvals</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Directly update employee profile upon HR approval without CEO signing</div>
            </div>
            <input type="checkbox" checked={autoApproveHR} onChange={e => setAutoApproveHR(e.target.checked)} style={{ width: 18, height: 18 }} />
          </div>

          <button className="btn btn-dark" type="submit">Save Rules Policies</button>
        </form>
      )}

      {/* APPLY MODAL */}
      {applyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card anim-fadeup" style={{ width: '100%', maxWidth: 500, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>Apply for {applyModal.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Department: {applyModal.department} · salary: {applyModal.salary}</div>
            
            <form onSubmit={handleApply}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Application Type</label>
                <select className="form-input" value={applyType} onChange={e => setApplyType(e.target.value)} required>
                  <option value="Transfer">Lateral Transfer</option>
                  <option value="Promotion">Internal Promotion</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Justification / Experience Statement</label>
                <textarea className="form-input" placeholder="Explain why you are qualified and why you want to transition..." value={applyReason} onChange={e => setApplyReason(e.target.value)} style={{ minHeight: 100 }} required />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" type="button" onClick={() => setApplyModal(null)}>Cancel</button>
                <button className="btn btn-dark" type="submit">Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INTERVIEW MODAL */}
      {interviewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card anim-fadeup" style={{ width: '100%', maxWidth: 450, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>Schedule Internal Interview</div>
            
            <form onSubmit={handleScheduleInterview}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Interview Date</label>
                <input className="form-input" type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} required />
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Interview Time Slot</label>
                <input className="form-input" placeholder="e.g. 10:00 AM - 10:30 AM" value={interviewTime} onChange={e => setInterviewTime(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" type="button" onClick={() => setInterviewModal(null)}>Cancel</button>
                <button className="btn btn-dark" type="submit">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RewardsPage({ db, save, user }) {
  const [activeTab, setActiveTab] = useState('badges');
  const [searchLeaderboard, setSearchLeaderboard] = useState('');
  
  // Direct Award Form States (for Admin / Super Admin)
  const [awardTargetUser, setAwardTargetUser] = useState('');
  const [awardBadgeType, setAwardBadgeType] = useState('');
  const [awardReason, setAwardReason] = useState('');
  
  // Nominate Form States (for all users)
  const [nomineeUser, setNomineeUser] = useState('');
  const [nomineeBadge, setNomineeBadge] = useState('');
  const [nomineeReason, setNomineeReason] = useState('');
  
  // New Badge Form States
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeEmoji, setNewBadgeEmoji] = useState('🏅');
  const [newBadgeDesc, setNewBadgeDesc] = useState('');
  const [newBadgePoints, setNewBadgePoints] = useState(50);
  
  // Settings States
  const [peerEnabled, setPeerEnabled] = useState(db.rewardsSettings?.peerNominationsEnabled ?? true);
  const [requireApprove, setRequireApprove] = useState(db.rewardsSettings?.requireApproval ?? true);
  const [defaultPts, setDefaultPts] = useState(db.rewardsSettings?.defaultPoints ?? 50);

  const isHR = user.role === 'admin';
  const isSA = user.role === 'super_admin';
  const canManage = isHR || isSA;
  
  // 1. Calculate Leaderboard Rankings
  const leaderboard = useMemo(() => {
    return db.users.map(u => {
      // Find badges awarded to this user
      const userBadgeList = db.userBadges?.filter(ub => ub.userId === u.id) || [];
      const totalPoints = userBadgeList.reduce((sum, ub) => {
        const badgeDef = db.badges?.find(b => b.id === ub.badgeId);
        return sum + (badgeDef?.points || 0);
      }, 0);
      return {
        ...u,
        badgeCount: userBadgeList.length,
        points: totalPoints,
        earnedBadges: userBadgeList.map(ub => db.badges?.find(b => b.id === ub.badgeId)).filter(Boolean)
      };
    }).sort((a, b) => b.points - a.points || b.badgeCount - a.badgeCount);
  }, [db.users, db.userBadges, db.badges]);

  // Filter leaderboard users based on search
  const filteredLeaderboard = useMemo(() => {
    return leaderboard.filter(item => 
      item.name.toLowerCase().includes(searchLeaderboard.toLowerCase()) ||
      item.title.toLowerCase().includes(searchLeaderboard.toLowerCase())
    );
  }, [leaderboard, searchLeaderboard]);

  // 2. Direct Award Action
  const handleAwardBadge = (e) => {
    e.preventDefault();
    if (!awardTargetUser || !awardBadgeType || !awardReason) {
      alert('Please fill out all fields.');
      return;
    }
    const targetUserId = parseInt(awardTargetUser);
    const badgeId = parseInt(awardBadgeType);
    
    const newAward = {
      id: Date.now(),
      userId: targetUserId,
      badgeId: badgeId,
      awardedBy: user.id,
      awardedAt: new Date().toISOString(),
      reason: awardReason
    };

    save('userBadges', [...(db.userBadges || []), newAward]);
    
    // Add a notification for target user
    const badgeDef = db.badges.find(b => b.id === badgeId);
    const newNotif = {
      id: Date.now() + 1,
      from: user.id,
      to: targetUserId,
      title: `You earned the ${badgeDef?.emoji || '🏅'} ${badgeDef?.name || 'Badge'}!`,
      msg: `Awarded by ${user.name} for: "${awardReason}".`,
      read: 0,
      at: new Date().toISOString()
    };
    save('notifications', [...(db.notifications || []), newNotif]);
    
    alert('Badge successfully awarded!');
    setAwardTargetUser('');
    setAwardBadgeType('');
    setAwardReason('');
  };

  // 3. Nominate Action
  const handleNominatePeer = (e) => {
    e.preventDefault();
    if (!nomineeUser || !nomineeBadge || !nomineeReason) {
      alert('Please fill out all fields.');
      return;
    }
    const targetUserId = parseInt(nomineeUser);
    const badgeId = parseInt(nomineeBadge);

    const newNomination = {
      id: Date.now(),
      nominatorId: user.id,
      nomineeId: targetUserId,
      badgeId: badgeId,
      reason: nomineeReason,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    save('nominations', [...(db.nominations || []), newNomination]);
    alert('Nomination submitted successfully for admin review!');
    setNomineeUser('');
    setNomineeBadge('');
    setNomineeReason('');
  };

  // 4. Create Badge Action
  const handleCreateBadge = (e) => {
    e.preventDefault();
    if (!newBadgeName || !newBadgeEmoji || !newBadgeDesc) {
      alert('Please fill out all fields.');
      return;
    }
    const newBadge = {
      id: Date.now(),
      name: newBadgeName,
      emoji: newBadgeEmoji,
      desc: newBadgeDesc,
      points: parseInt(newBadgePoints)
    };
    save('badges', [...(db.badges || []), newBadge]);
    alert('New badge successfully created!');
    setNewBadgeName('');
    setNewBadgeEmoji('🏅');
    setNewBadgeDesc('');
    setNewBadgePoints(50);
  };

  // 5. Approve Nomination Action
  const handleApproveNomination = (nomId) => {
    const nomination = db.nominations.find(n => n.id === nomId);
    if (!nomination) return;

    // Create the awarded badge
    const newAward = {
      id: Date.now(),
      userId: nomination.nomineeId,
      badgeId: nomination.badgeId,
      awardedBy: user.id,
      awardedAt: new Date().toISOString(),
      reason: `Peer Nominated by ${db.users.find(u => u.id === nomination.nominatorId)?.name || 'Nominator'}: "${nomination.reason}"`
    };

    const updatedNominations = db.nominations.map(n => n.id === nomId ? { ...n, status: 'approved' } : n);
    save('nominations', updatedNominations);
    save('userBadges', [...(db.userBadges || []), newAward]);

    // Send notifications to both nominee and nominator
    const nomineeDef = db.users.find(u => u.id === nomination.nomineeId);
    const nominatorDef = db.users.find(u => u.id === nomination.nominatorId);
    const badgeDef = db.badges.find(b => b.id === nomination.badgeId);

    const nomineeNotif = {
      id: Date.now() + 1,
      from: user.id,
      to: nomineeDef?.id,
      title: `Nomination Approved: You earned the ${badgeDef?.emoji || '🏅'} ${badgeDef?.name || 'Badge'}!`,
      msg: `Nominated by ${nominatorDef?.name || 'a peer'} and approved by Admin. Reason: "${nomination.reason}"`,
      read: 0,
      at: new Date().toISOString()
    };

    const nominatorNotif = {
      id: Date.now() + 2,
      from: user.id,
      to: nominatorDef?.id,
      title: `Nomination Approved ✔`,
      msg: `Your nomination of ${nomineeDef?.name || 'employee'} for the ${badgeDef?.name || 'Badge'} was approved and awarded.`,
      read: 0,
      at: new Date().toISOString()
    };

    save('notifications', [...(db.notifications || []), nomineeNotif, nominatorNotif]);
    alert('Nomination approved and badge awarded!');
  };

  // 6. Decline Nomination Action
  const handleDeclineNomination = (nomId) => {
    const nomination = db.nominations.find(n => n.id === nomId);
    if (!nomination) return;

    const updatedNominations = db.nominations.map(n => n.id === nomId ? { ...n, status: 'rejected' } : n);
    save('nominations', updatedNominations);

    // Notify nominator
    const nominatorDef = db.users.find(u => u.id === nomination.nominatorId);
    const nomineeDef = db.users.find(u => u.id === nomination.nomineeId);
    const badgeDef = db.badges.find(b => b.id === nomination.badgeId);

    const nominatorNotif = {
      id: Date.now() + 1,
      from: user.id,
      to: nominatorDef?.id,
      title: `Nomination Declined ❌`,
      msg: `Your nomination of ${nomineeDef?.name || 'employee'} for the ${badgeDef?.name || 'Badge'} was declined by Admin.`,
      read: 0,
      at: new Date().toISOString()
    };

    save('notifications', [...(db.notifications || []), nominatorNotif]);
    alert('Nomination declined.');
  };

  // 7. Save Settings Action
  const handleSaveSettings = (e) => {
    e.preventDefault();
    if (!isSA) return; // Only Super Admin can save settings
    const updatedSettings = {
      peerNominationsEnabled: peerEnabled,
      requireApproval: requireApprove,
      defaultPoints: parseInt(defaultPts)
    };
    save('rewardsSettings', updatedSettings);
    alert('Rewards & Recognition settings updated.');
  };

  // My Earned Badges
  const myEarnedBadges = useMemo(() => {
    return (db.userBadges || [])
      .filter(ub => ub.userId === user.id)
      .map(ub => ({
        ...ub,
        badge: db.badges?.find(b => b.id === ub.badgeId)
      }))
      .filter(ub => ub.badge);
  }, [db.userBadges, db.badges, user.id]);

  const top3 = leaderboard.slice(0, 3);
  const restPlayers = filteredLeaderboard.slice(3);

  return (
    <div className="card anim-fadeup" style={{ maxWidth: '100%' }}>
      <div className="card-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="section-title">Rewards & Recognition</div>
          <div className="section-sub">Celebrate excellence, earn badges, nominate peers, and track monthly standings</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${activeTab === 'badges' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('badges')}>🎖 Badges & Trophies</button>
        <button className={`btn btn-sm ${activeTab === 'leaderboard' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('leaderboard')}>🏆 Leaderboard</button>
        <button className={`btn btn-sm ${activeTab === 'nominations' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('nominations')}>🤝 Peer Nominations</button>
        {canManage && (
          <button className={`btn btn-sm ${activeTab === 'manage' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('manage')}>⚙ Manage Badges</button>
        )}
        <button className={`btn btn-sm ${activeTab === 'settings' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setActiveTab('settings')}>🔧 Rules & Settings</button>
      </div>

      {/* BADGES TAB */}
      {activeTab === 'badges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* My Trophies Grid */}
          <div style={{ background: 'var(--bg-raised)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>My Earned Badges</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Achievements and accolades earned by you in CEGSOS</div>
            {myEarnedBadges.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
                No badges earned yet. Complete tasks, achieve attendance records or get peer nominations to earn badges!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {myEarnedBadges.map(ub => (
                  <div key={ub.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: 14, borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 32, lineHeight: 1 }}>{ub.badge.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{ub.badge.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ub.badge.desc}</div>
                      <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700, marginTop: 6, background: 'var(--amber-light)', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>+{ub.badge.points} PTS</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 8 }}>Awarded {ub.awardedAt.split('T')[0]}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Badges Catalog */}
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>System Badges Catalog</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {db.badges.map(b => {
                const awardeesCount = db.userBadges?.filter(ub => ub.badgeId === b.id).length || 0;
                return (
                  <div key={b.id} style={{ border: '1px solid var(--border)', padding: 16, borderRadius: 12, display: 'flex', gap: 16, alignItems: 'center', position: 'relative' }}>
                    <div style={{ fontSize: 40, lineHeight: 1 }}>{b.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{b.desc}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', background: 'var(--bg-raised)', padding: '2px 8px', borderRadius: 99, border: '1px solid var(--border)' }}>{b.points} Points</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{awardeesCount} Awarded</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* LEADERBOARD TAB */}
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Podium (Top 3 Players) */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16, padding: '24px 0 12px', minHeight: 250, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            
            {/* 2nd Place */}
            {top3[1] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 140 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>🥈</div>
                <div className="cegs-btn-avatar" style={{ border: '3px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: 56, height: 56, fontSize: 18 }}>
                  {top3[1].name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', textAlign: 'center', marginTop: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{top3[1].name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{top3[1].title}</div>
                <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', height: 100, width: '100%', marginTop: 12, borderRadius: '8px 8px 0 0', display: 'flex', flexDirection: 'column', justify: 'center', alignItems: 'center', padding: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 18, color: '#475569' }}>{top3[1].points}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>PTS</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>{top3[1].badgeCount} Badges</div>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 150 }}>
                <div style={{ fontSize: 32, marginBottom: 4, transform: 'scale(1.2)' }}>👑</div>
                <div className="cegs-btn-avatar" style={{ border: '4px solid var(--amber)', boxShadow: '0 6px 16px rgba(245,158,11,0.25)', width: 68, height: 68, fontSize: 22 }}>
                  {top3[0].name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', textAlign: 'center', marginTop: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{top3[0].name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{top3[0].title}</div>
                <div style={{ background: 'var(--amber-light)', border: '2px solid var(--amber)', height: 130, width: '100%', marginTop: 12, borderRadius: '12px 12px 0 0', display: 'flex', flexDirection: 'column', justify: 'center', alignItems: 'center', padding: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--amber-dark)' }}>{top3[0].points}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber-dark)', textTransform: 'uppercase' }}>PTS</div>
                  <div style={{ fontSize: 12, color: 'var(--amber-dark)', fontWeight: 700, marginTop: 12 }}>{top3[0].badgeCount} Badges</div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 140 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>🥉</div>
                <div className="cegs-btn-avatar" style={{ border: '3px solid #b45309', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: 56, height: 56, fontSize: 18 }}>
                  {top3[2].name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', textAlign: 'center', marginTop: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{top3[2].name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{top3[2].title}</div>
                <div style={{ background: '#fdf8f6', border: '1px solid #fed7aa', height: 80, width: '100%', marginTop: 12, borderRadius: '8px 8px 0 0', display: 'flex', flexDirection: 'column', justify: 'center', alignItems: 'center', padding: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 18, color: '#b45309' }}>{top3[2].points}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase' }}>PTS</div>
                  <div style={{ fontSize: 11, color: '#c2410c', marginTop: 6 }}>{top3[2].badgeCount} Badges</div>
                </div>
              </div>
            )}
          </div>

          {/* Remaining Rankings Search and List */}
          <div>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>Standings Leaderboard</div>
              <input 
                className="form-input" 
                placeholder="Search players..." 
                value={searchLeaderboard} 
                onChange={e => setSearchLeaderboard(e.target.value)} 
                style={{ maxWidth: 220, height: 36, padding: '0 12px' }}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 8px', width: 80 }}>Rank</th>
                    <th style={{ padding: '12px 8px' }}>Employee</th>
                    <th style={{ padding: '12px 8px' }}>Title</th>
                    <th style={{ padding: '12px 8px' }}>Earned Badges</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Badges Count</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: item.id === user.id ? 'var(--amber-light)' : 'transparent' }}>
                      <td style={{ padding: '14px 8px', fontWeight: 800, color: idx < 3 ? 'var(--amber-dark)' : 'var(--text-muted)' }}>
                        {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `# ${idx + 1}`}
                      </td>
                      <td style={{ padding: '14px 8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.name} {item.id === user.id && <span style={{ fontSize: 10, background: 'var(--text-primary)', color: 'var(--text-inverse)', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>You</span>}
                      </td>
                      <td style={{ padding: '14px 8px', color: 'var(--text-muted)' }}>{item.title}</td>
                      <td style={{ padding: '14px 8px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {item.earnedBadges.map((b, bidx) => (
                            <span key={bidx} title={b.name} style={{ cursor: 'pointer', fontSize: 16 }}>{b.emoji}</span>
                          ))}
                          {item.earnedBadges.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>No badges yet</span>}
                        </div>
                      </td>
                      <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 700 }}>{item.badgeCount}</td>
                      <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>{item.points} PTS</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* NOMINATIONS TAB */}
      {activeTab === 'nominations' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          
          {/* Peer Nomination Form */}
          {db.rewardsSettings?.peerNominationsEnabled || canManage ? (
            <div style={{ background: 'var(--bg-raised)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>Nominate a Peer</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Recognize a colleague's outstanding work and recommend them for a badge.</div>
              
              <form onSubmit={handleNominatePeer} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Nominate Coworker</label>
                  <select className="form-input" value={nomineeUser} onChange={e => setNomineeUser(e.target.value)} required>
                    <option value="">-- Choose coworker --</option>
                    {db.users.filter(u => u.id !== user.id).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.title})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Award Badge Category</label>
                  <select className="form-input" value={nomineeBadge} onChange={e => setNomineeBadge(e.target.value)} required>
                    <option value="">-- Choose badge --</option>
                    {db.badges.map(b => (
                      <option key={b.id} value={b.id}>{b.emoji} {b.name} (+{b.points} pts)</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Justification / Reason (Brief evidence)</label>
                  <textarea 
                    className="form-input" 
                    placeholder="Provide details about their accomplishment..." 
                    value={nomineeReason} 
                    onChange={e => setNomineeReason(e.target.value)} 
                    style={{ minHeight: 80, resize: 'vertical' }}
                    required
                  />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-dark" type="submit">Submit Peer Nomination</button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, border: '1px solid var(--border)' }}>
              Peer-to-peer nomination is currently disabled. Badges can only be awarded directly by HR and Administrators.
            </div>
          )}

          {/* Pending Nominations Approval Center (visible to HR/Admin & Super Admin) */}
          {canManage && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>Nominations Review Center</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Approve or decline submissions from employees before badges are officially granted</div>
              
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 8px' }}>Nominator</th>
                      <th style={{ padding: '10px 8px' }}>Nominee</th>
                      <th style={{ padding: '10px 8px' }}>Badge</th>
                      <th style={{ padding: '10px 8px' }}>Reason</th>
                      <th style={{ padding: '10px 8px' }}>Status</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.nominations.map(n => {
                      const nominator = db.users.find(u => u.id === n.nominatorId);
                      const nominee = db.users.find(u => u.id === n.nomineeId);
                      const badge = db.badges.find(b => b.id === n.badgeId);
                      return (
                        <tr key={n.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 600 }}>{nominator?.name || 'Unknown'}</td>
                          <td style={{ padding: '12px 8px', fontWeight: 600 }}>{nominee?.name || 'Unknown'}</td>
                          <td style={{ padding: '12px 8px' }}>{badge?.emoji} {badge?.name}</td>
                          <td style={{ padding: '12px 8px', fontSize: 12, maxWidth: 300, color: 'var(--text-secondary)' }}>{n.reason}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: 4, 
                              fontSize: 10, 
                              fontWeight: 700,
                              background: n.status === 'pending' ? '#fef3c7' : n.status === 'approved' ? '#dcfce7' : '#fee2e2',
                              color: n.status === 'pending' ? '#b45309' : n.status === 'approved' ? '#15803d' : '#b91c1c'
                            }}>{n.status.toUpperCase()}</span>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            {n.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button className="btn btn-sm" onClick={() => handleApproveNomination(n.id)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>Approve</button>
                                <button className="btn btn-sm" onClick={() => handleDeclineNomination(n.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>Decline</button>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Reviewed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {db.nominations.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>No peer nominations submitted yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANAGE TAB */}
      {activeTab === 'manage' && canManage && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          
          {/* Direct Award Badge Panel */}
          <div style={{ background: 'var(--bg-raised)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>Directly Award Badge</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Grant a badge immediately to an employee (skips peer nomination reviews).</div>
            
            <form onSubmit={handleAwardBadge}>
              <div className="form-group">
                <label className="form-label">Recipient Employee</label>
                <select className="form-input" value={awardTargetUser} onChange={e => setAwardTargetUser(e.target.value)} required>
                  <option value="">-- Choose employee --</option>
                  {db.users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.title})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Badge Category</label>
                <select className="form-input" value={awardBadgeType} onChange={e => setAwardBadgeType(e.target.value)} required>
                  <option value="">-- Choose badge --</option>
                  {db.badges.map(b => (
                    <option key={b.id} value={b.id}>{b.emoji} {b.name} (+{b.points} pts)</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Award Citation / Reason</label>
                <textarea 
                  className="form-input" 
                  placeholder="Official reason for awarding this badge..." 
                  value={awardReason} 
                  onChange={e => setAwardReason(e.target.value)} 
                  style={{ minHeight: 80, resize: 'vertical' }}
                  required
                />
              </div>

              <button className="btn btn-dark" style={{ marginTop: 16, width: '100%' }} type="submit">Award Badge Immediately</button>
            </form>
          </div>

          {/* Create New Badge Panel */}
          <div style={{ background: 'var(--bg-raised)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>Create Custom Badge</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Add a new category of recognition badge to the organization catalog.</div>
            
            <form onSubmit={handleCreateBadge}>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Badge Name</label>
                  <input className="form-input" placeholder="e.g. Sales Master" value={newBadgeName} onChange={e => setNewBadgeName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Emoji</label>
                  <select className="form-input" value={newBadgeEmoji} onChange={e => setNewBadgeEmoji(e.target.value)}>
                    <option value="🏅">🏅 Medal</option>
                    <option value="⭐">⭐ Star</option>
                    <option value="🚀">🚀 Rocket</option>
                    <option value="💯">💯 Hundred</option>
                    <option value="🏆">🏆 Trophy</option>
                    <option value="💡">💡 Bulb</option>
                    <option value="🎯">🎯 Target</option>
                    <option value="👏">👏 Clap</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Point Value weight</label>
                <input className="form-input" type="number" min="10" max="500" value={newBadgePoints} onChange={e => setNewBadgePoints(e.target.value)} required />
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Description / Achievement Criteria</label>
                <textarea 
                  className="form-input" 
                  placeholder="Describe what achievements earn this badge..." 
                  value={newBadgeDesc} 
                  onChange={e => setNewBadgeDesc(e.target.value)} 
                  style={{ minHeight: 80, resize: 'vertical' }}
                  required
                />
              </div>

              <button className="btn btn-dark" style={{ marginTop: 16, width: '100%' }} type="submit">Create System Badge</button>
            </form>
          </div>
        </div>
      )}

      {/* RULES & SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: 600 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>Rules Configuration Settings</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            {isSA ? 'Configure rewards calculation weights and peer nomination rules.' : 'Read-only rules configuration. Contact Super Admin to modify system weights.'}
          </div>

          <form onSubmit={handleSaveSettings}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-raised)', padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Allow Peer-to-Peer Nominations</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Enables employees to nominate their coworkers for badges</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={peerEnabled} 
                  disabled={!isSA}
                  onChange={e => setPeerEnabled(e.target.checked)} 
                  style={{ width: 20, height: 20, cursor: isSA ? 'pointer' : 'default' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-raised)', padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Require Admin Approval</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Nominations require HR or Super Admin approval before badge is granted</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={requireApprove} 
                  disabled={!isSA}
                  onChange={e => setRequireApprove(e.target.checked)} 
                  style={{ width: 20, height: 20, cursor: isSA ? 'pointer' : 'default' }}
                />
              </div>

              <div style={{ background: 'var(--bg-raised)', padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Default Point Value weight</label>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Points awarded if badge definition has no weight specified</div>
                <input 
                  className="form-input" 
                  type="number" 
                  value={defaultPts} 
                  disabled={!isSA}
                  onChange={e => setDefaultPts(e.target.value)} 
                  required
                />
              </div>
            </div>

            {isSA && (
              <button className="btn btn-dark" style={{ marginTop: 20 }} type="submit">Save Rules Settings</button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

function ProfilePage({ db, save, user }) {
  const [formData, setFormData] = useState({ ...user });
  const [tab, setTab] = useState('personal');

  const update = e => {
    e.preventDefault();
    save('users', db.users.map(u => u.id === user.id ? { ...u, ...formData } : u));
    alert('Profile information successfully saved.');
  };

  return (
    <div className="card anim-fadeup" style={{ maxWidth: 720 }}>
      <div className="card-hdr">
        <div>
          <div className="section-title">My Profile</div>
          <div className="section-sub">Manage your personal details, contact entries, bank accounts and tax forms</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 20 }}>
        {['personal', 'experience', 'financial'].map(t => (
          <button key={t} className={`btn btn-sm ${tab===t?'btn-dark':'btn-ghost'}`} onClick={()=>setTab(t)} style={{ textTransform: 'capitalize' }}>{t} Details</button>
        ))}
      </div>
      <form onSubmit={update}>
        {tab === 'personal' && (
          <>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={formData.name||''} onChange={e=>setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Profile Image (Avatar URL)</label>
              <input className="form-input" value={formData.avatar||''} onChange={e=>setFormData({...formData, avatar: e.target.value})} placeholder="https://api.dicebear.com/..." />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Contact Phone Number</label>
              <input className="form-input" value={formData.phone||''} onChange={e=>setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Emergency Number</label>
              <input className="form-input" value={formData.emergencyPhone||''} onChange={e=>setFormData({...formData, emergencyPhone: e.target.value})} placeholder="+1 212 555 9999" />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Role (Designation)</label>
              <input className="form-input" value={formData.title||''} onChange={e=>setFormData({...formData, title: e.target.value})} required />
            </div>
          </>
        )}
        {tab === 'experience' && (
          <>
            <div className="form-group">
              <label className="form-label">Professional Designation Title</label>
              <input className="form-input" value={formData.title||''} onChange={e=>setFormData({...formData, title: e.target.value})} />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Academic Degrees & Certifications</label>
              <input className="form-input" placeholder="B.S. Computer Science / AWS Architect" value={formData.degrees||''} onChange={e=>setFormData({...formData, degrees: e.target.value})} />
            </div>
          </>
        )}
        {tab === 'financial' && (
          <>
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input className="form-input" value={formData.bankName||''} onChange={e=>setFormData({...formData, bankName: e.target.value})} placeholder="Chase Bank / Silicon Valley Bank" />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Account Number</label>
              <input className="form-input" value={formData.bankAccount||''} onChange={e=>setFormData({...formData, bankAccount: e.target.value})} placeholder="**** **** **** 8877" />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">IFSC Code</label>
              <input className="form-input" value={formData.bankIfsc||''} onChange={e=>setFormData({...formData, bankIfsc: e.target.value})} placeholder="CHASUS33" />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Tax ID Code / SSN</label>
              <input className="form-input" value={formData.taxId||''} onChange={e=>setFormData({...formData, taxId: e.target.value})} placeholder="XXX-XX-XXXX" />
            </div>
          </>
        )}
        <button className="btn btn-dark" style={{ marginTop: 16 }} type="submit">Save Changes</button>
      </form>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   MOUNT
   ======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
export default App;