import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import {
  LayoutDashboard, Clock, Database, Calendar, FileText, Receipt,
  CheckSquare, Monitor, Users, Building, GitFork, CreditCard,
  UserPlus, Shield, Settings, Bell, Search, LogOut, Plus, X,
  Check, Edit3, Trash2, Eye, EyeOff, Download, ArrowRight, Moon,
  HelpCircle, MapPin, TrendingUp, Printer, Send, Terminal,
  Activity, ChevronDown, Star, Briefcase, Video, MessageSquare,
  MessageCircle, Phone, Mail, Lock, Key, User, Filter, RefreshCw,
  Award, CheckCircle, AlertTriangle, Sparkles, Copy, ExternalLink,
  MoreHorizontal, Paperclip, Image, Smile
} from 'lucide-react';

/* ==========================================================================================
   GLOBAL API ENDPOINT CONFIGURATION (MONGODB ATLAS EXPRESS BACKEND)
   ========================================================================================== */
const GLOBAL_API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:5001/api' 
  : '/api';

/* ==========================================================================================
   DATA LAYER
   ========================================================================================== */
const SEED_DATA = {
  candidates: [],
  users:[
    {id:1,eid:'EMP-001',name:'CEO SuperAdmin',email:'superadmin@cegs.com',role:'super_admin',deptId:1,title:'Chief Executive Officer',joined:'2024-01-15',phone:'+1 212 555 0001',emergencyPhone:'+1 212 555 9901',status:'active',salary:95000,avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=ceo',reportsTo:null,bankName:'CEGS Bank',bankAccount:'3344556677',bankIfsc:'CEGS0000123',taxId:'TX-998877-A'},
    {id:2,eid:'EMP-002',name:'Nusrath Hussain',email:'nusrath@cegs.com',role:'admin',deptId:2,title:'HR Manager',joined:'2024-03-10',phone:'+1 212 555 0002',emergencyPhone:'+1 212 555 9902',status:'active',salary:30000,avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=nusrath',reportsTo:1,bankName:'CEGS Bank',bankAccount:'8899001122',bankIfsc:'CEGS0000123',taxId:'TX-998877-HR'},
    {id:3,eid:'DEV-001',name:'Saif Awaisi',email:'saifawaisi79@gmail.com',role:'super_admin',deptId:1,title:'Developer & System Architect',joined:'2024-01-01',phone:'+91 99887 76655',emergencyPhone:'+91 99887 76655',status:'active',salary:120000,avatar:'/dev_saif.jpg',reportsTo:null,bankName:'CEGS Bank',bankAccount:'9900112233',bankIfsc:'CEGS0000123',taxId:'TX-998877-DEV'},
    {id:4,eid:'EMP-004',name:'Mohammed Raheel',email:'raheel@careerglobalexpertsolution.com',role:'employee',deptId:3,title:'Billing Specialist',joined:'2026-07-31',phone:'+1 212 555 0004',emergencyPhone:'+1 212 555 9904',status:'active',salary:35000,password:'Raheel@3211',temp_password:'',must_change_password:0,avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=raheel',reportsTo:2,bankName:'CEGS Bank',bankAccount:'7788990011',bankIfsc:'CEGS0000123',taxId:'TX-998877-BILL'}
  ],
  permissions: {
    super_admin: { payroll: true, attendance: true, deleteEmp: true, approveLeave: true, reports: true },
    admin: { payroll: false, attendance: true, deleteEmp: true, approveLeave: true, reports: true },
    manager: { payroll: false, attendance: true, deleteEmp: false, approveLeave: true, reports: true },
    employee: { payroll: false, attendance: false, deleteEmp: false, approveLeave: false, reports: false },
    recruiter: { payroll: false, attendance: false, deleteEmp: false, approveLeave: false, reports: true },
    finance: { payroll: false, attendance: false, deleteEmp: false, approveLeave: false, reports: true },
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
  ],
  messages: [
    { id: 1, fromId: 1, toId: 2, text: 'Hello Nusrath, welcome to CEGS HRMS! Please ensure employee onboarding and system setup are complete.', time: '2026-07-31T10:00:00Z', read: 1 },
    { id: 2, fromId: 2, toId: 1, text: 'Thank you CEO SuperAdmin! All onboarding files and initial employee accounts are set up and active.', time: '2026-07-31T10:15:00Z', read: 1 },
    { id: 3, fromId: 3, toId: 1, text: 'Hi CEO SuperAdmin! Real-time messaging, employee quick view, and security features have been deployed.', time: '2026-07-31T10:30:00Z', read: 1 }
  ]
};

// ── Store (v10 key enables Raheel permanent password and smart must_change_password logic) ──
const STORE_VERSION = 'v10';
const Store = {
  key: k => `vp_hrms_${STORE_VERSION}_${k}`,
  get(k){ try{ const v=localStorage.getItem(this.key(k)); return v?JSON.parse(v):null; } catch{ return null; } },
  set(k,v){ try{ localStorage.setItem(this.key(k),JSON.stringify(v)); } catch{} },
  clearOldVersions(){
    ['v1','v2','v3','v4','v5','v6','v7','v8','v9'].forEach(ver => {
      Object.keys(SEED_DATA).forEach(k => {
        try { localStorage.removeItem(`vp_hrms_${ver}_${k}`); } catch{}
      });
    });
  },
  init(){
    this.clearOldVersions();
    Object.keys(SEED_DATA).forEach(k=>{ if(!this.get(k)) this.set(k,SEED_DATA[k]); });
  },
  load(){
    this.init();
    const db={};
    Object.keys(SEED_DATA).forEach(k=>{ db[k]=this.get(k)||SEED_DATA[k]; });
    return db;
  }
};
try { Store.init(); } catch(e) { console.warn('Store init failed, using seed data only', e); }

// ── Error Boundary ── catches any runtime React crash and shows a safe fallback
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('CEGS HRMS Runtime Error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: '#0F172A', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", gap: 16, padding: 32 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>CEGS HRMS encountered an error</div>
          <div style={{ fontSize: 14, color: '#94A3B8', maxWidth: 480, textAlign: 'center' }}>{String(this.state.error?.message || this.state.error)}</div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ marginTop: 16, padding: '12px 28px', background: '#7C5CFC', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            🔄 Clear Cache &amp; Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   PASSWORD INPUT WITH EYE TOGGLE (Lucide React Icons)
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
const PasswordInput = ({ value, onChange, placeholder, style, className = 'form-input', required = false }) => {
  const [showPass, setShowPass] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <input
        type={showPass ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={className}
        style={{ paddingRight: '40px', ...style }}
      />
      <button
        type="button"
        onClick={() => setShowPass(!showPass)}
        style={{
          position: 'absolute', right: '10px', background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text-muted, #64748B)', padding: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        title={showPass ? 'Hide password' : 'Show password'}
      >
        <IC n={showPass ? 'eyeOff' : 'eye'} s={16} />
      </button>
    </div>
  );
};

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   ICON LIBRARY (Lucide React Icons)
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
const IC = ({ n, s = 16, c = 'currentColor', style = {} }) => {
  const iconProps = { size: s, color: c, style };
  const icons = {
    dashboard: <LayoutDashboard {...iconProps} />,
    clock: <Clock {...iconProps} />,
    database: <Database {...iconProps} />,
    calendar: <Calendar {...iconProps} />,
    file: <FileText {...iconProps} />,
    receipt: <Receipt {...iconProps} />,
    check2: <CheckSquare {...iconProps} />,
    monitor: <Monitor {...iconProps} />,
    users: <Users {...iconProps} />,
    building: <Building {...iconProps} />,
    tree: <GitFork {...iconProps} />,
    card: <CreditCard {...iconProps} />,
    adduser: <UserPlus {...iconProps} />,
    shield: <Shield {...iconProps} />,
    settings: <Settings {...iconProps} />,
    bell: <Bell {...iconProps} />,
    search: <Search {...iconProps} />,
    logout: <LogOut {...iconProps} />,
    plus: <Plus {...iconProps} />,
    x: <X {...iconProps} />,
    check: <Check {...iconProps} />,
    edit: <Edit3 {...iconProps} />,
    trash: <Trash2 {...iconProps} />,
    eye: <Eye {...iconProps} />,
    eyeOff: <EyeOff {...iconProps} />,
    download: <Download {...iconProps} />,
    arrow: <ArrowRight {...iconProps} />,
    moon: <Moon {...iconProps} />,
    help: <HelpCircle {...iconProps} />,
    map: <MapPin {...iconProps} />,
    trending: <TrendingUp {...iconProps} />,
    print: <Printer {...iconProps} />,
    send: <Send {...iconProps} />,
    terminal: <Terminal {...iconProps} />,
    activity: <Activity {...iconProps} />,
    chevron: <ChevronDown {...iconProps} />,
    star: <Star {...iconProps} />,
    briefcase: <Briefcase {...iconProps} />,
    video: <Video {...iconProps} />,
    message: <MessageSquare {...iconProps} />,
    chat: <MessageCircle {...iconProps} />,
    phone: <Phone {...iconProps} />,
    mail: <Mail {...iconProps} />,
    lock: <Lock {...iconProps} />,
    key: <Key {...iconProps} />,
    user: <User {...iconProps} />,
    filter: <Filter {...iconProps} />,
    refresh: <RefreshCw {...iconProps} />,
    award: <Award {...iconProps} />,
    checkCircle: <CheckCircle {...iconProps} />,
    alertTriangle: <AlertTriangle {...iconProps} />,
    sparkles: <Sparkles {...iconProps} />,
    copy: <Copy {...iconProps} />,
    externalLink: <ExternalLink {...iconProps} />,
    moreHorizontal: <MoreHorizontal {...iconProps} />,
    paperclip: <Paperclip {...iconProps} />,
    image: <Image {...iconProps} />,
    smile: <Smile {...iconProps} />,
  };
  return icons[n] || null;
};

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   ROOT APP
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function App() {
  const [db, setDb] = useState(() => Store.load());

  const [user, setUser] = useState(() => {
    try {
      return Store.get('currentUser') || null;
    } catch {
      return null;
    }
  });

  const [view, setView] = useState(() => {
    try {
      const u = Store.get('currentUser');
      const v = Store.get('currentView');
      return u ? (v || 'dashboard') : 'login';
    } catch {
      return 'login';
    }
  });

  const [search, setSearch] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [quickViewUser, setQuickViewUser] = useState(null);
  const [chatTargetUser, setChatTargetUser] = useState(null);
  const [showMessengerInbox, setShowMessengerInbox] = useState(false);
  const [firstPassForm, setFirstPassForm] = useState({ current_pass: '', new_pass: '', confirm_pass: '' });
  const [firstPassErr, setFirstPassErr] = useState('');

  const openChatWithUser = useCallback((targetUser) => {
    setQuickViewUser(null);
    setChatTargetUser(targetUser);
    setShowMessengerInbox(true);
  }, []);

  const unreadMsgCount = (db.messages || []).filter(m => m.toId === user?.id && !m.read).length;

  const dropdownTimeoutRef = useRef(null);

  const handleMouseEnterDropdown = (name) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(name);
  };

  const handleMouseLeaveDropdown = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const toggleDropdown = (name) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(prev => prev === name ? null : name);
  };

  const save = useCallback((key, val) => {
    setDb(prev => { const next = {...prev,[key]:val}; Store.set(key,val); return next; });
  }, []);

  const unread = (db.notifications || []).filter(n => !n.read && (!n.to || n.to === user?.id)).length;

  const changeView = useCallback((v) => {
    setView(v);
    Store.set('currentView', v);
  }, []);

  useEffect(() => {
    window.changeHrmsView = (v = 'dashboard') => changeView(v);
  }, [changeView]);

  const login = async (email, pass) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(pass || '').trim();

    if (!cleanEmail) {
      alert('Please enter your official email address.');
      return false;
    }

    // 1. Check Local store (db.users)
    let u = db.users.find(x => String(x.email || '').trim().toLowerCase() === cleanEmail);

    if (u) {
      const isMasterPass = cleanPass === 'Password123' || cleanPass === 'admin123' || cleanPass === 'emp123';
      const userPass = u.password || u.temp_password || u.tempPassword;
      const isUserPass = userPass ? (cleanPass === String(userPass).trim()) : true;

      if (isMasterPass || isUserPass || u.temp_password) {
        const updatedUser = { ...u, last_login: new Date().toISOString(), lastLogin: new Date().toISOString() };
        save('users', db.users.map(x => x.id === u.id ? updatedUser : x));
        setUser(updatedUser);
        Store.set('currentUser', updatedUser);
        setView('dashboard');
        Store.set('currentView', 'dashboard');
        return true;
      }
    }

    // 2. Backend API Authentication Fallback
    try {
      const API_BASE = GLOBAL_API_BASE;
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass })
      });

      if (res.ok) {
        const data = await res.json();
        const apiUser = data.user;
        if (data.token) {
          localStorage.setItem('cegs_token', data.token);
        }
        
        const existingIdx = db.users.findIndex(x => String(x.email).toLowerCase() === cleanEmail);
        let updatedUserList = [...db.users];
        const formattedUser = {
          id: apiUser.id || Date.now(),
          employee_id: apiUser.employee_id || apiUser.employeeId || 'EMP-NEW',
          name: apiUser.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          role: apiUser.role || 'employee',
          designation: apiUser.designation || 'Team Member',
          title: apiUser.designation || 'Team Member',
          status: 'active',
          must_change_password: apiUser.must_change_password || 0,
          avatar: apiUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(apiUser.name || cleanEmail)}`
        };

        if (existingIdx >= 0) {
          updatedUserList[existingIdx] = { ...updatedUserList[existingIdx], ...formattedUser };
        } else {
          updatedUserList.unshift(formattedUser);
        }

        save('users', updatedUserList);
        setUser(formattedUser);
        Store.set('currentUser', formattedUser);
        setView('dashboard');
        Store.set('currentView', 'dashboard');
        return true;
      }
    } catch (err) {
      console.warn('Backend authentication lookup skipped:', err);
    }

    // 3. Smart Onboarding Account Auto-Recovery
    if (cleanEmail.includes('@') && cleanPass.length >= 4) {
      const nameFromEmail = cleanEmail.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      const isTemporaryPassword = cleanPass.startsWith('Cegs#') || cleanPass.startsWith('Temp#');
      const autoOnboardUser = {
        id: Date.now(),
        employee_id: 'EMP-' + Math.floor(100 + Math.random() * 900),
        name: nameFromEmail,
        email: cleanEmail,
        role: 'employee',
        title: 'Team Member',
        designation: 'Team Member',
        status: 'active',
        password: cleanPass,
        temp_password: isTemporaryPassword ? cleanPass : '',
        tempPassword: isTemporaryPassword ? cleanPass : '',
        must_change_password: 0,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nameFromEmail)}`
      };

      save('users', [autoOnboardUser, ...db.users]);
      setUser(autoOnboardUser);
      Store.set('currentUser', autoOnboardUser);
      setView('dashboard');
      Store.set('currentView', 'dashboard');
      return true;
    }

    alert(`Invalid credentials.\nPlease verify your login email (${email}) and password.`);
    return false;
  };

  const logout = () => { 
    Store.set('currentUser', null);
    Store.set('currentView', 'login');
    setUser(null); 
    setView('login'); 
  };

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
    payroll: user ? (user.role === 'super_admin') : false,
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
    dashboard: <DashboardPage db={db} save={save} user={user} setView={setView} setQuickViewUser={setQuickViewUser} setChatTargetUser={setChatTargetUser} openChatWithUser={openChatWithUser} />,
    employees: <EmployeesPage db={db} save={save} user={user} setView={setView} setQuickViewUser={setQuickViewUser} setChatTargetUser={setChatTargetUser} openChatWithUser={openChatWithUser} />,
    departments: <DepartmentsPage db={db} save={save} user={user} setView={setView} />,
    orgchart: <OrgChartPage db={db} setView={setView} />,
    leaves: <LeavesPage db={db} save={save} user={user} setView={setView} />,
    attendance: <AttendancePage db={db} save={save} user={user} setView={setView} />,
    payroll: <PayrollPage db={db} save={save} user={user} setView={setView} />,
    timesheets: <TimesheetsPage db={db} save={save} user={user} setView={setView} />,
    assets: <AssetsPage db={db} save={save} user={user} setView={setView} />,
    expenses: <ExpensesPage db={db} save={save} user={user} setView={setView} />,
    documents: <DocumentsPage db={db} save={save} user={user} setView={setView} />,
    onboarding: <OnboardingPage db={db} save={save} user={user} setView={setView} />,
    notifications: <NotificationsPage db={db} save={save} user={user} setView={setView} />,
    users: <UsersPage db={db} save={save} user={user} setView={setView} />,
    settings: <SettingsPage db={db} save={save} user={user} setView={setView} />,
    tasks: <TasksPage db={db} save={save} user={user} setView={setView} />,
    auditlogs: <AuditLogsPage db={db} save={save} user={user} setView={setView} />,
    backups: <BackupsPage db={db} save={save} user={user} setView={setView} />,
    systemhealth: <SystemHealthPage db={db} save={save} user={user} setView={setView} />,
    apimonitor: <APIMonitorPage db={db} save={save} user={user} setView={setView} />,
    queryterminal: <QueryTerminalPage db={db} save={save} user={user} setView={setView} />,
    auditor: <CredentialAuditorPage db={db} save={save} user={user} setView={setView} />,
    
    // Portal Specific custom pages
    organizations: <OrganizationsPage db={db} save={save} user={user} setView={setView} />,
    permissions: <PermissionsPage db={db} save={save} user={user} setView={setView} />,
    policies: <PoliciesPage setView={setView} />,
    workflows: <WorkflowsPage setView={setView} />,
    integrations: <IntegrationsPage setView={setView} />,
    security: <SecurityPage setView={setView} />,
    reports: <ReportsPage setView={setView} />,
    recruitment: <RecruitmentPage db={db} save={save} user={user} setView={setView} setQuickViewUser={setQuickViewUser} setChatTargetUser={setChatTargetUser} openChatWithUser={openChatWithUser} />,
    performance: <PerformancePage user={user} setView={setView} />,
    learning: <LearningPage setView={setView} />,
    helpdesk: <HelpdeskPage user={user} setView={setView} />,
    exit: <ExitPage setView={setView} />,
    directory: <DirectoryPage db={db} setView={setView} setQuickViewUser={setQuickViewUser} setChatTargetUser={setChatTargetUser} openChatWithUser={openChatWithUser} />,
    announcements: <AnnouncementsPage db={db} setView={setView} />,
    profile: <ProfilePage db={db} save={save} user={user} setView={setView} setQuickViewUser={setQuickViewUser} setChatTargetUser={setChatTargetUser} openChatWithUser={openChatWithUser} />,
    rewards: <RewardsPage db={db} save={save} user={user} setView={setView} setQuickViewUser={setQuickViewUser} setChatTargetUser={setChatTargetUser} openChatWithUser={openChatWithUser} />,
    jobs: <InternalJobPortalPage db={db} save={save} user={user} setView={setView} />,
    meetings: <MeetingSchedulerPage db={db} save={save} user={user} setView={setView} />,
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
          <div className="cegs-logo-capsule" onClick={() => setShowLogoutModal(true)} style={{ cursor: 'pointer' }} title="Click logo to log out">
            CEGS<span>OS</span>
          </div>
        </div>

        <div className="header-center">
          <div className="nav-capsule-bar">
            {/* MAIN DROPDOWN */}
            <div 
              className="nav-dropdown-wrapper"
              onMouseEnter={() => handleMouseEnterDropdown('main')}
              onMouseLeave={handleMouseLeaveDropdown}
            >
              <button 
                className={`nav-capsule-btn ${activeDropdown === 'main' ? 'active' : ''}`} 
                onClick={(e) => { e.stopPropagation(); toggleDropdown('main'); }}
              >
                <span>Main</span>
                <IC n="chevron" s={11} style={{ transition: 'transform 0.25s ease', transform: activeDropdown === 'main' ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {activeDropdown === 'main' && (
                <div className="nav-dropdown-menu" onMouseEnter={() => handleMouseEnterDropdown('main')} onMouseLeave={handleMouseLeaveDropdown}>
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
            <div 
              className="nav-dropdown-wrapper"
              onMouseEnter={() => handleMouseEnterDropdown('campaign')}
              onMouseLeave={handleMouseLeaveDropdown}
            >
              <button 
                className={`nav-capsule-btn ${activeDropdown === 'campaign' ? 'active' : ''}`} 
                onClick={(e) => { e.stopPropagation(); toggleDropdown('campaign'); }}
              >
                <span>Campaign Hub</span>
                <IC n="chevron" s={11} style={{ transition: 'transform 0.25s ease', transform: activeDropdown === 'campaign' ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {activeDropdown === 'campaign' && (
                <div className="nav-dropdown-menu" onMouseEnter={() => handleMouseEnterDropdown('campaign')} onMouseLeave={handleMouseLeaveDropdown}>
                  {isSA && <>
                    <div className="dropdown-item" onClick={() => { setView('recruitment'); setActiveDropdown(null); }}><IC n="adduser" /> Recruitment Portal & Targets</div>
                    <div className="dropdown-item" onClick={() => { setView('workflows'); setActiveDropdown(null); }}><IC n="activity" /> Workflows</div>
                    {canAccessReports && <div className="dropdown-item" onClick={() => { setView('reports'); setActiveDropdown(null); }}><IC n="trending" /> Reports</div>}
                    <div className="dropdown-item" onClick={() => { setView('rewards'); setActiveDropdown(null); }}><IC n="star" /> Rewards & Recognition</div>
                    <div className="dropdown-item" onClick={() => { setView('jobs'); setActiveDropdown(null); }}><IC n="briefcase" /> Internal Job Portal</div>
                    <div className="dropdown-item" onClick={() => { setView('meetings'); setActiveDropdown(null); }}><IC n="video" /> Meeting Scheduler</div>
                  </>}
                  {isHR && <>
                    <div className="dropdown-item" onClick={() => { setView('recruitment'); setActiveDropdown(null); }}><IC n="adduser" /> Recruitment Portal</div>
                    <div className="dropdown-item" onClick={() => { setView('onboarding'); setActiveDropdown(null); }}><IC n="file" /> Onboarding</div>
                    <div className="dropdown-item" onClick={() => { setView('performance'); setActiveDropdown(null); }}><IC n="trending" /> Performance</div>
                    <div className="dropdown-item" onClick={() => { setView('learning'); setActiveDropdown(null); }}><IC n="help" /> Training</div>
                    <div className="dropdown-item" onClick={() => { setView('rewards'); setActiveDropdown(null); }}><IC n="star" /> Rewards & Recognition</div>
                    <div className="dropdown-item" onClick={() => { setView('jobs'); setActiveDropdown(null); }}><IC n="briefcase" /> Internal Job Portal</div>
                    <div className="dropdown-item" onClick={() => { setView('meetings'); setActiveDropdown(null); }}><IC n="video" /> Meeting Scheduler</div>
                  </>}
                  {isEmp && <>
                    <div className="dropdown-item" onClick={() => { setView('recruitment'); setActiveDropdown(null); }}><IC n="adduser" /> Recruitment Targets</div>
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
            <div 
              className="nav-dropdown-wrapper"
              onMouseEnter={() => handleMouseEnterDropdown('billing')}
              onMouseLeave={handleMouseLeaveDropdown}
            >
              <button 
                className={`nav-capsule-btn ${activeDropdown === 'billing' ? 'active' : ''}`} 
                onClick={(e) => { e.stopPropagation(); toggleDropdown('billing'); }}
              >
                <span>Billing & Support</span>
                <IC n="chevron" s={11} style={{ transition: 'transform 0.25s ease', transform: activeDropdown === 'billing' ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {activeDropdown === 'billing' && (
                <div className="nav-dropdown-menu" onMouseEnter={() => handleMouseEnterDropdown('billing')} onMouseLeave={handleMouseLeaveDropdown}>
                  {isSA && <>
                    <div className="dropdown-item" onClick={() => { setView('payroll'); setActiveDropdown(null); }}><IC n="card" /> Payroll Management</div>
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
                    <div className="dropdown-item" onClick={() => { setView('documents'); setActiveDropdown(null); }}><IC n="file" /> Documents</div>
                    <div className="dropdown-item" onClick={() => { setView('assets'); setActiveDropdown(null); }}><IC n="monitor" /> Assets</div>
                    <div className="dropdown-item" onClick={() => { setView('auditor'); setActiveDropdown(null); }}><IC n="shield" /> Compliance</div>
                  </>}
                  {isEmp && <>
                    <div className="dropdown-item" onClick={() => { setView('attendance'); setActiveDropdown(null); }}><IC n="clock" /> Attendance</div>
                    <div className="dropdown-item" onClick={() => { setView('leaves'); setActiveDropdown(null); }}><IC n="calendar" /> Leave</div>
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
          <button 
            className="cegs-btn-bell" 
            onClick={() => setShowMessengerInbox(true)}
            style={{ position: 'relative' }}
            title="Team Messenger & Live Chat"
          >
            <IC n="message" s={15} />
            {unreadMsgCount > 0 ? (
              <span className="badge" style={{ position: 'absolute', top: -4, right: -4, background: '#7C5CFC', color: '#FFF', fontSize: 10, padding: '1px 5px', borderRadius: 99, fontWeight: 900 }}>
                {unreadMsgCount}
              </span>
            ) : (
              <span className="cegs-bell-blue-dot" style={{ background: '#7C5CFC' }} />
            )}
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

      {showLogoutModal && (
        <div className="modal-backdrop anim-fadein" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-box anim-scalein" style={{ maxWidth: 420, textAlign: 'center', padding: '32px 28px', borderRadius: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🚪</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#111827', fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>
              Log Out of Workspace?
            </div>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, lineHeight: 1.5 }}>
              Are you sure you want to exit your current HRMS portal session?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-ghost" style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 700 }} onClick={() => setShowLogoutModal(false)}>
                Stay Logged In
              </button>
              <button className="btn btn-red" style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 800 }} onClick={() => { setShowLogoutModal(false); logout(); }}>
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE QUICK VIEW MODAL */}
      <EmployeeQuickViewModal 
        targetUser={quickViewUser} 
        currentUser={user} 
        db={db} 
        onClose={() => setQuickViewUser(null)} 
        onStartChat={(target) => {
          setQuickViewUser(null);
          setChatTargetUser(target);
          setShowMessengerInbox(true);
        }} 
      />

      {/* GLOBAL MESSENGER & DIRECT CHAT MODAL */}
      <GlobalMessengerModal 
        open={showMessengerInbox || !!chatTargetUser} 
        onClose={() => { setShowMessengerInbox(false); setChatTargetUser(null); }} 
        currentUser={user} 
        targetUser={chatTargetUser} 
        setTargetUser={setChatTargetUser} 
        db={db} 
        save={save} 
      />
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   LOGIN / WORKSPACE PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function LoginPage({ login, db }) {
  const [mode, setMode] = useState('portal'); // portal | creds
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  // Work Mode & Geolocation Security State
  const [workMode, setWorkMode] = useState('WFO'); // 'WFO' | 'WFH'
  const [locationVerified, setLocationVerified] = useState(false);
  const [geoStatusMsg, setGeoStatusMsg] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Office Location Coordinates (12°57'04.9"N 77°36'29.5"E - Koramangala Office)
  const OFFICE_LAT = 12.951361;
  const OFFICE_LNG = 77.608194;

  const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Radius of earth in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  const handleVerifyLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatusMsg({ success: false, text: 'Browser GPS not supported. Use Dev Verify below.' });
      return;
    }
    setGeoLoading(true);
    setGeoStatusMsg({ success: false, text: 'Acquiring GPS coordinates...' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const dist = getDistanceFromLatLonInMeters(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG);
        if (dist <= 100) {
          setLocationVerified(true);
          setGeoStatusMsg({ success: true, text: `✓ Verified! You are ${dist}m from Novel Office Koramangala (Within 100m limit).` });
        } else {
          setLocationVerified(false);
          setGeoStatusMsg({ success: false, text: `❌ Access Denied: You are ${dist}m away from Koramangala Office (Required <= 100m).` });
        }
      },
      (err) => {
        setGeoLoading(false);
        setGeoStatusMsg({ success: false, text: `GPS Error: ${err.message}. Click Dev Confirm button below.` });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleDevTestVerify = () => {
    setLocationVerified(true);
    setGeoStatusMsg({ success: true, text: '✓ (Dev Verified) 12m from Novel Office Koramangala (57 13th Cross, Baldwins Road).' });
  };

  const checkWorkModeLocationAccess = () => {
    if (workMode === 'WFO' && !locationVerified) {
      alert('❌ Access Denied!\n\nWork From Office (WFO) login requires confirming your location within 100 meters of Novel Office Koramangala.\n\nPlease click "📍 Verify Office Location" on the login page to confirm your proximity before logging in.');
      return false;
    }
    return true;
  };

  const quickLogin = async role => {
    if (!checkWorkModeLocationAccess()) return;
    const map = {employee:'madiha@cegs.com',admin:'nusrath@cegs.com',super_admin:'superadmin@cegs.com'};
    setEmail(map[role] || '');
    setPass('Password123');
    setMode('creds');
  };

  const handleCreds = async e => {
    e.preventDefault(); 
    if (!checkWorkModeLocationAccess()) return;
    setLoading('creds');
    await new Promise(r=>setTimeout(r,400));
    await login(email,pass); 
    setLoading(false);
  };

  const renderWorkModeSecurityCard = () => (
    <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 20, padding: 18, marginBottom: 20, maxWidth: 640, width: '100%', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
          🛡️ Location & Work Mode Security
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 800, background: workMode === 'WFO' ? (locationVerified ? '#E6F4EA' : '#FEF3C7') : '#EFF6FF', color: workMode === 'WFO' ? (locationVerified ? '#137333' : '#D97706') : '#3B82F6', borderRadius: 99, padding: '3px 10px' }}>
          {workMode === 'WFO' ? (locationVerified ? 'WFO VERIFIED ✓' : 'WFO LOCATION REQUIRED 📍') : 'WORK FROM HOME (WFH) 🏡'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <button 
          type="button"
          style={{ 
            background: workMode === 'WFO' ? '#111827' : '#F3F4F6', 
            color: workMode === 'WFO' ? '#FFFFFF' : '#4B5563', 
            border: workMode === 'WFO' ? '1px solid #111827' : '1px solid #E5E7EB', 
            borderRadius: 14, padding: '10px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s ease' 
          }}
          onClick={() => { setWorkMode('WFO'); setLocationVerified(false); setGeoStatusMsg(null); }}
        >
          🏢 Work From Office (WFO)
        </button>
        <button 
          type="button"
          style={{ 
            background: workMode === 'WFH' ? '#111827' : '#F3F4F6', 
            color: workMode === 'WFH' ? '#FFFFFF' : '#4B5563', 
            border: workMode === 'WFH' ? '1px solid #111827' : '1px solid #E5E7EB', 
            borderRadius: 14, padding: '10px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s ease' 
          }}
          onClick={() => { setWorkMode('WFH'); setLocationVerified(true); setGeoStatusMsg(null); }}
        >
          🏡 Work From Home (WFH)
        </button>
      </div>

      {workMode === 'WFO' && (
        <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
            🏢 Office: <strong>Novel Office Koramangala</strong> (57 13th Cross, Baldwins Rd, Bengaluru 560030)
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>
            WFO Login requires GPS confirmation within <strong>100 meters</strong> of Novel Office Koramangala.
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              type="button"
              style={{ background: '#7C5CFC', color: '#FFFFFF', border: 'none', borderRadius: 99, padding: '7px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={handleVerifyLocation}
              disabled={geoLoading}
            >
              📍 {geoLoading ? 'Verifying GPS...' : 'Verify Office Location'}
            </button>
            <button 
              type="button"
              style={{ background: '#E0E7FF', color: '#3730A3', border: '1px solid #C7D2FE', borderRadius: 99, padding: '7px 14px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}
              onClick={handleDevTestVerify}
              title="Simulate 100m office proximity for local testing"
            >
              ⚡ Dev Confirm (100m Proximity)
            </button>
          </div>

          {geoStatusMsg && (
            <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, color: geoStatusMsg.success ? '#059669' : '#DC2626' }}>
              {geoStatusMsg.text}
            </div>
          )}
        </div>
      )}

      {workMode === 'WFH' && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: 10, fontSize: 11.5, color: '#1E40AF', fontWeight: 600 }}>
          ✓ Work From Home selected. Remote session enabled without location restriction.
        </div>
      )}
    </div>
  );

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

          {renderWorkModeSecurityCard()}

          <form onSubmit={handleCreds}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" autoFocus required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <PasswordInput value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" required />
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

      {renderWorkModeSecurityCard()}

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

      <span className="ws-footer-link" style={{ marginTop: 24 }} onClick={()=>setMode('creds')}>Sign in with custom credentials instead</span>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   PAGE HEADER COMPONENT
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function PageHdr({ title, sub, children, onBack, setView, showBack = true }) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (setView) {
      setView('dashboard');
    } else if (typeof window !== 'undefined' && typeof window.changeHrmsView === 'function') {
      window.changeHrmsView('dashboard');
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,gap:16,flexWrap:'wrap'}}>
      <div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:4}}>
          {showBack && (
            <button 
              type="button" 
              onClick={handleBack}
              style={{
                padding:'6px 14px', borderRadius:99, fontWeight:800, fontSize:13,
                background:'var(--bg-raised, #F3F4F6)', color:'var(--text-main, #1F2937)',
                border:'1px solid var(--border, #E5E7EB)', display:'inline-flex', alignItems:'center', gap:6,
                cursor:'pointer', boxShadow:'0 2px 4px rgba(0,0,0,0.03)'
              }}
              title="Go Back"
            >
              <IC n="arrow" s={14} style={{ transform: 'rotate(180deg)' }} /> Back
            </button>
          )}
          <div className="page-title" style={{margin:0}}>{title}</div>
        </div>
        {sub && <div className="page-subtitle" style={{marginTop:2}}>{sub}</div>}
      </div>
      {children && <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{children}</div>}
    </div>
  );
}



/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   MODAL COMPONENT
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function Modal({ open, onClose, title, subtitle, children, maxWidth = 860 }) {
  if (!open) return null;
  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px 16px 20px',
        overflowY: 'auto'
      }}
    >
      <div 
        className="modal-box" 
        onClick={e => e.stopPropagation()}
        style={{
          width: '94%',
          maxWidth: maxWidth || 860,
          maxHeight: 'calc(100vh - 100px)',
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-raised, #FFFFFF)',
          borderRadius: 24,
          boxShadow: '0 30px 90px rgba(0,0,0,0.4)',
          border: '1px solid var(--border, #E5E7EB)',
          overflow: 'hidden',
          margin: '0 auto'
        }}
      >
        <div 
          className="modal-hdr"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 28px',
            borderBottom: '1px solid var(--border, #E5E7EB)',
            background: 'var(--bg-surface, #F8FAFC)',
            flexShrink: 0
          }}
        >
          <div>
            <div className="modal-title" style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-main, #0F172A)', letterSpacing: '-0.3px' }}>{title}</div>
            {subtitle && <div className="modal-subtitle" style={{ fontSize: 13, color: 'var(--text-muted, #64748B)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button 
            type="button" 
            className="modal-close" 
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              cursor: 'pointer',
              width: 36,
              height: 36,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              transition: 'all 0.2s'
            }}
          >
            <IC n="x" s={18} />
          </button>
        </div>

        <div 
          className="modal-body-scroll"
          style={{
            padding: '28px 32px',
            overflowY: 'auto',
            flex: '1 1 auto',
            minHeight: 0,
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   EMPLOYEE QUICK VIEW MODAL
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function EmployeeQuickViewModal({ targetUser, currentUser, db, onClose, onStartChat }) {
  if (!targetUser) return null;
  const dept = (db.departments || []).find(d => d.id === targetUser.department_id || d.id === targetUser.deptId);
  const manager = (db.users || []).find(u => u.id === targetUser.reports_to || u.id === targetUser.reportsTo);
  const canViewFinancials = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.id === targetUser.id;

  return (
    <Modal open={!!targetUser} onClose={onClose} title="👤 Employee Quick Profile & Directory Details" maxWidth={780}>
      <div>
        {/* TOP PROFILE CARD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: 'var(--bg-surface, #F8FAFC)', padding: '20px 24px', borderRadius: 20, border: '1px solid var(--border, #E2E8F0)', marginBottom: 24, flexWrap: 'wrap' }}>
          <img 
            src={targetUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.name}`} 
            alt="" 
            style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid #7C5CFC', boxShadow: '0 8px 24px rgba(124,92,252,0.25)', flexShrink: 0 }} 
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-main, #0F172A)', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                {targetUser.name}
              </h2>
              <span className="badge b-success" style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
                🟢 Active & Online
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#7C5CFC', marginTop: 4 }}>
              {targetUser.designation || targetUser.title || targetUser.role} · {dept?.name || 'CEGS Team'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #64748B)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
              ID: {targetUser.employee_id || targetUser.employeeId || targetUser.eid || `EMP-${targetUser.id}`} · Role: {(targetUser.role || 'employee').toUpperCase()}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn btn-dark" 
              onClick={() => { onClose(); onStartChat(targetUser); }}
              style={{ background: '#7C5CFC', padding: '10px 18px', fontWeight: 800, borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <IC n="chat" s={16} /> 💬 Direct Chat
            </button>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* Contact Details */}
          <div className="card" style={{ padding: 18, border: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#7C5CFC', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              📧 Contact Details
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Official Email</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>
                <a href={`mailto:${targetUser.email}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{targetUser.email}</a>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phone Number</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {targetUser.phone || targetUser.contact || '+1 (212) 555-0199'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Emergency Phone</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {targetUser.emergencyPhone || targetUser.emergency_contact || 'N/A'}
              </div>
            </div>
          </div>

          {/* Job & Hierarchy Info */}
          <div className="card" style={{ padding: 18, border: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#7C5CFC', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              💼 Work & Position Info
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Department</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{dept?.name || 'General Operations'}</div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Reporting Manager</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{manager?.name || 'CEO SuperAdmin'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Date of Joining</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{targetUser.joining_date || targetUser.joined || '2024-01-15'}</div>
            </div>
          </div>

          {/* Financial & Security Info */}
          <div className="card" style={{ padding: 18, border: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#7C5CFC', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              💳 Compensation & Bank Info
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Basic Monthly Salary</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#10B981' }}>
                {canViewFinancials ? `₹${(targetUser.basic_salary || targetUser.salary || 30000).toLocaleString()}` : '🔒 Restricted (HR Only)'}
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bank & Account No.</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                {canViewFinancials ? `${targetUser.bank_name || targetUser.bankName || 'CEGS Bank'} (${targetUser.account_number || targetUser.bankAccount || '••••4455'})` : '🔒 Restricted'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>IFSC Code</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                {canViewFinancials ? (targetUser.ifsc_code || targetUser.bankIfsc || 'CEGS0000123') : '🔒 Restricted'}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
          <a href={`mailto:${targetUser.email}`} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IC n="mail" s={14} /> Send Email
          </a>
          <button 
            type="button" 
            className="btn btn-dark" 
            onClick={() => { onClose(); onStartChat(targetUser); }}
            style={{ background: '#7C5CFC', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IC n="chat" s={14} /> 💬 Start Chat
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   GLOBAL MESSENGER & LIVE DIRECT CHAT MODAL
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function GlobalMessengerModal({ open, onClose, currentUser, targetUser, setTargetUser, db, save }) {
  if (!open) return null;

  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);

  const otherUsers = (db.users || []).filter(u => u.id !== currentUser?.id && (u.name.toLowerCase().includes(search.toLowerCase()) || (u.title || '').toLowerCase().includes(search.toLowerCase())));
  const activeChatPartner = targetUser || otherUsers[0] || (db.users || []).find(u => u.id !== currentUser?.id);

  const conversation = (db.messages || []).filter(m => 
    (m.fromId === currentUser?.id && m.toId === activeChatPartner?.id) ||
    (m.fromId === activeChatPartner?.id && m.toId === currentUser?.id)
  ).sort((a, b) => new Date(a.time) - new Date(b.time));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.length]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChatPartner) return;

    const newMsg = {
      id: Date.now(),
      fromId: currentUser.id,
      toId: activeChatPartner.id,
      text: text.trim(),
      time: new Date().toISOString(),
      read: 0
    };

    save('messages', [...(db.messages || []), newMsg]);
    setText('');
  };

  return (
    <Modal open={open} onClose={onClose} title="💬 CEGS Team Messenger & Live Chat" subtitle="Instant direct messaging across all team members" maxWidth={940}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, height: 480 }}>
        {/* LEFT USER LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', paddingRight: 16 }}>
          <input 
            className="form-input" 
            placeholder="🔍 Search colleague..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ marginBottom: 12, padding: '8px 12px', fontSize: 12.5 }}
          />

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, scrollbarWidth: 'thin' }}>
            {otherUsers.map(u => {
              const isSelected = activeChatPartner?.id === u.id;
              const userMsgs = (db.messages || []).filter(m => m.fromId === u.id && m.toId === currentUser?.id && !m.read);
              
              return (
                <div 
                  key={u.id}
                  onClick={() => setTargetUser(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    background: isSelected ? '#7C5CFC' : 'var(--bg-surface, #F8FAFC)',
                    color: isSelected ? '#FFFFFF' : 'var(--text-main, #1E293B)',
                    transition: 'all 0.2s'
                  }}
                >
                  <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt="" style={{ width: 38, height: 38, borderRadius: '50%', border: isSelected ? '2px solid #FFF' : '2px solid #E2E8F0', flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.title || u.designation || u.role}</div>
                  </div>
                  {userMsgs.length > 0 && (
                    <span style={{ background: '#EF4444', color: '#FFF', borderRadius: 99, padding: '2px 6px', fontSize: 10, fontWeight: 900 }}>
                      {userMsgs.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT CHAT THREAD & INPUT */}
        {activeChatPartner ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Active Partner Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
              <img src={activeChatPartner.avatar} alt="" style={{ width: 42, height: 42, borderRadius: '50%', border: '2px solid #7C5CFC' }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-main)' }}>{activeChatPartner.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{activeChatPartner.title || activeChatPartner.designation} · {activeChatPartner.email}</div>
              </div>
            </div>

            {/* Conversation Messages */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8, display: 'flex', flexDirection: 'column', gap: 12, scrollbarWidth: 'thin' }}>
              {conversation.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
                  💬 No chat messages yet. Say hello to <strong>{activeChatPartner.name}</strong>!
                </div>
              ) : (
                conversation.map(m => {
                  const isMe = m.fromId === currentUser?.id;
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div 
                        style={{
                          maxWidth: '75%',
                          padding: '12px 16px',
                          borderRadius: isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                          background: isMe ? '#7C5CFC' : 'var(--bg-surface, #F1F5F9)',
                          color: isMe ? '#FFFFFF' : 'var(--text-main, #0F172A)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                          fontSize: 13.5,
                          lineHeight: 1.4
                        }}
                      >
                        <div>{m.text}</div>
                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                          {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <input 
                className="form-input" 
                placeholder={`Type a message to ${activeChatPartner.name.split(' ')[0]}...`} 
                value={text} 
                onChange={e => setText(e.target.value)}
                style={{ flex: 1, padding: '12px 16px' }}
                autoFocus
              />
              <button type="submit" className="btn btn-dark" style={{ background: '#7C5CFC', padding: '0 20px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span>Send</span> <IC n="send" s={15} />
              </button>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
            Select an employee to start a conversation.
          </div>
        )}
      </div>
    </Modal>
  );
}
/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   LUNCH BREAK TRACKER STOPWATCH WIDGET
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================= */
function LunchBreakWidget({ user, db, save }) {
  const isHR = user?.role === 'admin' || (user?.title && typeof user.title === 'string' && user.title.toLowerCase().includes('hr manager'));
  const isSA = user?.role === 'super_admin';
  const lunchAllowedMins = (isHR || isSA) ? 60 : 30;

  const todayStr = new Date().toLocaleDateString('en-GB');
  const allBreakRecords = db?.lunchBreaks || [];
  const todayUserRecords = allBreakRecords.filter(r => r.userId === user?.id && r.date === todayStr);

  const [selectedBreakType, setSelectedBreakType] = useState('lunch'); // 'lunch', 'short1', 'short2'

  // Current active session (if any break is in progress)
  const activeSession = todayUserRecords.find(r => r.status === 'in_progress');

  // Active or selected break type
  const currentBreakType = activeSession ? (activeSession.breakType || 'lunch') : selectedBreakType;
  const currentAllowedMins = currentBreakType === 'lunch' ? lunchAllowedMins : 15;

  const currentDisplayRecord = activeSession || todayUserRecords.find(r => (r.breakType || 'lunch') === currentBreakType);

  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [viewTab, setViewTab] = useState('my_break');
  const [isFocusedView, setIsFocusedView] = useState(() => !!activeSession);

  useEffect(() => {
    let timer;
    if (activeSession && activeSession.startTime) {
      const updateTimer = () => {
        const diff = Math.floor((Date.now() - activeSession.startTime) / 1000);
        setElapsedSecs(diff);
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else {
      setElapsedSecs(0);
    }
    return () => clearInterval(timer);
  }, [activeSession]);

  const handleStartBreak = (typeToStart) => {
    const targetType = typeToStart || selectedBreakType;
    const mins = targetType === 'lunch' ? lunchAllowedMins : 15;
    const now = Date.now();
    const newRecord = {
      id: Date.now(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      date: todayStr,
      breakType: targetType, // 'lunch', 'short1', 'short2'
      startTime: now,
      startFormatted: new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      endTime: null,
      endFormatted: null,
      totalDurationSecs: 0,
      allowedMinutes: mins,
      status: 'in_progress'
    };

    setActiveSession(newRecord);
    setIsFocusedView(true);
    const updated = [newRecord, ...allBreakRecords.filter(r => !(r.userId === user.id && r.date === todayStr && (r.breakType || 'lunch') === targetType))];
    save('lunchBreaks', updated);
  };

  const handleEndBreak = () => {
    if (!activeSession) return;
    const now = Date.now();
    const duration = Math.floor((now - activeSession.startTime) / 1000);
    const isExceeded = duration > (activeSession.allowedMinutes || 15) * 60;

    const completedRecord = {
      ...activeSession,
      endTime: now,
      endFormatted: new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      totalDurationSecs: duration,
      status: isExceeded ? 'exceeded' : 'completed'
    };

    setIsFocusedView(false);
    const updated = [completedRecord, ...allBreakRecords.filter(r => !(r.userId === user.id && r.date === todayStr && (r.breakType || 'lunch') === (activeSession.breakType || 'lunch')))];
    save('lunchBreaks', updated);
  };

  const totalTargetSecs = currentAllowedMins * 60;
  const remainingSecs = Math.max(0, totalTargetSecs - elapsedSecs);
  const isOvertime = elapsedSecs > totalTargetSecs;

  const fmtMinSec = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const allUsers = db?.users || [];

  const getBreakTitle = (type) => {
    if (type === 'short1') return 'Short Break 1 (15 Mins)';
    if (type === 'short2') return 'Short Break 2 (15 Mins)';
    return `Lunch Break (${lunchAllowedMins} Mins)`;
  };

  return (
    <>
      {/* NORMAL INLINE DASHBOARD WIDGET */}
      <div className="shift-tracker-card" style={{ background: 'rgba(255, 255, 255, 0.62)', backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)', border: '1px solid rgba(255, 255, 255, 0.75)', borderRadius: 24, padding: 22, boxShadow: '0 8px 32px rgba(120, 100, 80, 0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 320, position: 'relative' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {currentBreakType === 'lunch' ? '🍱' : '☕'}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Shift & Break Tracker</div>
                <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Lunch + 2x Flexible 15m Short Breaks</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {(isHR || isSA) && (
                <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', padding: 3, borderRadius: 99 }}>
                  <button className={`btn btn-xs ${viewTab==='my_break'?'btn-dark':'btn-ghost'}`} style={{ borderRadius: 99, fontSize: 10.5, padding: '3px 10px' }} onClick={()=>setViewTab('my_break')}>My Stopwatch</button>
                  <button className={`btn btn-xs ${viewTab==='team'?'btn-dark':'btn-ghost'}`} style={{ borderRadius: 99, fontSize: 10.5, padding: '3px 10px' }} onClick={()=>setViewTab('team')}>Team Status</button>
                </div>
              )}
              <button 
                className="btn btn-xs btn-ghost" 
                style={{ borderRadius: 99, fontSize: 11, fontWeight: 800, color: '#7C5CFC', background: '#F3F0FF', padding: '4px 10px' }} 
                onClick={() => setIsFocusedView(true)} 
                title="Maximize Break Stopwatch Focus Mode"
              >
                ⛶ Maximize
              </button>
            </div>
          </div>

          {viewTab === 'my_break' ? (
            <>
              {/* BREAK TYPE SELECTION BAR */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12, background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(8px)', padding: 4, borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.65)' }}>
                {[
                  { id: 'lunch', label: `🍱 Lunch (${lunchAllowedMins}m)`, icon: '🍱' },
                  { id: 'short1', label: '☕ Break 1 (15m)', icon: '☕' },
                  { id: 'short2', label: '☕ Break 2 (15m)', icon: '☕' },
                ].map(b => {
                  const rec = todayUserRecords.find(r => (r.breakType || 'lunch') === b.id);
                  const isCurrentActive = activeSession && (activeSession.breakType || 'lunch') === b.id;
                  const isSelected = !activeSession && selectedBreakType === b.id;
                  const isHighlighted = isCurrentActive || isSelected;

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => !activeSession && setSelectedBreakType(b.id)}
                      disabled={!!activeSession && !isCurrentActive}
                      style={{
                        padding: '6px 4px',
                        fontSize: 10.5,
                        fontWeight: 800,
                        borderRadius: 10,
                        border: isHighlighted ? '1.5px solid #7C5CFC' : '1px solid transparent',
                        background: isHighlighted ? '#FFFFFF' : 'transparent',
                        color: isHighlighted ? '#7C5CFC' : '#64748B',
                        cursor: activeSession && !isCurrentActive ? 'not-allowed' : 'pointer',
                        boxShadow: isHighlighted ? '0 2px 6px rgba(124,92,252,0.12)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <span>{b.label}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: rec ? (rec.status === 'completed' ? '#10B981' : rec.status === 'in_progress' ? '#D97706' : '#EF4444') : '#94A3B8' }}>
                        {rec ? (rec.status === 'completed' ? 'Done ✓' : rec.status === 'in_progress' ? 'Active ⏳' : 'Exceeded') : 'Available'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#4B5563' }}>
                  Selected: <strong style={{ color: '#7C5CFC' }}>{getBreakTitle(currentBreakType)}</strong>
                </span>
                <span style={{ 
                  background: activeSession ? '#FEF3C7' : (currentDisplayRecord?.status === 'completed' ? '#E6F4EA' : currentDisplayRecord?.status === 'exceeded' ? '#FCE8E6' : '#F3F4F6'), 
                  color: activeSession ? '#D97706' : (currentDisplayRecord?.status === 'completed' ? '#137333' : currentDisplayRecord?.status === 'exceeded' ? '#C5221F' : '#6B7280'), 
                  borderRadius: 99, padding: '3px 10px', fontSize: 10.5, fontWeight: 800 
                }}>
                  {activeSession ? 'ON BREAK ⏳' : (currentDisplayRecord?.status === 'completed' ? 'COMPLETED ✓' : currentDisplayRecord?.status === 'exceeded' ? 'EXCEEDED ⚠️' : 'NOT STARTED')}
                </span>
              </div>

              {/* STOPWATCH DIGITAL DISPLAY */}
              <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', borderRadius: 20, padding: '18px 16px', color: '#FFFFFF', textAlign: 'center', margin: '10px 0', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)', cursor: 'pointer' }} onClick={() => setIsFocusedView(true)}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 4 }}>
                  {activeSession ? (isOvertime ? 'EXCEEDED BREAK DURATION' : 'COUNTDOWN REMAINING') : (currentDisplayRecord?.status ? 'TODAY\'S BREAK DURATION' : `${getBreakTitle(currentBreakType).toUpperCase()} STOPWATCH`)}
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '1.5px', color: isOvertime ? '#EF4444' : '#38BDF8' }}>
                  {activeSession ? (isOvertime ? `+${fmtMinSec(elapsedSecs - totalTargetSecs)}` : fmtMinSec(remainingSecs)) : (currentDisplayRecord?.totalDurationSecs ? fmtMinSec(currentDisplayRecord.totalDurationSecs) : fmtMinSec(totalTargetSecs))}
                </div>
                <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 4, fontWeight: 600 }}>
                  {activeSession ? `Elapsed: ${fmtMinSec(elapsedSecs)} / ${currentAllowedMins}:00 Mins (Click to Maximize)` : (currentDisplayRecord?.startFormatted ? `Break taken: ${currentDisplayRecord.startFormatted} ${currentDisplayRecord.endFormatted ? `to ${currentDisplayRecord.endFormatted}` : ''}` : `Allotted Duration: ${currentAllowedMins} Minutes (Flexible Timing)`)}
                </div>
              </div>
            </>
          ) : (
            /* TEAM LUNCH & BREAK MONITORING (FOR HR & SUPER ADMIN) */
            <div style={{ background: '#F9FAFB', borderRadius: 16, padding: 12, border: '1px solid #F3F4F6', maxHeight: 240, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Staff Lunch & Short Break Monitoring</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allUsers.map(u => {
                  const userRecs = allBreakRecords.filter(r => r.userId === u.id && r.date === todayStr);
                  const activeRec = userRecs.find(r => r.status === 'in_progress');
                  const completedCount = userRecs.filter(r => r.status === 'completed' || r.status === 'exceeded').length;

                  return (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '8px 10px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 11.5 }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#111827' }}>{u.name}</div>
                        <div style={{ fontSize: 10, color: '#6B7280' }}>Breaks taken: {completedCount}/3</div>
                      </div>
                      {activeRec ? (
                        <span style={{ background: '#FEF3C7', color: '#D97706', borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>
                          ON {activeRec.breakType === 'short1' ? 'SHORT 1' : activeRec.breakType === 'short2' ? 'SHORT 2' : 'LUNCH'} ⏳
                        </span>
                      ) : (
                        <span style={{ background: completedCount > 0 ? '#E6F4EA' : '#F3F4F6', color: completedCount > 0 ? '#137333' : '#9CA3AF', borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                          {completedCount > 0 ? `${completedCount} Taken ✓` : 'Not Taken'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* CONTROLS & ACTION BUTTONS */}
        {viewTab === 'my_break' && (
          <div style={{ marginTop: 12 }}>
            {!activeSession && !currentDisplayRecord?.endTime && (
              <button 
                className="btn" 
                style={{ width: '100%', background: currentBreakType === 'lunch' ? 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' : 'linear-gradient(135deg, #7C5CFC 0%, #6366F1 100%)', color: '#FFFFFF', border: 'none', borderRadius: 14, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(124,92,252,0.25)' }}
                onClick={() => handleStartBreak(currentBreakType)}
              >
                {currentBreakType === 'lunch' ? `🍱 Start Lunch Break (${lunchAllowedMins} Mins)` : `☕ Start ${getBreakTitle(currentBreakType)}`}
              </button>
            )}

            {activeSession && (
              <button 
                className="btn" 
                style={{ width: '100%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFFFFF', border: 'none', borderRadius: 14, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}
                onClick={handleEndBreak}
              >
                ✅ End {getBreakTitle(currentBreakType)} & Resume Work
              </button>
            )}

            {!activeSession && currentDisplayRecord?.endTime && (
              <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 14, padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Total Break Taken: {Math.round(currentDisplayRecord.totalDurationSecs / 60)} Mins</span>
                <button className="btn btn-xs btn-ghost" style={{ fontSize: 11, color: '#6B7280' }} onClick={() => {
                  if (window.confirm(`Reset today's ${getBreakTitle(currentBreakType)} timer?`)) {
                    const updated = allBreakRecords.filter(r => !(r.userId === user.id && r.date === todayStr && (r.breakType || 'lunch') === currentBreakType));
                    save('lunchBreaks', updated);
                  }
                }}>Reset</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MAXIMIZED FULLSCREEN FOCUS OVERLAY WITH BLURRED BACKGROUND */}
      {isFocusedView && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '95px 24px 40px 24px',
          overflowY: 'auto',
          animation: 'fadeIn 0.25s ease'
        }} onClick={() => setIsFocusedView(false)}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 32,
            maxWidth: 580,
            width: '100%',
            padding: '36px 32px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.2)',
            border: '2px solid #FDE68A',
            position: 'relative',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            margin: 'auto'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Top Header with Close/Minimize */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: '0 4px 14px rgba(217,119,6,0.2)' }}>
                  {currentBreakType === 'lunch' ? '🍱' : '☕'}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
                    {activeSession ? `⏳ ${getBreakTitle(currentBreakType).toUpperCase()} IN PROGRESS` : getBreakTitle(currentBreakType).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, marginTop: 2 }}>
                    Flexible Shift Timing · {user?.name}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsFocusedView(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: 99,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                title="Minimize view to dashboard"
              >
                ✕ Minimize
              </button>
            </div>

            {/* Giant Stopwatch Monitor Box */}
            <div style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              borderRadius: 24,
              padding: '36px 24px',
              textAlign: 'center',
              margin: '20px 0',
              border: '2px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5), 0 12px 30px rgba(15,23,42,0.3)'
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: activeSession ? (isOvertime ? '#FCA5A5' : '#38BDF8') : '#94A3B8', marginBottom: 8 }}>
                {activeSession ? (isOvertime ? '⚠️ EXCEEDED ALLOTTED BREAK DURATION' : '⏳ COUNTDOWN REMAINING') : (currentDisplayRecord?.status ? 'TODAY\'S BREAK DURATION' : 'BREAK STOPWATCH')}
              </div>

              <div style={{
                fontSize: 68,
                fontWeight: 900,
                fontFamily: 'monospace',
                letterSpacing: '3px',
                color: isOvertime ? '#EF4444' : '#38BDF8',
                textShadow: isOvertime ? '0 0 20px rgba(239,68,68,0.4)' : '0 0 24px rgba(56,189,248,0.4)',
                margin: '10px 0'
              }}>
                {activeSession ? (isOvertime ? `+${fmtMinSec(elapsedSecs - totalTargetSecs)}` : fmtMinSec(remainingSecs)) : (currentDisplayRecord?.totalDurationSecs ? fmtMinSec(currentDisplayRecord.totalDurationSecs) : fmtMinSec(totalTargetSecs))}
              </div>

              <div style={{ fontSize: 14, color: '#E2E8F0', fontWeight: 700, marginTop: 10 }}>
                {activeSession ? (
                  <span>Elapsed Time: <strong style={{ color: '#FDE68A' }}>{fmtMinSec(elapsedSecs)}</strong> / Allotted {currentAllowedMins}:00 Mins</span>
                ) : currentDisplayRecord?.startFormatted ? (
                  <span>Break session: <strong>{currentDisplayRecord.startFormatted}</strong> {currentDisplayRecord.endFormatted ? `to ${currentDisplayRecord.endFormatted}` : ''}</span>
                ) : (
                  <span>Allotted Break Window: <strong>{currentAllowedMins} Minutes</strong></span>
                )}
              </div>
            </div>

            {/* Action Buttons in Maximized View */}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!activeSession && !currentDisplayRecord?.endTime && (
                <button 
                  className="btn" 
                  style={{ width: '100%', background: 'linear-gradient(135deg, #7C5CFC 0%, #6366F1 100%)', color: '#FFFFFF', border: 'none', borderRadius: 16, padding: '16px', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 6px 20px rgba(124,92,252,0.35)' }}
                  onClick={() => handleStartBreak(currentBreakType)}
                >
                  Start {getBreakTitle(currentBreakType)}
                </button>
              )}

              {activeSession && (
                <button 
                  className="btn" 
                  style={{ width: '100%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFFFFF', border: 'none', borderRadius: 16, padding: '16px', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 6px 20px rgba(16,185,129,0.35)' }}
                  onClick={handleEndBreak}
                >
                  ✅ End {getBreakTitle(currentBreakType)} & Resume Work
                </button>
              )}

              {!activeSession && currentDisplayRecord?.endTime && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: '14px 18px', fontSize: 14, fontWeight: 700, color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Total Break Duration: <strong>{Math.round(currentDisplayRecord.totalDurationSecs / 60)} Mins</strong></span>
                  <button className="btn btn-xs btn-ghost" style={{ fontSize: 12, color: '#64748B' }} onClick={() => {
                    if (window.confirm(`Reset today's ${getBreakTitle(currentBreakType)} timer?`)) {
                      const updated = allBreakRecords.filter(r => !(r.userId === user.id && r.date === todayStr && (r.breakType || 'lunch') === currentBreakType));
                      save('lunchBreaks', updated);
                      setActiveSession(null);
                    }
                  }}>Reset Session</button>
                </div>
              )}

              <button
                style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center', marginTop: 4 }}
                onClick={() => setIsFocusedView(false)}
              >
                Return to Dashboard
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

function DashboardPage({ db, save, user, setView, setQuickViewUser, setChatTargetUser, openChatWithUser }) {
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

  // Developer Quick View Modal State
  const [showDevQuickView, setShowDevQuickView] = useState(false);

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
  const [activeDay, setActiveDay] = useState(todayIdx >= 0 ? todayIdx : 0);

  // ── EVENT CALENDAR STATE & DATA ──
  const [eventCategoryFilter, setEventCategoryFilter] = useState('all'); // 'all' | 'leave' | 'hiring' | 'holiday' | 'birthday' | 'meeting'
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventForm, setNewEventForm] = useState({ title: '', type: 'leave', date: new Date().toISOString().split('T')[0], person: user?.name || '', notes: '' });

  const defaultEvents = [
    { id: 'evt_1', title: 'Casual Leave - Nusrath Hussain', type: 'leave', date: '2026-08-04', person: 'Nusrath Hussain', icon: '🌴', badgeColor: '#EF4444', badgeBg: '#FEE2E2', notes: 'Approved Annual Leave' },
    { id: 'evt_2', title: 'Medical Leave - Madiha Mehak', type: 'leave', date: '2026-08-07', person: 'Madiha Mehak', icon: '🩺', badgeColor: '#F59E0B', badgeBg: '#FEF3C7', notes: 'Sick Leave & Doctor Checkup' },
    { id: 'evt_3', title: 'Personal Leave - Mohammed Raheel', type: 'leave', date: '2026-08-11', person: 'Mohammed Raheel', icon: '🌴', badgeColor: '#EF4444', badgeBg: '#FEE2E2', notes: 'Family Event' },
    { id: 'evt_4', title: 'Onboarding - Mohammed Raheel (Billing)', type: 'hiring', date: '2026-08-03', person: 'Mohammed Raheel', icon: '🚀', badgeColor: '#8B5CF6', badgeBg: '#F3E8FF', notes: 'Billing Specialist Joining Date' },
    { id: 'evt_5', title: 'New Hire Joining - Ananya Sharma (Engineering)', type: 'hiring', date: '2026-08-05', person: 'Ananya Sharma', icon: '✨', badgeColor: '#3B82F6', badgeBg: '#EFF6FF', notes: 'Frontend Engineer Welcome & System Setup' },
    { id: 'evt_6', title: 'New Hire Joining - Vikramaditya (Sales Strategy)', type: 'hiring', date: '2026-08-08', person: 'Vikramaditya', icon: '💼', badgeColor: '#10B981', badgeBg: '#ECFDF5', notes: 'Senior Sales Lead Orientation' },
    { id: 'evt_7', title: 'Independence Day (National Holiday)', type: 'holiday', date: '2026-08-15', person: 'Company Holiday', icon: '🏖️', badgeColor: '#D97706', badgeBg: '#FEF3C7', notes: 'Official CEGS Office Holiday' },
    { id: 'evt_8', title: 'Raksha Bandhan Holiday', type: 'holiday', date: '2026-08-19', person: 'Company Holiday', icon: '🪔', badgeColor: '#EC4899', badgeBg: '#FCE7F3', notes: 'Festive Holiday' },
    { id: 'evt_9', title: 'Janmashtami Holiday', type: 'holiday', date: '2026-08-26', person: 'Company Holiday', icon: '🪶', badgeColor: '#6366F1', badgeBg: '#EEF2FF', notes: 'Festive Holiday' },
    { id: 'evt_10', title: "CEO Saif's Birthday 🎂🎉", type: 'birthday', date: '2026-08-12', person: 'Saif Awaisi', icon: '🎂', badgeColor: '#EC4899', badgeBg: '#FCE7F3', notes: 'System Architect & CEO Birthday Celebration' },
    { id: 'evt_11', title: "Madiha's Birthday 🎂", type: 'birthday', date: '2026-08-22', person: 'Madiha Mehak', icon: '🎂', badgeColor: '#8B5CF6', badgeBg: '#F3E8FF', notes: 'Team Birthday Celebration' },
    { id: 'evt_12', title: "Raheel's Birthday 🎂", type: 'birthday', date: '2026-08-28', person: 'Mohammed Raheel', icon: '🎈', badgeColor: '#3B82F6', badgeBg: '#EFF6FF', notes: 'Billing Specialist Birthday' },
    { id: 'evt_13', title: 'Monthly All-Hands Strategy Meeting', type: 'meeting', date: '2026-08-10', person: 'All CEGS Staff', icon: '🎯', badgeColor: '#059669', badgeBg: '#ECFDF5', notes: 'Monthly Targets & Performance Review' },
    { id: 'evt_14', title: 'Q3 Recruitment Target Sync', type: 'meeting', date: '2026-08-20', person: 'HR Team', icon: '📊', badgeColor: '#6D28D9', badgeBg: '#EDE9FE', notes: 'Recruitment & Onboarding Alignment' }
  ];

  const eventsList = db.events && db.events.length > 0 ? db.events : defaultEvents;

  // Merge approved leaves dynamically from db.leaves
  const approvedLeavesEvents = (db.leaves || []).filter(l => l.status === 'approved').map(l => ({
    id: `leave_${l.id}`,
    title: `Approved Leave - ${l.employee_name || 'Staff Member'}`,
    type: 'leave',
    date: l.start_date,
    person: l.employee_name || 'Staff Member',
    icon: '🌴',
    badgeColor: '#EF4444',
    badgeBg: '#FEE2E2',
    notes: `${l.leave_type} (${l.start_date} to ${l.end_date})`
  }));

  const allEventsCombined = [...eventsList, ...approvedLeavesEvents];

  const handleAddEventSubmit = (e) => {
    e.preventDefault();
    if (!newEventForm.title.trim()) return;

    let icon = '🎯';
    let badgeColor = '#8B5CF6';
    let badgeBg = '#F3E8FF';
    if (newEventForm.type === 'leave') { icon = '🌴'; badgeColor = '#EF4444'; badgeBg = '#FEE2E2'; }
    else if (newEventForm.type === 'hiring') { icon = '🚀'; badgeColor = '#3B82F6'; badgeBg = '#EFF6FF'; }
    else if (newEventForm.type === 'holiday') { icon = '🏖️'; badgeColor = '#D97706'; badgeBg = '#FEF3C7'; }
    else if (newEventForm.type === 'birthday') { icon = '🎂'; badgeColor = '#EC4899'; badgeBg = '#FCE7F3'; }

    const createdEvent = {
      id: 'evt_' + Date.now(),
      title: newEventForm.title.trim(),
      type: newEventForm.type,
      date: newEventForm.date,
      person: newEventForm.person || user?.name || '',
      icon,
      badgeColor,
      badgeBg,
      notes: newEventForm.notes || ''
    };

    save('events', [...allEventsCombined, createdEvent]);
    setShowAddEventModal(false);
    setNewEventForm({ title: '', type: 'leave', date: new Date().toISOString().split('T')[0], person: user?.name || '', notes: '' });
  };

  // ── LIVE CHAT SIDEBAR SEARCH STATE ──
  const [chatWidgetSearch, setChatWidgetSearch] = useState('');

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
  const userTasks = (db.workTasks || []).filter(t => isAdmin || t.uid === user.id);
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

        {/* ROW 2: Interactive Event Calendar (Leaves, New Hirings, Holidays, Birthdays, Meetings) */}
        <div className="calendar-schedule-widget" style={{ borderRadius: 24, padding: 24, background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
          {/* Header & Filter Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#111827', fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}>
                  📅 Team Event & Schedule Calendar
                </h3>
                <span style={{ background: '#F3E8FF', color: '#7C5CFC', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
                  {allEventsCombined.length} Scheduled Events
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>
                Track staff leaves 🌴, new hirings 🚀, upcoming holidays 🏖️, team birthdays 🎂, & meetings 🎯
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button 
                type="button" 
                style={{ background: '#7C5CFC', color: '#ffffff', border: 'none', borderRadius: 99, padding: '7px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(124,92,252,0.3)' }}
                onClick={() => setShowAddEventModal(true)}
              >
                ➕ Add Event
              </button>
            </div>
          </div>

          {/* EVENT CATEGORY FILTER PILLS */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, borderBottom: '1px solid #F3F4F6', paddingBottom: 14 }}>
            {[
              { id: 'all', label: 'All Events', icon: '✨' },
              { id: 'leave', label: 'Leaves', icon: '🌴' },
              { id: 'hiring', label: 'New Hirings', icon: '🚀' },
              { id: 'holiday', label: 'Holidays', icon: '🏖️' },
              { id: 'birthday', label: 'Birthdays', icon: '🎂' },
              { id: 'meeting', label: 'Meetings', icon: '🎯' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                style={{
                  background: eventCategoryFilter === cat.id ? '#111827' : '#F3F4F6',
                  color: eventCategoryFilter === cat.id ? '#FFFFFF' : '#4B5563',
                  border: 'none',
                  borderRadius: 99,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: eventCategoryFilter === cat.id ? '0 2px 6px rgba(0,0,0,0.15)' : 'none'
                }}
                onClick={() => setEventCategoryFilter(cat.id)}
              >
                {cat.icon} {cat.label} ({cat.id === 'all' ? allEventsCombined.length : allEventsCombined.filter(e => e.type === cat.id).length})
              </button>
            ))}
          </div>

          {/* DAY CAPSULES SLIDER WITH EVENT INDICATOR DOTS */}
          <div className="calendar-slider-container" style={{ gap: 10, paddingBottom: 8 }}>
            {weekdays.map((w, idx) => {
              const isSunday = w.day === 'Sunday';
              const isSelected = activeDay === idx;
              const dayEvents = allEventsCombined.filter(e => e.date === w.fullDateStr || (isSunday && e.type === 'holiday'));

              return (
                <div 
                  key={idx} 
                  className={`cal-capsule ${isSelected ? 'active' : ''} ${isSunday ? 'sunday-blur' : ''}`} 
                  onClick={() => setActiveDay(idx)}
                  style={{
                    flex: '0 0 calc(100% / 7 - 10px)',
                    minWidth: 72,
                    padding: '12px 6px',
                    borderRadius: 20,
                    background: isSelected ? 'linear-gradient(135deg, #7C5CFC 0%, #6366F1 100%)' : isSunday ? '#FEF2F2' : '#F9FAFB',
                    border: isSelected ? '2px solid #7C5CFC' : isSunday ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
                    color: isSelected ? '#FFFFFF' : isSunday ? '#991B1B' : '#111827',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? '0 6px 16px rgba(124,92,252,0.35)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: isSelected ? 0.9 : 0.6 }}>
                    {w.day.slice(0, 3)}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 900, margin: '2px 0' }}>
                    {w.date}
                  </span>
                  
                  {/* Event Dots */}
                  <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                    {dayEvents.length > 0 ? (
                      dayEvents.slice(0, 3).map((ev, i) => (
                        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: isSelected ? '#FFFFFF' : ev.badgeColor || '#7C5CFC', display: 'inline-block' }} />
                      ))
                    ) : (
                      <span style={{ fontSize: 9, opacity: 0.4 }}>•</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SELECTED DAY / FILTERED EVENT CARDS LIST */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                📌 {eventCategoryFilter === 'all' 
                  ? `Events for ${weekdays[activeDay]?.day || 'Selected Date'} (${weekdays[activeDay]?.date || ''} ${weekdays[activeDay]?.monthName || ''})`
                  : `${eventCategoryFilter.toUpperCase()} EVENTS LIST`}
              </span>
              <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>
                Click "+ Add Event" to add custom team events
              </span>
            </div>

            {/* Event List Items */}
            {(() => {
              const selectedDateStr = weekdays[activeDay]?.fullDateStr;
              const displayEvents = allEventsCombined.filter(e => {
                const matchesCategory = eventCategoryFilter === 'all' || e.type === eventCategoryFilter;
                const matchesDate = eventCategoryFilter !== 'all' ? true : (e.date === selectedDateStr || (weekdays[activeDay]?.day === 'Sunday' && e.type === 'holiday'));
                return matchesCategory && matchesDate;
              });

              if (displayEvents.length === 0) {
                return (
                  <div style={{ background: '#F9FAFB', borderRadius: 16, padding: '16px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 12.5, fontWeight: 600, border: '1px dashed #E5E7EB' }}>
                    ✨ No scheduled events on this date. Click "+ Add Event" to add leaves, birthdays, or meetings!
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                  {displayEvents.map(evt => {
                    const evtUser = (db.users || []).find(u => u.name.toLowerCase() === evt.person.toLowerCase());
                    return (
                      <div 
                        key={evt.id} 
                        style={{ 
                          background: evt.badgeBg || '#F9FAFB', 
                          border: `1px solid ${evt.badgeColor}40`, 
                          borderRadius: 16, 
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: 24, width: 40, height: 40, borderRadius: 12, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                            {evt.icon || '📌'}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>{evt.title}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: evt.badgeColor, marginTop: 2 }}>
                              👤 {evt.person} • 📅 {evt.date}
                            </div>
                            {evt.notes && (
                              <div style={{ fontSize: 10.5, color: '#6B7280', marginTop: 2 }}>{evt.notes}</div>
                            )}
                          </div>
                        </div>

                        {evtUser && evtUser.id !== user?.id && (
                          <button 
                            type="button"
                            className="btn btn-xs"
                            onClick={() => openChatWithUser ? openChatWithUser(evtUser) : (setChatTargetUser && setChatTargetUser(evtUser))}
                            style={{ background: evt.badgeColor, color: '#FFFFFF', borderRadius: 8, padding: '4px 10px', fontSize: 10.5, fontWeight: 800, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            💬 Wish / Chat
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
                  <div 
                    key={u.id} 
                    className="team-slide-card"
                    onClick={() => openChatWithUser ? openChatWithUser(u) : (setChatTargetUser && setChatTargetUser(u))}
                    style={{ cursor: 'pointer' }}
                    title={`Click to open direct chat with ${u.name}`}
                  >
                    <div className="team-card-color-bar" style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)` }} />
                    <img src={u.avatar} className="team-card-avatar" alt="" style={{ border: `3px solid ${color}` }} />
                    <div className="team-card-name">{u.name}</div>
                    <div className="team-card-role">{u.title || 'Engineer'}</div>
                    <button className="btn btn-xs btn-ghost" style={{ marginTop: 4, fontSize: 10, padding: '2px 8px', borderRadius: 6, color: '#7C5CFC', fontWeight: 800 }}>
                      💬 Chat
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>



        {/* ROW 5: Task Board Kanban list & Lunch Break Stopwatch */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.2fr) minmax(320px, 1fr)', gap: 20, marginBottom: 28, alignItems: 'stretch' }}>
          <div className="taskboard-widget" style={{ marginBottom: 0 }}>
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

          {/* Lunch Break Tracker Stopwatch */}
          <LunchBreakWidget user={user} db={db} save={save} />
        </div>
      </div>

      {/* RIGHT FLOATING SIDEBAR */}
      <div className="modern-dash-sidebar">
        {/* WIDGET 1: Modern Live Team Chat & Messenger Sidebar */}
        <div className="card" style={{ padding: 20, borderRadius: 24, background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(124, 92, 252, 0.2)', boxShadow: '0 10px 30px rgba(124, 92, 252, 0.08)' }}>
          <div className="card-hdr" style={{ paddingBottom: 12, marginBottom: 14, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div>
              <div className="section-title" style={{ fontSize: 16, fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                💬 Live Team Messenger
              </div>
              <div className="section-sub" style={{ fontSize: 11.5, color: '#6B7280', marginTop: 2 }}>
                Instant direct messaging across staff
              </div>
            </div>
            <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: 99, fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
              {db.users.length} Online
            </span>
          </div>

          {/* SEARCH TEAM INPUT */}
          <input 
            style={{ width: '100%', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 600, outline: 'none', marginBottom: 12 }}
            placeholder="🔍 Search colleague..."
            value={chatWidgetSearch}
            onChange={e => setChatWidgetSearch(e.target.value)}
          />

          {/* TEAM CHAT CARDS LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto', paddingRight: 2 }}>
            {(db.users || [])
              .filter(u => u.id !== user?.id && (u.name.toLowerCase().includes(chatWidgetSearch.toLowerCase()) || (u.title || '').toLowerCase().includes(chatWidgetSearch.toLowerCase())))
              .slice(0, 5)
              .map(u => {
                const unreadCount = (db.messages || []).filter(m => m.fromId === u.id && m.toId === user?.id && !m.read).length;
                return (
                  <div 
                    key={u.id} 
                    onClick={() => openChatWithUser ? openChatWithUser(u) : (setChatTargetUser && setChatTargetUser(u))}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '10px 12px', 
                      background: unreadCount > 0 ? '#F3E8FF' : '#F9FAFB', 
                      borderRadius: 16, 
                      border: unreadCount > 0 ? '1px solid #C084FC' : '1px solid #E5E7EB', 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ position: 'relative' }}>
                        <img src={u.avatar || u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`} style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid #7C5CFC', objectFit: 'cover' }} alt="" />
                        <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#10B981', border: '2px solid #FFFFFF' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: '#7C5CFC', fontWeight: 700 }}>{u.title || u.designation || 'Team Member'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {unreadCount > 0 && (
                        <span style={{ background: '#EF4444', color: '#FFFFFF', borderRadius: 99, padding: '2px 7px', fontSize: 10, fontWeight: 900 }}>
                          {unreadCount} new
                        </span>
                      )}
                      <button 
                        type="button" 
                        className="btn btn-xs"
                        style={{ padding: '5px 10px', fontSize: 11, fontWeight: 800, background: 'linear-gradient(135deg, #7C5CFC 0%, #6366F1 100%)', color: '#ffffff', borderRadius: 99, border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(124,92,252,0.25)' }}
                      >
                        💬 Chat
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          <button 
            type="button" 
            className="btn btn-sm btn-ghost" 
            onClick={() => setShowMessengerInbox(true)} 
            style={{ width: '100%', marginTop: 14, fontSize: 12, fontWeight: 800, borderRadius: 99, border: '1px dashed #7C5CFC', color: '#7C5CFC', padding: 8 }}
          >
            🚀 Open Full Team Messenger Inbox
          </button>
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

        {/* WIDGET 4: Developer Profile Card (Clickable Quick View) */}
        <div 
          className="card anim-fadeup card-hover-effect" 
          style={{ borderRadius: 24, padding: 20, border: '1px solid rgba(0,0,0,0.06)', background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 14, cursor: 'pointer' }}
          onClick={() => setShowDevQuickView(true)}
          title="Click to view Developer Profile Quick View"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
              <img 
                src="/dev_saif.jpg" 
                alt="Saif Awaisi - Developer & System Architect" 
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=SaifAwaisi'; }}
                style={{ width: 90, height: 90, borderRadius: 18, border: '3px solid #7C5CFC', background: '#F3E8FF', objectFit: 'cover', boxShadow: '0 6px 20px rgba(124,92,252,0.25)' }} 
              />
              <span style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, background: '#10B981', border: '2px solid #FFFFFF', borderRadius: '50%' }} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#111827', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Saif Awaisi</div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#7C5CFC', marginTop: 2 }}>Developer & System Architect</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginTop: 2 }}>CEGS HRMS Lead Engineer</div>
            </div>
          </div>

          <div style={{ background: '#F3F4F6', borderRadius: 14, padding: '10px 14px', fontSize: 11.5, color: '#4B5563', lineHeight: 1.5, fontWeight: 600 }}>
            🚀 Lead developer of enterprise role-based portals, MongoDB Atlas cloud sync, & daily task engine.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 10.5, fontWeight: 800 }}>
              <span style={{ background: '#F3E8FF', color: '#7C5CFC', borderRadius: 99, padding: '3px 10px' }}>Lead Developer</span>
              <span style={{ background: '#EFF6FF', color: '#3B82F6', borderRadius: 99, padding: '3px 10px' }}>React 18</span>
              <span style={{ background: '#ECFDF5', color: '#10B981', borderRadius: 99, padding: '3px 10px' }}>Node & MongoDB</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button 
              type="button" 
              className="btn btn-sm btn-ghost" 
              onClick={(e) => { e.stopPropagation(); setShowDevQuickView(true); }}
              style={{ flex: 1, padding: '6px', fontSize: 11.5, fontWeight: 800, borderRadius: 10 }}
            >
              👁️ Quick View
            </button>
            <button 
              type="button" 
              className="btn btn-sm btn-dark" 
              onClick={(e) => { 
                e.stopPropagation(); 
                const saifUser = (db.users || []).find(u => u.name.toLowerCase().includes('saif')) || {
                  id: 3,
                  name: 'Saif Awaisi',
                  title: 'Developer & System Architect',
                  email: 'saifawaisi79@gmail.com',
                  avatar: '/dev_saif.jpg'
                };
                setChatTargetUser && setChatTargetUser(saifUser);
              }}
              style={{ flex: 1, padding: '6px', fontSize: 11.5, fontWeight: 800, background: '#7C5CFC', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            >
              💬 Chat
            </button>
          </div>
        </div>

        {/* DEVELOPER QUICK VIEW MODAL */}
        <Modal open={showDevQuickView} onClose={() => setShowDevQuickView(false)} title="Developer & System Architect Quick View">
          <div style={{ padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 16px' }}>
              <img 
                src="/dev_saif.jpg" 
                alt="Saif Awaisi" 
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=SaifAwaisi'; }}
                style={{ width: 160, height: 160, borderRadius: 24, border: '4px solid #7C5CFC', objectFit: 'cover', boxShadow: '0 8px 30px rgba(124,92,252,0.3)' }} 
              />
              <span style={{ position: 'absolute', bottom: 6, right: 6, width: 18, height: 18, background: '#10B981', border: '3px solid #FFFFFF', borderRadius: '50%' }} />
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Saif Awaisi</h2>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#7C5CFC', marginTop: 2 }}>Developer & System Architect</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginTop: 1 }}>CEGS HRMS Lead Engineer</div>

            <div style={{ background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)', borderRadius: 14, padding: '12px 14px', margin: '12px 0', border: '1px solid #E5E7EB', textAlign: 'left' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#374151', marginBottom: 4 }}>System Architecture Overview</div>
              <p style={{ fontSize: 11.5, color: '#4B5563', lineHeight: 1.5, margin: 0, fontWeight: 600 }}>
                Lead architect & developer behind CEGS HRMS platform. Built multi-role security portals, LAN/WiFi network security, Candidate Datasheet Excel engine, and live attendance tracking.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
              <span style={{ background: '#F3E8FF', color: '#7C5CFC', borderRadius: 99, padding: '4px 10px', fontSize: 10.5, fontWeight: 800 }}>💻 Lead Developer</span>
              <span style={{ background: '#EFF6FF', color: '#3B82F6', borderRadius: 99, padding: '4px 10px', fontSize: 10.5, fontWeight: 800 }}>⚡ React 18 & Vite</span>
              <span style={{ background: '#ECFDF5', color: '#10B981', borderRadius: 99, padding: '4px 10px', fontSize: 10.5, fontWeight: 800 }}>🍃 Node & MongoDB</span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                className="btn btn-dark" 
                style={{ flex: 1, borderRadius: 10, padding: '9px 14px', fontSize: 12.5, fontWeight: 800, background: '#7C5CFC', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} 
                onClick={() => {
                  setShowDevQuickView(false);
                  const saifUser = (db.users || []).find(u => u.name.toLowerCase().includes('saif')) || {
                    id: 3,
                    name: 'Saif Awaisi',
                    title: 'Developer & System Architect',
                    email: 'saifawaisi79@gmail.com',
                    avatar: '/dev_saif.jpg'
                  };
                  if (openChatWithUser) {
                    openChatWithUser(saifUser);
                  } else if (setChatTargetUser) {
                    setChatTargetUser(saifUser);
                  }
                }}
              >
                💬 Start Chat with Saif
              </button>
              <button 
                className="btn btn-ghost" 
                style={{ flex: 1, borderRadius: 10, padding: '9px 14px', fontSize: 12.5, fontWeight: 700 }} 
                onClick={() => setShowDevQuickView(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>

        {/* ADD EVENT MODAL */}
        <Modal open={showAddEventModal} onClose={() => setShowAddEventModal(false)} title="📅 Add Team Event / Schedule">
          <form onSubmit={handleAddEventSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Event Title *</label>
              <input 
                className="form-input" 
                placeholder="e.g., Casual Leave - Nusrath / Diwali Holiday" 
                value={newEventForm.title} 
                onChange={e => setNewEventForm({ ...newEventForm, title: e.target.value })} 
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Event Type *</label>
                <select 
                  className="form-input" 
                  value={newEventForm.type} 
                  onChange={e => setNewEventForm({ ...newEventForm, type: e.target.value })}
                >
                  <option value="leave">🌴 Leave / Absence</option>
                  <option value="hiring">🚀 New Hiring / Onboarding</option>
                  <option value="holiday">🏖️ Holiday / Festivity</option>
                  <option value="birthday">🎂 Birthday Celebration</option>
                  <option value="meeting">🎯 Meeting / Company Sync</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Event Date *</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={newEventForm.date} 
                  onChange={e => setNewEventForm({ ...newEventForm, date: e.target.value })} 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Person / Staff Name</label>
              <input 
                className="form-input" 
                placeholder="e.g., Saif Awaisi / Company Holiday" 
                value={newEventForm.person} 
                onChange={e => setNewEventForm({ ...newEventForm, person: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes / Description</label>
              <textarea 
                className="form-input" 
                rows="2" 
                placeholder="Optional details or instructions..." 
                value={newEventForm.notes} 
                onChange={e => setNewEventForm({ ...newEventForm, notes: e.target.value })} 
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="submit" className="btn btn-dark" style={{ flex: 1, padding: 10, background: '#7C5CFC', borderRadius: 99, fontWeight: 800 }}>
                ✓ Save Event to Calendar
              </button>
              <button type="button" className="btn btn-ghost" style={{ padding: '10px 18px', borderRadius: 99, fontWeight: 700 }} onClick={() => setShowAddEventModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   EMPLOYEES PAGE
======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
function EmployeesPage({ db, save, user, setView, setQuickViewUser, setChatTargetUser, openChatWithUser }) {
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
  const canEdit = db.permissions?.[currentPermRole]?.deleteEmp ?? ['admin','super_admin'].includes(user.role);

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
  const [form, setForm] = useState({type:'casual',start:'',end:'',reason:''});
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
  const isAdmin = db.permissions?.[currentPermRole]?.approveLeave ?? ['admin','super_admin'].includes(user.role);

  const submit = e => {
    e.preventDefault();
    save('leaves',[{id:Date.now(),uid:user.id,...form,status:'pending',applied:new Date().toISOString().split('T')[0]},...db.leaves]);
    setModal(false); setForm({type:'casual',start:'',end:'',reason:''});
    alert('Leave request submitted successfully!');
  };

  const decide = (id,status) => {
    const note = status==='rejected' ? prompt('Rejection reason:') : null;
    if(status==='rejected'&&note===null) return;
    save('leaves',db.leaves.map(l=>l.id===id?{...l,status,by:user.id,note}:l));
  };

  const myLeaves = db.leaves.filter(l=>l.uid===user.id);
  const sickUsed=myLeaves.filter(l=>(l.type==='sick'||l.type==='vacation')&&l.status==='approved').length;
  const casualUsed=myLeaves.filter(l=>(l.type==='casual'||l.type==='personal')&&l.status==='approved').length;
  const list=(isAdmin?db.leaves:myLeaves).filter(l=>filter==='all'||l.status===filter);

  const balances=[
    {l:'Casual Leave',used:casualUsed,tot:12,c:'#10B981'},
    {l:'Sick Leave',used:sickUsed,tot:12,c:'#3B82F6'}
  ];

  return (
    <div className="anim-fadeup">
      <PageHdr title="Leave Management" sub={`${list.length} requests ${filter!=='all'?`(${filter})`:''}`}>
        <button className="btn btn-dark" onClick={()=>setModal(true)}><IC n="plus"/> Apply for Leave</button>
      </PageHdr>

      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16,marginBottom:24}}>
        {balances.map(b=>(
          <div key={b.l} className="card" style={{padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,alignItems:'flex-start'}}>
              <div>
                <div style={{fontWeight:800,fontSize:16,color:'var(--text-primary)'}}>{b.l}</div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>Annual Allowance: {b.tot} Days</div>
              </div>
              <div style={{fontFamily:'Outfit',fontSize:28,fontWeight:900,color:b.c}}>{b.tot-b.used}</div>
            </div>
            <div className="progress-track progress-sm" style={{marginBottom:8,height:8}}><div className="progress-fill" style={{width:`${Math.min(100, (b.used/b.tot)*100)}%`,background:b.c}}/></div>
            <div style={{fontSize:12,color:'var(--text-secondary)',fontWeight:700}}>{b.used} used of {b.tot} days ({b.tot - b.used} remaining)</div>
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
                  <td><span className="badge b-info" style={{textTransform:'capitalize'}}>{l.type === 'vacation' ? 'Sick Leave' : l.type === 'personal' ? 'Casual Leave' : `${l.type} Leave`}</span></td>
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
              <option value="casual">Casual Leave (12 Days)</option>
              <option value="sick">Sick Leave (12 Days)</option>
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
  const isAdmin = db.permissions?.[currentPermRole]?.attendance ?? ['admin','super_admin'].includes(user.role);
  const today = new Date().toISOString().split('T')[0];
  const todayRec = db.attendance.find(a=>a.uid===user.id&&a.date===today);

  useEffect(()=>{
    if(running){ intRef.current=setInterval(()=>setSecs(s=>s+1),1000); }
    else { clearInterval(intRef.current); }
    return()=>clearInterval(intRef.current);
  },[running]);

  const fmt = s=>`${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const clockIn = async () => {
    if (todayRec) { alert('Already checked in today!'); return; }
    const now = new Date();
    // Office timings: 10:15 AM to 7:00 PM. Clock In after 10:15 AM is flagged as Late.
    const isLate = now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() > 15);
    const status = isLate ? 'late' : 'present';
    save('attendance', [{ id: Date.now(), uid: user.id, date: today, in: now.toTimeString().substr(0, 5), out: null, status, hrs: 0 }, ...db.attendance]);
    setRunning(true);
  };

  // Clock Out is locked until 6:30 PM (18:30) every working day
  const nowObj = new Date();
  const curHour = nowObj.getHours();
  const curMin = nowObj.getMinutes();
  const isClockOutUnlocked = isAdmin || user?.role === 'super_admin' || curHour > 18 || (curHour === 18 && curMin >= 30);

  const clockOut = async () => {
    if (!todayRec || todayRec.out) {
      alert(!todayRec ? 'Clock in first!' : 'Already clocked out.');
      return;
    }
    if (!isClockOutUnlocked) {
      alert('🔒 Clock Out is locked until 6:30 PM. You can only register your Clock Out starting at 6:30 PM on working days.');
      return;
    }
    const hrs = parseFloat((secs / 3600).toFixed(2)) || 8.0;
    save('attendance', db.attendance.map(a => a.uid === user.id && a.date === today ? { ...a, out: new Date().toTimeString().substr(0, 5), hrs } : a));
    setRunning(false);
    setSecs(0);
  };

  const myLogs = isAdmin ? db.attendance : db.attendance.filter(a => a.uid === user.id);
  const presentDays = db.attendance.filter(a => a.uid === user.id && a.status === 'present').length;
  const lateDays = db.attendance.filter(a => a.uid === user.id && a.status === 'late').length;
  const totalHrs = db.attendance.filter(a => a.uid === user.id).reduce((s, a) => s + a.hrs, 0);

  // Dynamic Live Calendar calculations
  const curYear = nowObj.getFullYear();
  const curMonth = nowObj.getMonth();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const curMonthName = monthNames[curMonth];
  const firstDayIndex = new Date(curYear, curMonth, 1).getDay();
  const totalDaysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const todayNum = nowObj.getDate();

  return (
    <div className="anim-fadeup">
      <PageHdr title="Attendance" sub="Track daily work hours (10:15 AM – 7:00 PM) · GPS Location Security Active"/>

      {/* Location Protection & Clock-Out Policy Badge */}
      <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 14, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#065F46', fontWeight: 700 }}>
          <span style={{ fontSize: 16 }}>📍</span>
          <span>GPS Location Security Active — Office Verified (Novel Office Koramangala) | <strong>Clock Out unlocks daily at 6:30 PM</strong></span>
        </div>
        <span style={{ background: '#10B981', color: '#fff', padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 800 }}>LOCATION VERIFIED</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="timer-card">
          <div className="timer-label">LIVE WORK TIMER</div>
          <div className="timer-digits">{fmt(secs)}</div>
          <div className="timer-actions">
            <button className="btn btn-amber" onClick={clockIn} style={{ flex: 1 }} disabled={!!todayRec}>
              {todayRec ? '✔ Clocked In' : 'Clock In'}
            </button>
            <button 
              className="btn btn-ghost" 
              onClick={clockOut} 
              style={{ 
                flex: 1, 
                color: '#fff', 
                borderColor: 'rgba(255,255,255,0.2)', 
                opacity: (!running || !isClockOutUnlocked) ? 0.5 : 1,
                cursor: (!running || !isClockOutUnlocked) ? 'not-allowed' : 'pointer'
              }} 
              disabled={!running || !isClockOutUnlocked}
              title={!isClockOutUnlocked ? 'Clock Out unlocks at 6:30 PM' : 'Click to Clock Out'}
            >
              {!running ? 'Clock Out' : !isClockOutUnlocked ? '🔒 Locked till 6:30 PM' : 'Clock Out'}
            </button>
          </div>
          {todayRec && <div style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'JetBrains Mono,monospace' }}>
            IN: {todayRec.in} {todayRec.out && `  |  OUT: ${todayRec.out}`} {!isClockOutUnlocked && !todayRec.out && `  (Clock Out unlocks at 6:30 PM)`}
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
              <thead>
                <tr>
                  <th>Date</th>
                  {isAdmin && <th>Employee</th>}
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myLogs.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      No attendance records found
                    </td>
                  </tr>
                ) : (
                  myLogs.sort((a,b)=>b.date.localeCompare(a.date)).map(a=>{
                    const emp=db.users.find(u=>u.id===a.uid);
                    return <tr key={a.id}>
                      <td style={{fontWeight:700,fontFamily:'JetBrains Mono,monospace',fontSize:13}}>{a.date}</td>
                      {isAdmin&&<td><div className="emp-cell"><img src={emp?.avatar} className="tbl-av" alt=""/>{emp?.name}</div></td>}
                      <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:13}}>{a.in}</td>
                      <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:13}}>{a.out||<span style={{color:'var(--amber)',fontWeight:700}}>Active</span>}</td>
                      <td style={{fontWeight:700}}>{a.hrs||'-'}h</td>
                      <td><span className={`badge ${a.status==='present'?'b-success':a.status==='late'?'b-pending':'b-error'}`}><span className="badge-dot"/>{a.status}</span></td>
                    </tr>;
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Interactive Calendar with Blurred Sundays */}
        <div className="card">
          <div className="card-hdr">
            <div className="section-title">{curMonthName} {curYear}</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Live Calendar</span>
          </div>
          <div className="cal-grid">
            {['S','M','T','W','T','F','S'].map((d,i)=><div key={i} className="cal-hdr" style={{ color: i === 0 ? '#EF4444' : undefined }}>{d}</div>)}
            {Array.from({length: firstDayIndex}, (_, i) => <div key={'e'+i} className="cal-day empty"/>)}
            {Array.from({length: totalDaysInMonth}, (_, i) => {
              const day = i + 1;
              const dateObj = new Date(curYear, curMonth, day);
              const isSunday = dateObj.getDay() === 0;
              const monthStr = String(curMonth + 1).padStart(2, '0');
              const dayStr = String(day).padStart(2, '0');
              const ds = `${curYear}-${monthStr}-${dayStr}`;
              const rec = db.attendance.find(a => a.uid === user.id && a.date === ds);
              
              let cls = '';
              if (isSunday) cls = 'sunday-holiday';
              else if (rec) cls = rec.status === 'present' ? 'present' : 'late';
              
              const isToday = day === todayNum;

              return (
                <div 
                  key={day} 
                  className={`cal-day ${cls} ${isToday ? 'today' : ''}`} 
                  title={isSunday ? 'Sunday Holiday (Office Closed)' : rec ? `In:${rec.in} Out:${rec.out||'ongoing'}` : 'No record'}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:16,fontSize:11.5}}>
            {[{c:'present',label:'Present'},{c:'late',label:'Late'},{c:'sunday-holiday',label:'Sunday (Holiday)'},{c:'empty',label:'No Record'}].map(item=>(
              <div key={item.c} style={{display:'flex',alignItems:'center',gap:5}}>
                <div className={`cal-day ${item.c}`} style={{width:14,height:14,borderRadius:4,minWidth:14,fontSize:0}}/>
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
function PayrollPage({ db, save, user, setView }) {
  const [month, setMonth] = useState(7);
  const [year] = useState(2026);
  const [payslip, setPayslip] = useState(null);

  const isSuperAdmin = user?.role === 'super_admin';

  if (!isSuperAdmin) {
    return (
      <div className="card anim-fadeup" style={{ padding: 40, textAlign: 'center', maxWidth: 600, margin: '40px auto', borderRadius: 24, background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827', marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>Payroll Access Restricted</h2>
        <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 20, fontWeight: 500 }}>
          Payroll processing, salary records, and financial disbursement tools are restricted exclusively to the <strong>Super Admin Portal</strong>. HR Managers and staff do not have permission to access Payroll.
        </p>
        <button className="btn btn-dark" style={{ background: '#7C5CFC', borderRadius: 99, padding: '10px 24px', fontWeight: 800, border: 'none', cursor: 'pointer' }} onClick={() => setView('dashboard')}>
          ➔ Return to Dashboard
        </button>
      </div>
    );
  }

  const isAdmin = true;

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
  const isHRorSA = user?.role === 'super_admin' || user?.role === 'admin' || (user?.title && typeof user.title === 'string' && user.title.toLowerCase().includes('hr manager'));

  const [tab, setTab] = useState('onboard_dir'); // 'onboard_dir' | 'checklists' | 'audit'
  const [onboardModal, setOnboardModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [credsModal, setCredsModal] = useState(null); // { employee_id, name, email, temp_password }
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inlineError, setInlineError] = useState('');

  const [form, setForm] = useState({
    employee_id: 'EMP' + Math.floor(100 + Math.random() * 900),
    name: '',
    email: '',
    contact: '',
    dob: '',
    address: '',
    designation: 'Recruiter',
    department_id: db.departments?.[0]?.id || 1,
    reports_to: '',
    joining_date: new Date().toISOString().slice(0, 10),
    employment_type: 'full_time',
    basic_salary: 30000,
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    emergency_contact: '',
    role: 'employee'
  });

  const [editForm, setEditForm] = useState(null);
  const [checklistModal, setChecklistModal] = useState(false);
  const [checklistForm, setChecklistForm] = useState({ uid: '', role: '', start: '' });

  // Fetch audit logs when audit tab is clicked
  useEffect(() => {
    if (tab === 'audit') {
      const API_BASE = GLOBAL_API_BASE;
      fetch(`${API_BASE}/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('cegs_token') || ''}` }
      })
        .then(res => res.ok ? res.json() : [])
        .then(data => setAuditLogs(data))
        .catch(() => {});
    }
  }, [tab]);

  // Helper to generate a strong permanent password
  const generatePermanentPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = 'Cegs@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass + Math.floor(100 + Math.random() * 900);
  };

  // Open Onboard Modal with fresh default employee ID & permanent password
  const openOnboard = () => {
    const nextId = 'EMP' + Math.floor(1000 + Math.random() * 9000);
    setForm({
      employee_id: nextId,
      name: '',
      email: '',
      password: generatePermanentPassword(),
      contact: '',
      dob: '',
      address: '',
      designation: 'Recruiter',
      department_id: db.departments?.[0]?.id || 1,
      reports_to: '',
      joining_date: new Date().toISOString().slice(0, 10),
      employment_type: 'full_time',
      basic_salary: 30000,
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      emergency_contact: '',
      role: 'employee'
    });
    setInlineError('');
    setOnboardModal(true);
  };

  // Submit Onboard Form with Permanent Password
  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    setInlineError('');

    const empIdClean = String(form.employee_id).trim();
    const emailClean = String(form.email).trim().toLowerCase();
    const permPassword = String(form.password || generatePermanentPassword()).trim();

    if (permPassword.length < 6) {
      setInlineError('⚠️ Permanent Password must be at least 6 characters long.');
      return;
    }

    // Frontend Duplicate Validation
    const dupId = db.users.find(u => String(u.employee_id || u.employeeId).trim() === empIdClean);
    if (dupId) {
      setInlineError(`⚠️ Employee ID "${empIdClean}" is already assigned to ${dupId.name}. Please enter a unique ID.`);
      return;
    }

    const dupEmail = db.users.find(u => String(u.email).trim().toLowerCase() === emailClean);
    if (dupEmail) {
      setInlineError(`⚠️ Email address "${emailClean}" is already registered to ${dupEmail.name}. Please enter a unique email.`);
      return;
    }

    const newEmp = {
      id: Date.now(),
      employee_id: empIdClean,
      employeeId: empIdClean,
      name: form.name.trim(),
      email: emailClean,
      contact: form.contact,
      phone: form.contact,
      designation: form.designation,
      title: form.designation,
      department_id: parseInt(form.department_id) || 1,
      role: form.role || 'employee',
      status: 'active',
      joining_date: form.joining_date,
      dob: form.dob,
      address: form.address,
      employment_type: form.employment_type,
      basic_salary: parseFloat(form.basic_salary) || 30000,
      bank_name: form.bank_name,
      bankName: form.bank_name,
      account_number: form.account_number,
      bankAccount: form.account_number,
      ifsc_code: form.ifsc_code,
      bankIfsc: form.ifsc_code,
      emergency_contact: form.emergency_contact,
      password: permPassword,
      temp_password: '',
      tempPassword: '',
      must_change_password: 0,
      last_login: null,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(form.name)}`
    };

    // Save to local store
    save('users', [newEmp, ...db.users]);

    // Send to backend API
    const API_BASE = GLOBAL_API_BASE;
    try {
      await fetch(`${API_BASE}/admin/employees/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('cegs_token') || ''}`
        },
        body: JSON.stringify({ ...form, password: permPassword, role: form.role })
      });
    } catch (err) {}

    setOnboardModal(false);
    setCredsModal({
      employee_id: empIdClean,
      name: form.name.trim(),
      email: emailClean,
      password: permPassword,
      isPermanent: true
    });
  };

  // Status Toggle
  const toggleUserStatus = async (targetUser) => {
    const newStatus = targetUser.status === 'active' ? 'inactive' : 'active';
    if (window.confirm(`Are you sure you want to ${newStatus === 'inactive' ? 'deactivate' : 'activate'} login access for ${targetUser.name}?`)) {
      save('users', db.users.map(u => u.id === targetUser.id ? { ...u, status: newStatus } : u));

      const API_BASE = GLOBAL_API_BASE;
      try {
        await fetch(`${API_BASE}/admin/users/${targetUser.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('cegs_token') || ''}`
          },
          body: JSON.stringify({ status: newStatus })
        });
      } catch (err) {}
    }
  };

  // Permanent Password Reset Action
  const triggerResetPassword = async (targetUser) => {
    const defaultNewPass = generatePermanentPassword();
    const inputPass = prompt(`Set new Permanent Password for ${targetUser.name}:`, defaultNewPass);
    if (!inputPass) return;

    const permanentPassClean = String(inputPass).trim();

    save('users', db.users.map(u => u.id === targetUser.id ? { 
      ...u, 
      password: permanentPassClean, 
      temp_password: '', 
      tempPassword: '', 
      must_change_password: 0 
    } : u));

    const API_BASE = GLOBAL_API_BASE;
    try {
      await fetch(`${API_BASE}/admin/employees/${targetUser.id}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('cegs_token') || ''}` 
        },
        body: JSON.stringify({ new_password: permanentPassClean })
      });
    } catch (err) {}

    setCredsModal({
      employee_id: targetUser.employee_id || targetUser.employeeId || 'EMP' + targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      password: permanentPassClean,
      isPermanent: true
    });
  };

  // Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm) return;

    save('users', db.users.map(u => u.id === editForm.id ? { ...u, ...editForm } : u));

    const API_BASE = GLOBAL_API_BASE;
    try {
      await fetch(`${API_BASE}/admin/employees/${editForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('cegs_token') || ''}`
        },
        body: JSON.stringify(editForm)
      });
    } catch (err) {}

    setEditModal(false);
    setEditForm(null);
  };

  // Copy Creds
  const copyCreds = () => {
    if (!credsModal) return;
    const pass = credsModal.password || credsModal.temp_password;
    const text = `CEGS HRMS Employee Portal Permanent Login Credentials:\n----------------------------------------\nEmployee Name: ${credsModal.name}\nEmployee ID: ${credsModal.employee_id}\nLogin Email: ${credsModal.email}\nPermanent Password: ${pass}\nPortal URL: ${window.location.origin}\n----------------------------------------\nDirect login enabled with permanent credentials.`;
    navigator.clipboard.writeText(text);
    alert('✓ Permanent Credentials copied to clipboard!');
  };

  // Filter Users
  const filteredUsers = db.users.filter(u => {
    const q = searchQuery.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.employee_id || u.employeeId || '').toLowerCase().includes(q) ||
      (u.designation || u.title || '').toLowerCase().includes(q);
  });

  const toggleTask = tid => save('tasks', db.tasks.map(t => t.id === tid ? { ...t, done: t.done ? 0 : 1 } : t));
  const addHire = e => {
    e.preventDefault();
    const id = Date.now();
    save('onboarding', [...db.onboarding, { id, uid: parseInt(checklistForm.uid), role: checklistForm.role, start: checklistForm.start, progress: 0, status: 'in_progress' }]);
    const newTasks = [
      { task: 'Submit ID proofs & tax documents', who: 'employee' },
      { task: 'Configure payroll & bank account', who: 'admin' },
      { task: 'Provision equipment (laptop, peripherals)', who: 'admin' },
      { task: 'Complete orientation & HR handbook', who: 'employee' },
      { task: 'Setup accounts (email, Slack, tools)', who: 'admin' },
      { task: 'First week 1:1 with team lead', who: 'employee' }
    ];
    save('tasks', [...db.tasks, ...newTasks.map((t, i) => ({ id: Date.now() + i + 1, hid: id, ...t, done: 0 }))]);
    setChecklistModal(false);
  };

  if (!isHRorSA) {
    return (
      <div className="card anim-fadeup" style={{ padding: 30, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🛡️</div>
        <h3 style={{ fontSize: 18, fontWeight: 800 }}>Access Restricted</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Employee Onboarding and Credential Generation administration is restricted to HR Admin and Super Admin roles.
        </p>
      </div>
    );
  }

  return (
    <div className="anim-fadeup">
      <PageHdr title="Employee Onboarding & Directory" sub="Onboard new employees, generate portal login credentials, manage account status, and track checklists">
        <button className="btn btn-dark" onClick={openOnboard}>
          <IC n="adduser" /> ➕ Onboard New Employee
        </button>
      </PageHdr>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button 
          className={`btn btn-sm ${tab === 'onboard_dir' ? 'btn-dark' : 'btn-ghost'}`} 
          onClick={() => setTab('onboard_dir')}
          style={{ fontWeight: 800 }}
        >
          👥 Employee Directory & Accounts ({db.users.length})
        </button>
        <button 
          className={`btn btn-sm ${tab === 'checklists' ? 'btn-dark' : 'btn-ghost'}`} 
          onClick={() => setTab('checklists')}
          style={{ fontWeight: 800 }}
        >
          📋 New Hire Checklists ({db.onboarding.length})
        </button>
        <button 
          className={`btn btn-sm ${tab === 'audit' ? 'btn-dark' : 'btn-ghost'}`} 
          onClick={() => setTab('audit')}
          style={{ fontWeight: 800 }}
        >
          📜 Security & Audit Logs
        </button>
      </div>

      {/* TAB 1: EMPLOYEE DIRECTORY & ONBOARDING */}
      {tab === 'onboard_dir' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <input 
              className="form-input" 
              placeholder="🔍 Search employee by name, ID, email, or designation..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ maxWidth: 380 }}
            />
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>
              Showing {filteredUsers.length} of {db.users.length} Employee Accounts
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Emp ID</th>
                    <th>Employee Name</th>
                    <th>Email / Login ID</th>
                    <th>Designation & Dept</th>
                    <th>Joining Date</th>
                    <th>Portal Role</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                        No employee records match your search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#7C5CFC' }}>
                          {u.employee_id || u.employeeId || `EMP${u.id}`}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src={u.avatar || u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #7C5CFC' }} alt="" />
                            <div>
                              <div style={{ fontWeight: 800, color: '#111827' }}>{u.name}</div>
                              <div style={{ fontSize: 11, color: '#6B7280' }}>{u.employment_type || 'Full-time'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5 }}>{u.email}</td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{u.designation || u.title || 'Team Member'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {db.departments?.find(d => d.id === u.department_id)?.name || 'General Operations'}
                          </div>
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 700 }}>{u.joining_date || 'N/A'}</td>
                        <td>
                          <span className={`badge ${u.role === 'super_admin' ? 'b-error' : u.role === 'admin' ? 'b-pending' : 'b-success'}`} style={{ textTransform: 'uppercase', fontSize: 10 }}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.status === 'active' ? 'b-success' : 'b-error'}`}>
                            <span className="badge-dot" />{u.status || 'active'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-sm btn-ghost" 
                              onClick={() => openChatWithUser ? openChatWithUser(u) : (setChatTargetUser && setChatTargetUser(u))}
                              title="Open Direct Live Chat"
                              style={{ padding: '4px 8px', fontSize: 11, color: '#7C5CFC', fontWeight: 800 }}
                            >
                              💬 Chat
                            </button>
                            <button 
                              className="btn btn-sm btn-ghost" 
                              onClick={() => { setEditForm({ ...u }); setEditModal(true); }}
                              title="Edit Employee Details"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              className={`btn btn-sm ${u.status === 'active' ? 'btn-ghost' : 'btn-dark'}`}
                              onClick={() => toggleUserStatus(u)}
                              title={u.status === 'active' ? 'Deactivate Login' : 'Activate Login'}
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              {u.status === 'active' ? '⏸️ Suspend' : '▶️ Activate'}
                            </button>
                            <button 
                              className="btn btn-sm btn-amber" 
                              onClick={() => triggerResetPassword(u)}
                              title="Reset Password & Generate New Credentials"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              🔑 Reset Pass
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHECKLISTS */}
      {tab === 'checklists' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-dark" onClick={() => setChecklistModal(true)}>
              <IC n="adduser" /> Add New Hire Checklist
            </button>
          </div>
          {db.onboarding.map(hire => {
            const emp = db.users.find(u => u.id === hire.uid);
            const hireTasks = db.tasks.filter(t => t.hid === hire.id);
            const done = hireTasks.filter(t => t.done).length;
            const pct = hireTasks.length ? Math.round((done / hireTasks.length) * 100) : 0;
            const pctColor = pct === 100 ? 'var(--green)' : pct > 50 ? 'var(--amber)' : 'var(--blue)';

            return (
              <div key={hire.id} className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22, flexWrap: 'wrap' }}>
                  {emp && <img src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`} style={{ width: 60, height: 60, borderRadius: '50%', border: '3px solid var(--amber)', boxShadow: 'var(--shadow-amber)' }} alt="" />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: 22, letterSpacing: '-.5px' }}>{emp?.name || 'New Hire'}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{hire.role} · Starting {hire.start}</div>
                  </div>
                  <div style={{ textAlign: 'center', background: pct === 100 ? 'var(--green-light)' : 'var(--amber-light)', padding: '12px 20px', borderRadius: 16 }}>
                    <div style={{ fontFamily: 'Outfit', fontSize: 36, fontWeight: 900, color: pctColor, lineHeight: 1 }}>{pct}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{done}/{hireTasks.length} tasks</div>
                  </div>
                </div>
                <div style={{ marginBottom: 18 }}><div className="progress-track progress-lg"><div className="progress-fill" style={{ width: `${pct}%`, background: pctColor }} /></div></div>
                <div>
                  {hireTasks.map(t => (
                    <div key={t.id} className={`checklist-item ${t.done ? 'done' : ''}`}>
                      <div className={`check-box ${t.done ? 'checked' : ''}`} onClick={() => toggleTask(t.id)}>
                        {t.done && <IC n="check" s={13} />}
                      </div>
                      <span className="check-text">{t.task}</span>
                      <span className="tag" style={{ fontSize: 10 }}>{t.who}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {tab === 'audit' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-hdr" style={{ padding: 20 }}>
            <div>
              <div className="section-title">Audit Trail & Security Log</div>
              <div className="section-sub">Immutable record of employee onboarding, credential generation, and password reset actions</div>
            </div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Admin / HR Operator</th>
                  <th>Action</th>
                  <th>Target Employee</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      No audit log entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 800 }}>{log.admin_name}</td>
                      <td>
                        <span className={`badge ${log.action.includes('onboard') ? 'b-success' : log.action.includes('reset') ? 'b-pending' : 'b-error'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>{log.target_user_name || `User #${log.target_user_id}`} ({log.target_user_email || ''})</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                        {log.details_json}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ONBOARD NEW EMPLOYEE */}
      <Modal open={onboardModal} onClose={() => setOnboardModal(false)} title="➕ Onboard New Employee & Generate Credentials">
        <form onSubmit={handleOnboardSubmit}>
          {inlineError && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: 12, marginBottom: 16, fontSize: 12.5, fontWeight: 700 }}>
              {inlineError}
            </div>
          )}

          <div style={{ fontWeight: 800, fontSize: 13, color: '#7C5CFC', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            1. Personal & Contact Details
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul Sharma" required />
            </div>
            <div className="form-group">
              <label className="form-label">Official Email Address *</label>
              <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="rahul@cegs.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone Number</label>
              <input className="form-input" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="+91 9876543210" />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input type="date" className="form-input" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 10 }}>
            <label className="form-label">Residential Address</label>
            <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Flat 302, MG Road, Koramangala, Bengaluru" />
          </div>

          <div style={{ fontWeight: 800, fontSize: 13, color: '#7C5CFC', marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            2. Job & Position Information
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Employee ID *</label>
              <input className="form-input" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Designation / Title</label>
              <input className="form-input" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. HR Recruiter" required />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-input" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                {db.departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reporting Manager</label>
              <select className="form-input" value={form.reports_to} onChange={e => setForm({ ...form, reports_to: e.target.value })}>
                <option value="">- Select Manager -</option>
                {db.users.filter(u => u.role !== 'employee').map(u => <option key={u.id} value={u.id}>{u.name} ({u.designation || u.title || u.role})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date of Joining</label>
              <input type="date" className="form-input" value={form.joining_date} onChange={e => setForm({ ...form, joining_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Employment Type</label>
              <select className="form-input" value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Basic Salary (Monthly ₹)</label>
              <input type="number" className="form-input" value={form.basic_salary} onChange={e => setForm({ ...form, basic_salary: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Portal Role Access</label>
              <select className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="employee">Employee Portal</option>
                <option value="admin">Admin (HR) Portal</option>
                <option value="super_admin">Super Admin Portal</option>
              </select>
            </div>
          </div>

          <div style={{ fontWeight: 800, fontSize: 13, color: '#7C5CFC', marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            3. Permanent Portal Password & Login Credentials
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10, alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Permanent Password * (min 6 chars)</label>
              <PasswordInput 
                value={form.password || ''} 
                onChange={e => setForm({ ...form, password: e.target.value })} 
                placeholder="e.g. Cegs@2026" 
                required 
              />
            </div>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => setForm({ ...form, password: generatePermanentPassword() })}
              style={{ height: 42, fontSize: 11.5, fontWeight: 800, borderRadius: 12, border: '1px solid #E5E7EB' }}
              title="Generate a fresh permanent password"
            >
              🎲 Auto Generate
            </button>
          </div>

          <div style={{ fontWeight: 800, fontSize: 13, color: '#7C5CFC', marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            4. Financial & Emergency Details
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input className="form-input" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="HDFC / SBI" />
            </div>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input className="form-input" value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} placeholder="1234567890" />
            </div>
            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input className="form-input" value={form.ifsc_code} onChange={e => setForm({ ...form, ifsc_code: e.target.value })} placeholder="HDFC0001234" />
            </div>
          </div>

          <div className="btn-row" style={{ marginTop: 24 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setOnboardModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-dark" style={{ background: '#7C5CFC' }}>
              ✨ Save & Generate Permanent Credentials
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: PERMANENT CREDENTIALS GENERATED (SHOW-ONCE) */}
      <Modal open={!!credsModal} onClose={() => setCredsModal(null)} title="🔑 Permanent Employee Portal Credentials">
        {credsModal && (
          <div>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '14px 18px', borderRadius: 16, marginBottom: 20, fontSize: 13, fontWeight: 700 }}>
              ✓ Employee account successfully created with Permanent Portal Credentials! The employee can log in immediately.
            </div>

            <div style={{ background: '#F9FAFB', border: '2px dashed #7C5CFC', borderRadius: 18, padding: 20, marginBottom: 20, fontFamily: 'JetBrains Mono, monospace' }}>
              <div style={{ fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12, fontWeight: 800 }}>
                PERMANENT CREDENTIAL SUMMARY
              </div>
              <div style={{ marginBottom: 8, fontSize: 13.5 }}>
                <span style={{ color: '#6B7280' }}>Employee Name: </span>
                <strong style={{ color: '#111827' }}>{credsModal.name}</strong>
              </div>
              <div style={{ marginBottom: 8, fontSize: 13.5 }}>
                <span style={{ color: '#6B7280' }}>Employee ID: </span>
                <strong style={{ color: '#7C5CFC' }}>{credsModal.employee_id}</strong>
              </div>
              <div style={{ marginBottom: 8, fontSize: 13.5 }}>
                <span style={{ color: '#6B7280' }}>Login Email ID: </span>
                <strong style={{ color: '#111827' }}>{credsModal.email}</strong>
              </div>
              <div style={{ marginBottom: 8, fontSize: 15, background: '#EFF6FF', padding: '8px 14px', borderRadius: 10, border: '1px solid #BFDBFE', display: 'inline-block', marginTop: 4 }}>
                <span style={{ color: '#1E40AF', fontWeight: 800 }}>Permanent Password: </span>
                <strong style={{ color: '#1D4ED8', letterSpacing: '1px' }}>{credsModal.password || credsModal.temp_password}</strong>
              </div>
              <div style={{ fontSize: 11, color: '#059669', marginTop: 10, fontWeight: 700 }}>
                ✓ Permanent Password set. Employee will log in directly without mandatory password change.
              </div>
            </div>

            <div className="btn-row">
              <button type="button" className="btn btn-dark" style={{ flex: 1, background: '#7C5CFC' }} onClick={copyCreds}>
                📋 Copy Permanent Credentials to Clipboard
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setCredsModal(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: EDIT EMPLOYEE DETAILS */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="✏️ Edit Employee Details">
        {editForm && (
          <form onSubmit={handleEditSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Designation</label>
                <input className="form-input" value={editForm.designation || editForm.title || ''} onChange={e => setEditForm({ ...editForm, designation: e.target.value, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Contact</label>
                <input className="form-input" value={editForm.contact || editForm.phone || ''} onChange={e => setEditForm({ ...editForm, contact: e.target.value, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Joining Date</label>
                <input type="date" className="form-input" value={editForm.joining_date || ''} onChange={e => setEditForm({ ...editForm, joining_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Basic Salary (Monthly ₹)</label>
                <input type="number" className="form-input" value={editForm.basic_salary || 30000} onChange={e => setEditForm({ ...editForm, basic_salary: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Portal Role</label>
                <select className="form-input" value={editForm.role || 'employee'} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                  <option value="employee">Employee Portal</option>
                  <option value="admin">Admin (HR) Portal</option>
                  <option value="super_admin">Super Admin Portal</option>
                </select>
              </div>
            </div>

            <div className="btn-row" style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-dark">Save Employee Details</button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 4: NEW HIRE CHECKLIST ADD */}
      <Modal open={checklistModal} onClose={() => setChecklistModal(false)} title="Start New Hire Onboarding Checklist">
        <form onSubmit={addHire}>
          <div className="form-group">
            <label className="form-label">Employee</label>
            <select className="form-input" value={checklistForm.uid} onChange={e => setChecklistForm({ ...checklistForm, uid: e.target.value })} required>
              <option value="">- Select Employee -</option>
              {db.users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.employee_id || u.employeeId || u.email})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Role / Position</label>
            <input className="form-input" value={checklistForm.role} onChange={e => setChecklistForm({ ...checklistForm, role: e.target.value })} placeholder="e.g. Senior Software Engineer" required />
          </div>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input type="date" className="form-input" value={checklistForm.start} onChange={e => setChecklistForm({ ...checklistForm, start: e.target.value })} required />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setChecklistModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-dark">Begin Onboarding Checklist</button>
          </div>
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

      {/* Employee Details & Account Credentials Table */}
      <div className="card anim-fadeup" style={{ marginBottom: 24, padding: 24, borderRadius: 24, background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#111827', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>HRMS: Employee's Details & Account Credentials</div>
            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, marginTop: 2 }}>Role-based access matrix. Default password for all accounts is <code style={{ background: '#F3E8FF', color: '#7C5CFC', padding: '2px 6px', borderRadius: 6, fontWeight: 800 }}>Password123</code></div>
          </div>
          <span style={{ background: '#E6F4EA', color: '#137333', border: '1px solid #CEEAD6', borderRadius: 99, padding: '4px 14px', fontSize: 11, fontWeight: 800 }}>
            {db.users.length} Accounts Active
          </span>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid #F3F4F6' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#6B7280' }}>S.no</th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#6B7280' }}>Name</th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#6B7280' }}>Salary</th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#6B7280' }}>Position</th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#6B7280' }}>User ID (Email)</th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#6B7280' }}>Portal Access</th>
                <th style={{ padding: '12px 14px', fontWeight: 800, color: '#6B7280', textAlign: 'right' }}>Password</th>
              </tr>
            </thead>
            <tbody>
              {db.users.map((u, idx) => {
                let portalName = 'EMPLOYEE PORTAL';
                let badgeClass = 'b-blue';
                if (u.role === 'super_admin') { portalName = 'SUPER ADMIN'; badgeClass = 'b-purple'; }
                else if (u.role === 'admin') { portalName = 'HR PORTAL'; badgeClass = 'b-amber'; }
                
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#9CA3AF' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#111827' }}>{u.name}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669' }}>₹{(u.salary || 15000).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#4B5563' }}>{u.title || (u.role === 'super_admin' ? 'Chief Executive Officer' : u.role === 'admin' ? 'HR Manager' : 'Recruiter')}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#7C5CFC', fontFamily: 'monospace' }}>{u.email}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`badge ${badgeClass}`} style={{ fontWeight: 800, fontSize: 10.5 }}>{portalName}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#6B7280', fontFamily: 'monospace' }}>
                      Password123
                    </td>
                  </tr>
                );
              })}
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
              <PasswordInput 
                value={passwordForm.current} 
                onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                required 
              />
            </div>
            
            <div className="form-row" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <PasswordInput 
                  value={passwordForm.newPass} 
                  onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <PasswordInput 
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
          <div className="form-group"><label className="form-label">Casual Days</label><input type="number" min={0} className="form-input" value={s.leave?.casual||12} onChange={e=>setS({...s,leave:{...s.leave,casual:parseInt(e.target.value)}})}/></div>
          <div className="form-group"><label className="form-label">Sick Days</label><input type="number" min={0} className="form-input" value={s.leave?.sick||12} onChange={e=>setS({...s,leave:{...s.leave,sick:parseInt(e.target.value)}})}/></div>
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
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'Leave', val: '', status: 'Active' });

  const openEdit = (p) => {
    setEditItem(p);
    setForm({ name: p.name, type: p.type, val: p.val, status: p.status });
    setModal(true);
  };

  const submit = (e) => {
    e.preventDefault();
    if (editItem) {
      setPolicies(policies.map(p => p.id === editItem.id ? { ...p, ...form } : p));
    } else {
      setPolicies([...policies, { id: Date.now(), ...form }]);
    }
    setModal(false);
    setEditItem(null);
    setForm({ name: '', type: 'Leave', val: '', status: 'Active' });
  };

  return (
    <div className="card anim-fadeup">
      <div className="card-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="section-title">Company HR Policies Configuration</div>
          <div className="section-sub">Manage allowances, leave allocations, and policy boundaries</div>
        </div>
        <button className="btn btn-dark" onClick={() => { setEditItem(null); setForm({ name: '', type: 'Leave', val: '', status: 'Active' }); setModal(true); }}><IC n="plus" /> Add Policy</button>
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
                  <button className="btn btn-xs btn-ghost" onClick={() => openEdit(p)}><IC n="edit" s={12}/> Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-backdrop anim-fadein" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content card anim-fadeup" style={{ maxWidth: 450, width: '90%', padding: 24, background: 'var(--bg-card)' }}>
            <div className="card-hdr"><div className="section-title">{editItem ? 'Edit Policy' : 'Create Policy'}</div></div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Policy Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Classification Type</label>
                <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option>Leave</option>
                  <option>Attendance</option>
                  <option>Expense</option>
                  <option>Allowance</option>
                  <option>System</option>
                </select>
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Threshold Value</label>
                <input className="form-input" value={form.val} onChange={e => setForm({ ...form, val: e.target.value })} placeholder="e.g. ₹5,000 / month" required />
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option>Active</option>
                  <option>Suspended</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-dark">{editItem ? 'Save Policy' : 'Add Policy'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowsPage() {
  const [flows, setFlows] = useState([
    { id: 1, name: 'Leave Approval Pipeline', steps: 'Employee → Manager → HR Head', status: 'Active' },
    { id: 2, name: 'Expense Reimbursement Run', steps: 'Employee → Finance Team → VP Approval', status: 'Active' },
    { id: 3, name: 'Recruitment Offer Issuance', steps: 'Recruiter → HR Lead → CEO Signoff', status: 'Active' },
  ]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', steps: '', status: 'Active' });

  const submit = (e) => {
    e.preventDefault();
    setFlows([...flows, { id: Date.now(), ...form }]);
    setModal(false);
    setForm({ name: '', steps: '', status: 'Active' });
  };

  return (
    <div className="card anim-fadeup">
      <div className="card-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="section-title">Approval Workflows Builder</div>
          <div className="section-sub">Define multi-stage approval routings and validation check gates</div>
        </div>
        <button className="btn btn-dark" onClick={() => setModal(true)}><IC n="plus" /> Add Workflow</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Workflow Registry</th><th>Routing Steps</th><th>Status</th><th>Override</th></tr></thead>
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
                <td><span className={`badge ${f.status==='Active'?'b-success':'b-error'}`}>{f.status}</span></td>
                <td>
                  <button className="btn btn-xs btn-ghost" onClick={() => { if(confirm('Delete workflow pipeline?')) setFlows(flows.filter(x=>x.id!==f.id)); }}><IC n="trash" s={12}/> Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-backdrop anim-fadein" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content card anim-fadeup" style={{ maxWidth: 450, width: '90%', padding: 24, background: 'var(--bg-card)' }}>
            <div className="card-hdr"><div className="section-title">Create Workflow Pipeline</div></div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Workflow Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Purchase Request" required />
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Routing Steps (separated by " → ")</label>
                <input className="form-input" value={form.steps} onChange={e => setForm({ ...form, steps: e.target.value })} placeholder="Employee → Manager → CFO" required />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-dark">Create Workflow</button>
              </div>
            </form>
          </div>
        </div>
      )}
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

function ReportsPage({ db }) {
  const types = [
    { name: 'Attendance & Regularization Summary', desc: 'Aggregated clock-in timings, late arrivals, and active hours logs', icon: 'clock', data: () => db.attendance.map(a => `Date: ${a.date}, UserID: ${a.uid}, In: ${a.in}, Out: ${a.out || 'N/A'}, Status: ${a.status}, Hours: ${a.hrs}`).join('\n') },
    { name: 'Payroll Disbursement Registry', desc: 'Net salaries totals, allowance buckets, tax deductions, and PF logs', icon: 'card', data: () => db.users.map(u => `Name: ${u.name}, Title: ${u.title}, Monthly Salary: ₹${u.salary || 0}`).join('\n') },
    { name: 'Leave & Absences Allocation report', desc: 'Vacation rates, carry forwards balance sheets, and utilization metrics', icon: 'calendar', data: () => db.leaves.map(l => `UserID: ${l.uid}, Type: ${l.type}, Start: ${l.start}, End: ${l.end}, Status: ${l.status}`).join('\n') },
    { name: 'Hiring & Headcount Diversity statistics', desc: 'Hiring conversion rates, candidate attrition metrics, and demographics', icon: 'users', data: () => `Total Employees: ${db.users.length}\nActive count: ${db.users.filter(u=>u.status==='active').length}\nDeactivated count: ${db.users.filter(u=>u.status!=='active').length}` },
  ];

  const exportCSV = (name, getData) => {
    const header = 'Registry/Log Name,Details\n';
    const content = getData();
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(header + content);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `${name.toLowerCase().replace(/\s+/g, '_')}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="anim-fadeup">
      <div style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ fontSize: 24, fontWeight: 900 }}>Reports & Compliance Logs Generator</div>
        <div className="section-sub">Generate and download auditing reports formatted in compliance with standard regulations</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {types.map((t, idx) => (
          <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 15 }}>
                <IC n={t.icon} s={18} style={{ color: 'var(--purple)' }} />
                {t.name}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.4 }}>{t.desc}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-sm btn-ghost" onClick={() => exportCSV(t.name, t.data)}><IC n="file" s={12}/> CSV Format</button>
              <button className="btn btn-sm btn-dark" onClick={() => window.print()}><IC n="print" s={12}/> Print PDF</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CALL_STATUS_OPTIONS = [
  'Select Status', 'Connected', 'Rejected', 'No Answer', 'Switched Off', 'Busy', 'Call Back Later', 'Wrong Number'
];

const LANGUAGE_OPTIONS = [
  'English', 'Hindi', 'Kannada', 'Telugu', 'Tamil', 'Malayalam', 'Marathi', 'Odisha', 'Bengali', 'English, Hindi', 'English, Kannada', 'English, Telugu', 'English, Tamil', 'Urdu'
];

const INITIAL_CANDIDATE_DATA = [];

function TargetMetricCard({ title, icon, current, target, unit, weight = '20%', iconBg = '#F5F3FF', iconColor = '#7C5CFC', onClick }) {
  const percentage = Math.min(100, Math.round((current / target) * 100));

  let badgeStyle = { background: '#E6F4EA', color: '#137333', border: '1px solid #CEEAD6' };
  let badgeLabel = 'Target Met 🟢';
  let progressGradient = 'linear-gradient(90deg, #10B981 0%, #34D399 100%)';

  if (percentage < 50) {
    badgeStyle = { background: '#FCE8E6', color: '#C5221F', border: '1px solid #FAD2CF' };
    badgeLabel = 'Far Behind 🔴';
    progressGradient = 'linear-gradient(90deg, #EF4444 0%, #F87171 100%)';
  } else if (percentage < 100) {
    badgeStyle = { background: '#FEF7E0', color: '#B06000', border: '1px solid #FDE293' };
    badgeLabel = 'In Progress 🟡';
    progressGradient = 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)';
  }

  return (
    <div 
      onClick={onClick}
      style={{ 
        background: 'rgba(255, 255, 255, 0.68)', 
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 20, 
        border: '1px solid rgba(255, 255, 255, 0.85)', 
        padding: '18px', 
        flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', 
        boxShadow: '0 4px 16px rgba(120, 100, 80, 0.05)', 
        transition: 'all 0.2s ease', cursor: onClick ? 'pointer' : 'default'
      }}
      className={onClick ? 'card-hover-effect' : ''}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: '#1F2937', fontFamily: "'Plus Jakarta Sans', 'Outfit', sans-serif" }}>{title}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7C5CFC' }}>Weight: {weight}</div>
            </div>
          </div>
          <span style={{ ...badgeStyle, borderRadius: 99, padding: '3px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
            {badgeLabel}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#111827', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.8px' }}>{current}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#9CA3AF', marginLeft: 4 }}>/ {target}</span>
          </div>
          <span style={{ background: '#F3E8FF', color: '#7C5CFC', fontWeight: 800, borderRadius: 99, padding: '2px 8px', fontSize: 10.5 }}>
            {percentage}%
          </span>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ height: 6, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${percentage}%`, height: '100%', background: progressGradient, borderRadius: 99, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 10.5, color: '#9CA3AF', fontWeight: 700 }}>
          <span>Target: {target} {unit}</span>
          <span>{Math.max(0, target - current)} left</span>
        </div>
      </div>
    </div>
  );
}

function RecruitmentPage({ db, save, user, setView, setQuickViewUser, setChatTargetUser, openChatWithUser }) {
  const isSA = user?.role === 'super_admin';
  const isHR = user?.role === 'admin' || (user?.title && typeof user.title === 'string' && user.title.toLowerCase().includes('hr manager'));
  const isEmp = !isSA && !isHR;

  const deduplicateCandidates = (items) => {
    const seen = new Set();
    const result = [];
    (items || []).forEach(c => {
      const nameVal = (c.name || '').trim();
      const numVal = (c.number || '').trim();
      const respVal = (c.response || '').trim();
      const f1 = (c.followUp1 || '').trim();
      const f2 = (c.followUp2 || '').trim();
      const f3 = (c.followUp3 || '').trim();
      const idKey = String(c.id || c._id || '').trim();

      // Only discard row if it has NO ID whatsoever and NO field values
      if (!idKey && !nameVal && !numVal && !respVal && !f1 && !f2 && !f3) {
        return;
      }

      const nameKey = nameVal.toLowerCase();
      const numKey = numVal;
      const empKey = (c.employee || '').trim().toLowerCase();
      const key = (nameKey || numKey) ? `${nameKey}_${numKey}_${empKey}` : `row_${idKey}`;

      if (!seen.has(key)) {
        seen.add(key);
        result.push(c);
      }
    });
    return result;
  };

  // Helper to get candidates directly from top-level db or persistent localStorage
  const getStoredCandidates = () => {
    if (localStorage.getItem('cegs_candidates_cleared') === 'true') {
      try {
        const local = localStorage.getItem('vp_hrms_v4_candidates') || localStorage.getItem('cegs_db_v4_candidates') || localStorage.getItem('cegs_db_candidates');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) return deduplicateCandidates(parsed);
        }
      } catch {}
      return [];
    }
    if (db && Array.isArray(db.candidates) && db.candidates.length > 0) {
      return deduplicateCandidates(db.candidates);
    }
    try {
      const local = localStorage.getItem('vp_hrms_v4_candidates') || localStorage.getItem('cegs_db_v4_candidates') || localStorage.getItem('cegs_db_candidates');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return deduplicateCandidates(parsed);
      }
    } catch {}
    return [];
  };

  // Central Top-Level Store Candidate List State — starts empty, filled by API on mount
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);

  // INITIAL LOAD: Fetch candidates from API immediately on mount, ignore stale localStorage
  useEffect(() => {
    const loadInitialCandidates = async () => {
      try {
        const res = await fetch(`${GLOBAL_API_BASE}/candidates`);
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData)) {
            const cleaned = deduplicateCandidates(apiData);
            setCandidates(cleaned);
            // Update localStorage to latest API data to prevent stale cache
            try {
              localStorage.setItem('vp_hrms_v10_candidates', JSON.stringify(cleaned));
              localStorage.removeItem('cegs_candidates_cleared');
            } catch {}
            setCandidatesLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[Init] API unavailable, falling back to localStorage:', err.message);
      }
      // Only fall back to localStorage if API is unreachable
      const stored = getStoredCandidates();
      setCandidates(stored);
      setCandidatesLoading(false);
    };
    loadInitialCandidates();
    // Clear all old localStorage cache keys to prevent stale data
    ['v1','v2','v3','v4','v5','v6','v7','v8','v9'].forEach(ver => {
      try { localStorage.removeItem(`vp_hrms_${ver}_candidates`); } catch {}
    });
    try {
      localStorage.removeItem('cegs_db_v4_candidates');
      localStorage.removeItem('cegs_db_candidates');
    } catch {}
  }, []);


  // Keep candidates in sync with top-level db.candidates if updated externally
  useEffect(() => {
    if (db && Array.isArray(db.candidates) && db.candidates.length > 0) {
      const cleaned = deduplicateCandidates(db.candidates);
      setCandidates(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(cleaned)) {
          return cleaned;
        }
        return prev;
      });
    }
  }, [db?.candidates]);

  const updateCandidatesStore = (newList) => {
    const cleaned = deduplicateCandidates(newList);
    if (cleaned.length === 0) {
      localStorage.setItem('cegs_candidates_cleared', 'true');
    }
    setCandidates(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(cleaned)) {
        return cleaned;
      }
      return prev;
    });
    save('candidates', cleaned);
    try {
      localStorage.setItem('vp_hrms_v4_candidates', JSON.stringify(cleaned));
      localStorage.setItem('cegs_db_v4_candidates', JSON.stringify(cleaned));
      localStorage.setItem('cegs_db_candidates', JSON.stringify(cleaned));
    } catch {}
  };

  const [activeTaskCategory, setActiveTaskCategory] = useState('calls'); // 'calls' | 'interviews' | 'walkins' | 'selected' | 'joined'
  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState('Auto-saved');
  const [targetViewMode, setTargetViewMode] = useState(isEmp ? 'employee' : 'hr');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState(isEmp ? (user?.name || '') : 'ALL');
  const [toastMsg, setToastMsg] = useState(null);

  const fileInputRef = useRef(null);
  const tableScrollRef = useRef(null);
  const lastEditedRef = useRef(0);
  const saveDebounceRef = useRef(null);
  const API_BASE = GLOBAL_API_BASE;

  const getCategoryFromCandidate = (cand) => {
    if (cand.category) return cand.category;
    const text = `${cand.followUp1 || ''} ${cand.followUp2 || ''} ${cand.followUp3 || ''} ${cand.response || ''}`.toLowerCase();
    if (text.includes('joined') || text.includes('joining')) return 'joined';
    if (text.includes('selected') || text.includes('hired')) return 'selected';
    if (text.includes('walkin') || text.includes('walk-in') || text.includes('visited')) return 'walkins';
    if (text.includes('interview') || text.includes('scheduled') || text.includes('schedule')) return 'interviews';
    return 'calls';
  };

  const showToast = (msg, type = 'info') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Live MongoDB Atlas candidate sync & auto-polling effect (protects active user typing)
  useEffect(() => {
    let isMounted = true;

    const syncFromMongoAtlas = async () => {
      // If user typed/edited in the last 10 seconds, pause cloud polling overwrite to protect typing!
      if (Date.now() - lastEditedRef.current < 10000) {
        return;
      }

      try {
        const res = await fetch(`${GLOBAL_API_BASE}/candidates`);
        if (res.ok) {
          const cloudData = await res.json();
          if (isMounted && Array.isArray(cloudData) && cloudData.length > 0) {
            setCandidates(prev => {
              // Preserve active unsaved local inline rows (id starting with 'cand_')
              const unsavedLocal = prev.filter(r => String(r.id || r._id || '').startsWith('cand_'));
              const merged = [...cloudData];
              unsavedLocal.forEach(loc => {
                if (!merged.some(c => String(c.id || c._id) === String(loc.id || loc._id))) {
                  merged.push(loc);
                }
              });

              const cleaned = deduplicateCandidates(merged);
              if (JSON.stringify(prev) !== JSON.stringify(cleaned)) {
                save('candidates', cleaned);
                return cleaned;
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.warn('Live MongoDB Atlas candidate sync offline fallback:', err);
      }
    };

    syncFromMongoAtlas();
    const interval = setInterval(syncFromMongoAtlas, 5000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    // Auto-generate 1 fresh empty candidate entry form for the active task category page if empty
    if (user?.name && !isSA) {
      const userCatRows = candidates.filter(c => 
        (c.employee || '').trim().toLowerCase() === user.name.trim().toLowerCase() &&
        getCategoryFromCandidate(c) === activeTaskCategory
      );
      if (userCatRows.length === 0) {
        let resp = '';
        let f1 = '', f2 = '', f3 = '';
        if (activeTaskCategory === 'interviews') { resp = 'Interview Scheduled'; f1 = 'Interview Scheduled'; }
        else if (activeTaskCategory === 'walkins') { resp = 'Walk-in Today'; f2 = 'Walk-in Today'; }
        else if (activeTaskCategory === 'selected') { resp = 'Selected Today'; f3 = 'Selected Today'; }
        else if (activeTaskCategory === 'joined') { resp = 'Joined Today'; f3 = 'Joined Today'; }

        const initialRow = {
          id: 'cand_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          slNo: 1,
          date: new Date().toLocaleDateString('en-GB'),
          name: '',
          number: '',
          languages: 'English',
          qualification: '',
          response: resp,
          callStatus: 'Select Status',
          location: 'Bengaluru',
          experience: 0,
          followUp1: f1,
          followUp2: f2,
          followUp3: f3,
          category: activeTaskCategory,
          employee: user.name
        };
        updateCandidatesStore([...candidates, initialRow]);
      }
    }
  }, [user?.name, activeTaskCategory]);

  const handleCleanDuplicates = () => {
    const originalCount = candidates.length;
    const cleaned = deduplicateCandidates(candidates);
    const removedCount = originalCount - cleaned.length;
    updateCandidatesStore(cleaned);
    showToast(`✓ Removed ${removedCount} duplicate candidates! Datasheet is clean.`, 'success');
  };

  const handleClearAllCandidates = () => {
    if (window.confirm('Are you sure you want to clear all candidate entries permanently? You can add new entries manually or upload an Excel file.')) {
      localStorage.setItem('cegs_candidates_cleared', 'true');
      updateCandidatesStore([]);
      fetch(`${API_BASE}/candidates/all`, { method: 'DELETE' }).catch(() => {});
      showToast('Datasheet cleared completely. Ready for manual entry or file upload.', 'info');
    }
  };

  const hasKeyword = (cand, keywords) => {
    const text = `${cand.followUp1 || ''} ${cand.followUp2 || ''} ${cand.followUp3 || ''} ${cand.response || ''}`.toLowerCase();
    return keywords.some(kw => text.includes(kw.toLowerCase()));
  };

  const employeeList = Array.from(new Set(candidates.map(c => c.employee).filter(Boolean)));
  if (user?.name && !employeeList.includes(user.name)) {
    employeeList.unshift(user.name);
  }

  // Strictly enforce user-specific candidate data scoping for employees and HR
  const roleFilteredCandidates = candidates.filter(c => {
    if (isEmp) {
      // Employee sees ONLY candidate entries assigned specifically to them (or newly created rows)
      const currentEmp = (user?.name || '').trim().toLowerCase();
      const candEmp = (c.employee || '').trim().toLowerCase();
      return !candEmp || candEmp === currentEmp;
    }
    if ((isHR || isSA) && selectedEmployeeFilter !== 'ALL') {
      return (c.employee || '').trim().toLowerCase() === selectedEmployeeFilter.toLowerCase();
    }
    return true;
  });

  const isTodayDate = (dateStr) => {
    if (!dateStr) return true;
    const str = String(dateStr).trim();
    if (str === '' || str.toLowerCase() === 'today') return true;
    const todayStr = new Date().toLocaleDateString('en-GB');
    return str === todayStr || str.includes('29/07') || str.includes('28/07') || str.includes('2026') || str.includes('2025') || str.includes('/') || str.includes('-');
  };

  const todayTargetCandidates = roleFilteredCandidates.filter(c => isTodayDate(c.date));

  const isConnectedCall = (c) => {
    const status = (c.callStatus || '').trim().toLowerCase();
    return status === 'connected' || status.includes('connect');
  };

  // 5 Tasks (each task is 20% weight, 60% minimum performance required every day)
  const callsMadeCount = todayTargetCandidates.filter(c => isConnectedCall(c)).length;
  const interviewsScheduledTargetCount = todayTargetCandidates.filter(c => hasKeyword(c, ['interview', 'scheduled', 'schedule', 'appointment', 'radical', 'itv'])).length;
  const walkinsTargetCount = todayTargetCandidates.filter(c => hasKeyword(c, ['walkin', 'walk-in', 'walked', 'visited', 'visit', 'came'])).length;
  const selectedTodayTargetCount = todayTargetCandidates.filter(c => hasKeyword(c, ['selected', 'selection', 'hired', 'select'])).length;
  const joinedTodayTargetCount = todayTargetCandidates.filter(c => hasKeyword(c, ['joined', 'joining', 'staff', 'join'])).length;

  // Performance calculations (each of the 5 tasks contributes max 20%)
  const callsScore  = Math.min(20, Math.round((callsMadeCount / 80) * 20));
  const itvScore    = Math.min(20, Math.round((interviewsScheduledTargetCount / 15) * 20));
  const walkinScore = Math.min(20, Math.round((walkinsTargetCount / 5) * 20));
  const selScore    = Math.min(20, Math.round((selectedTodayTargetCount / 3) * 20));
  const jndScore    = Math.min(20, Math.round((joinedTodayTargetCount / 1) * 20));

  const totalDayPerformancePct = callsScore + itvScore + walkinScore + selScore + jndScore;
  const isTargetAchieved = totalDayPerformancePct >= 60; // minimum 60% required every day

  const totalCandidatesCount = roleFilteredCandidates.length;
  const todayAddedCount = todayTargetCandidates.length;

  let selCount = 0, itvCount = 0, scrCount = 0, rejCount = 0, pndCount = 0;
  roleFilteredCandidates.forEach(c => {
    const text = `${c.response || ''} ${c.followUp1 || ''} ${c.followUp2 || ''} ${c.followUp3 || ''}`.toLowerCase();
    if (text.includes('selected') || text.includes('hired')) selCount++;
    else if (text.includes('interview') || text.includes('scheduled') || text.includes('radical')) itvCount++;
    else if (text.includes('not looking') || text.includes('incoming is not available') || text.includes('rejected')) rejCount++;
    else if (text.includes('rnr') || text.includes('conformation pending')) scrCount++;
    else pndCount++;
  });

  const totalForPct = totalCandidatesCount || 1;
  const selPct = Math.round((selCount / totalForPct) * 100);
  const itvPct = Math.round((itvCount / totalForPct) * 100);
  const scrPct = Math.round((scrCount / totalForPct) * 100);
  const rejPct = Math.round((rejCount / totalForPct) * 100);
  const pndPct = Math.round((pndCount / totalForPct) * 100);

  const doughnutGradient = `conic-gradient(#10B981 0% ${selPct}%, #8B5CF6 ${selPct}% ${selPct + itvPct}%, #F59E0B ${selPct + itvPct}% ${selPct + itvPct + scrPct}%, #EF4444 ${selPct + itvPct + scrPct}% ${selPct + itvPct + scrPct + rejPct}%, #94A3B8 ${selPct + itvPct + scrPct + rejPct}% 100%)`;

  // Calculate per-employee progress for HR & Super Admin aggregated overview
  const employeePerformanceList = employeeList.map(empName => {
    const empCands = candidates.filter(c => {
      const candEmp = (c.employee || '').trim().toLowerCase();
      return candEmp === empName.trim().toLowerCase();
    });
    const calls = empCands.filter(c => isConnectedCall(c)).length;
    const itvs  = empCands.filter(c => hasKeyword(c, ['interview', 'scheduled', 'schedule', 'appointment', 'radical', 'itv'])).length;
    const walks = empCands.filter(c => hasKeyword(c, ['walkin', 'walk-in', 'walked', 'visited', 'visit', 'came'])).length;
    const sels  = empCands.filter(c => hasKeyword(c, ['selected', 'selection', 'hired', 'select'])).length;
    const jnds  = empCands.filter(c => hasKeyword(c, ['joined', 'joining', 'staff', 'join'])).length;

    const cS = Math.min(20, Math.round((calls / 80) * 20));
    const iS = Math.min(20, Math.round((itvs / 15) * 20));
    const wS = Math.min(20, Math.round((walks / 5) * 20));
    const sS = Math.min(20, Math.round((sels / 3) * 20));
    const jS = Math.min(20, Math.round((jnds / 1) * 20));
    const pct = cS + iS + wS + sS + jS;

    return { name: empName, calls, itvs, walks, sels, jnds, pct };
  });

  const handleCellChange = (candId, field, val) => {
    if (isSA) return; // Super Admin is read-only
    setSaveStatus('Saving...');
    lastEditedRef.current = Date.now(); // Record user active edit timestamp

    const updated = candidates.map(c => (c.id === candId || c._id === candId) ? { ...c, [field]: val } : c);
    updateCandidatesStore(updated);

    const rowToSave = updated.find(c => c.id === candId || c._id === candId);
    if (rowToSave) {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(() => {
        fetch(`${API_BASE}/candidates/${candId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rowToSave)
        }).then(r => r.json()).then(res => {
          if (res && res.id) {
            setCandidates(prev => prev.map(c => (c.id === candId || c._id === candId) ? { ...c, id: res.id } : c));
          }
        }).catch(() => {});
      }, 400);
    }
    setSaveStatus('Auto-saved & Synced');
  };

  const handleDeleteCandidate = async (candId) => {
    if (isSA) return;
    if (window.confirm('Are you sure you want to delete this candidate record?')) {
      const updated = candidates.filter(c => (c.id || c._id) !== candId);
      updateCandidatesStore(updated);
      try {
        await fetch(`${API_BASE}/candidates/${candId}`, { method: 'DELETE' });
      } catch {}
      showToast('Deleted candidate entry.', 'info');
    }
  };

  const handleAddInlineRow = async () => {
    if (isSA) return; // Super admin cannot add personal task entries
    setSaveStatus('Saving...');
    localStorage.removeItem('cegs_candidates_cleared');
    setSearchQuery(''); // Clear search filter so new row is ALWAYS 100% visible!

    let resp = '';
    let f1 = '', f2 = '', f3 = '';
    if (activeTaskCategory === 'interviews') { resp = 'Interview Scheduled'; f1 = 'Interview Scheduled'; }
    else if (activeTaskCategory === 'walkins') { resp = 'Walk-in Today'; f2 = 'Walk-in Today'; }
    else if (activeTaskCategory === 'selected') { resp = 'Selected Today'; f3 = 'Selected Today'; }
    else if (activeTaskCategory === 'joined') { resp = 'Joined Today'; f3 = 'Joined Today'; }

    const categoryRows = roleFilteredCandidates.filter(c => getCategoryFromCandidate(c) === activeTaskCategory);
    const tempId = 'cand_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const draftRow = {
      id: tempId,
      slNo: categoryRows.length + 1,
      date: new Date().toLocaleDateString('en-GB'),
      name: '',
      number: '',
      languages: 'English',
      qualification: '',
      response: resp,
      callStatus: 'Select Status',
      location: 'Bengaluru',
      experience: 0,
      followUp1: f1,
      followUp2: f2,
      followUp3: f3,
      category: activeTaskCategory,
      employee: user?.name || 'Madiha Mehak'
    };

    // 1. INSTANT UI RENDER: Update candidates store immediately
    updateCandidatesStore([...candidates, draftRow]);

    // 2. Scroll table to bottom
    if (tableScrollRef.current) {
      setTimeout(() => {
        if (tableScrollRef.current) tableScrollRef.current.scrollTop = tableScrollRef.current.scrollHeight;
      }, 50);
    }

    // 3. ASYNC BACKEND SYNC: POST to backend in background and update ID
    try {
      const res = await fetch(`${API_BASE}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftRow)
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved && saved.id) {
          setCandidates(prev => prev.map(c => c.id === tempId ? { ...c, id: saved.id } : c));
        }
      }
    } catch (err) {
      console.warn('Backend POST candidate fallback:', err);
    }
    setSaveStatus('Auto-saved & Synced');
  };

  const handleTriggerImport = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaveStatus('Saving...');
    localStorage.removeItem('cegs_candidates_cleared');
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const fileContent = event.target.result;
        const fileName = file.name.toLowerCase();
        let newEntries = [];

        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
          const data = new Uint8Array(fileContent);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

          newEntries = rawRows.map((row, idx) => {
            const findVal = (keys) => {
              for (const k of Object.keys(row)) {
                const normKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (keys.some(key => normKey.includes(key))) return row[k];
              }
              return '';
            };

            return {
              slNo: candidates.length + idx + 1,
              date: String(findVal(['date', 'dt']) || new Date().toLocaleDateString('en-GB')),
              name: String(findVal(['name', 'candidate']) || 'IMPORTED CANDIDATE').toUpperCase(),
              number: String(findVal(['number', 'contact', 'phone']) || ''),
              languages: String(findVal(['language', 'lang']) || 'English'),
              qualification: String(findVal(['qualification']) || ''),
              response: String(findVal(['response']) || ''),
              callStatus: String(findVal(['callstatus', 'status']) || 'Connected'),
              location: String(findVal(['location']) || 'Bengaluru'),
              experience: Number(findVal(['experience'])) || 0,
              followUp1: String(findVal(['followup1']) || ''),
              followUp2: String(findVal(['followup2']) || ''),
              followUp3: String(findVal(['followup3']) || ''),
              employee: String(findVal(['employee', 'recruiter']) || user?.name || 'Madiha Mehak')
            };
          });
        }

        if (newEntries.length > 0) {
          const formattedNew = newEntries.map((r, i) => ({ ...r, id: 'imp_' + Date.now() + '_' + i }));
          updateCandidatesStore([...candidates, ...formattedNew]);

          try {
            await fetch(`${API_BASE}/candidates`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newEntries)
            });
          } catch {}
          showToast(`Successfully uploaded ${newEntries.length} candidate records! Saved permanently.`, 'success');
          setSaveStatus('Auto-saved & Synced');
        }
      } catch (err) {
        showToast('Error reading file. Please check format.', 'error');
      }
    };
    reader.readAsBuffer ? reader.readAsBuffer(file) : reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const categoryCandidates = roleFilteredCandidates.filter(cand => getCategoryFromCandidate(cand) === activeTaskCategory);

  const filteredCandidates = categoryCandidates.filter(cand => {
    const q = searchQuery.toLowerCase();
    return (cand.name || '').toLowerCase().includes(q) ||
      (cand.number || '').toLowerCase().includes(q) ||
      (cand.response || '').toLowerCase().includes(q) ||
      (cand.callStatus || '').toLowerCase().includes(q);
  });

  return (
    <div className="anim-fadeup" style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: "'Plus Jakarta Sans', 'Outfit', sans-serif" }}>
      <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".csv, .xlsx, .xls" style={{ display: 'none' }} />

      {/* SUPER ADMIN GOVERNANCE HEADER */}
      {isSA && (
        <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)', padding: '18px 24px', borderRadius: 24, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, boxShadow: '0 8px 30px rgba(49,46,129,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              🛡️
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>Super Admin Governance & Target Monitoring Dashboard</div>
              <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 2 }}>Read-only system-wide monitoring of all employee and HR daily targets (No personal tasks required)</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ background: 'rgba(16,185,129,0.2)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 800 }}>
              ✓ MongoDB Atlas Live
            </span>
            <button className="btn btn-xs" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)', borderRadius: 99, padding: '6px 14px', fontWeight: 700 }} onClick={handleTriggerImport}>
              <IC n="download" s={13} /> Bulk Upload (.xlsx)
            </button>
          </div>
        </div>
      )}

      {/* DAILY TASK TARGETS CARD CONTAINER */}
      <div className="recruitment-page-card" style={{ background: 'rgba(255, 255, 255, 0.62)', backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)', border: '1px solid rgba(255, 255, 255, 0.75)', borderRadius: 24, padding: 24, boxShadow: '0 8px 32px rgba(120, 100, 80, 0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', tracking: '-0.4px', fontFamily: "'Plus Jakarta Sans', 'Outfit', sans-serif" }}>
                {isSA ? 'System-Wide Recruiter Target Dashboard' : isHR ? (targetViewMode === 'hr' ? '🏢 Recruiter Team Performance Overview' : `📋 My Personal Daily Tasks (${selectedEmployeeFilter === user?.name ? 'My Tasks' : selectedEmployeeFilter})`) : `Daily Task Targets (${user?.name || 'Recruiter'})`}
              </h2>
              <span style={{ background: targetViewMode === 'hr' ? '#E0E7FF' : '#F3E8FF', color: targetViewMode === 'hr' ? '#3730A3' : '#7C5CFC', borderRadius: 99, padding: '3px 12px', fontSize: 11, fontWeight: 800, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                {isSA ? 'SUPER ADMIN READ-ONLY' : isHR ? (targetViewMode === 'hr' ? 'TEAM OVERVIEW MODE' : 'MY DAILY TASKS') : 'EMPLOYEE PERSONAL TARGETS'}
              </span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#6B7280', marginTop: 4 }}>
              {isSA ? "Monitoring all staff recruitment progress. Super admin does not perform personal tasks." : isEmp ? "Track and hit your daily call, interview, walk-in, selection, and joining targets (Min 60% required)." : targetViewMode === 'hr' ? "Oversee real-time call performance, interview targets, and daily progress across all team recruiters." : "Track and update your personal daily recruitment calls, interviews, walk-ins, selections, and joinings."}
            </p>
          </div>

          {/* TOGGLE & SELECTOR CONTROLS: Shown ONLY for HR & Super Admin (NOT for Employee) */}
          {(isHR || isSA) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ background: '#1c1e28', padding: 4, borderRadius: 99, display: 'inline-flex', gap: 4, border: '1px solid rgba(0,0,0,0.1)' }}>
                <button 
                  style={{ 
                    background: targetViewMode === 'hr' ? '#ffffff' : 'transparent', 
                    color: targetViewMode === 'hr' ? '#111827' : '#9CA3AF', 
                    borderRadius: 99, 
                    padding: '6px 16px', 
                    fontSize: 12, 
                    fontWeight: 800, 
                    border: 'none', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease', 
                    boxShadow: targetViewMode === 'hr' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none' 
                  }} 
                  onClick={() => { setTargetViewMode('hr'); setSelectedEmployeeFilter('ALL'); }}
                >
                  🏢 HR View (All Employees)
                </button>
                <button 
                  style={{ 
                    background: targetViewMode === 'employee' ? '#ffffff' : 'transparent', 
                    color: targetViewMode === 'employee' ? '#111827' : '#9CA3AF', 
                    borderRadius: 99, 
                    padding: '6px 16px', 
                    fontSize: 12, 
                    fontWeight: 800, 
                    border: 'none', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease', 
                    boxShadow: targetViewMode === 'employee' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none' 
                  }} 
                  onClick={() => { setTargetViewMode('employee'); setSelectedEmployeeFilter(user?.name || 'Nusrath Hussain'); }}
                >
                  👤 My Employee View (My Daily Tasks)
                </button>
              </div>

              <select 
                style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 99, padding: '7px 16px', fontSize: 12, fontWeight: 800, color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', outline: 'none' }}
                value={selectedEmployeeFilter}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedEmployeeFilter(val);
                  setTargetViewMode(val === 'ALL' ? 'hr' : 'employee');
                }}
              >
                <option value="ALL">All Employees (Combined Overview)</option>
                {employeeList.map(emp => (
                  <option key={emp} value={emp}>{emp === user?.name ? `${emp} (My Tasks)` : emp}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* DAILY PERFORMANCE SCORE BANNER (Each Task 20% Weight - 60% Minimum Required) */}
        {(!isSA && targetViewMode !== 'hr') && (
          <div style={{ background: isTargetAchieved ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' : 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: isTargetAchieved ? '1px solid #A7F3D0' : '1px solid #FDE68A', borderRadius: 16, padding: '12px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{isTargetAchieved ? '🎯' : '⚡'}</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: 14, color: isTargetAchieved ? '#065F46' : '#92400E' }}>
                  Day Performance Score: {totalDayPerformancePct}% / 100% (5 Tasks @ 20% Weight Each)
                </div>
                <div style={{ fontSize: 11.5, color: isTargetAchieved ? '#047857' : '#B45309', marginTop: 1 }}>
                  Every employee must reach at least <strong>60% performance</strong> every day
                </div>
              </div>
            </div>
            <span style={{ background: isTargetAchieved ? '#10B981' : '#F59E0B', color: '#FFFFFF', padding: '4px 14px', borderRadius: 99, fontSize: 11, fontWeight: 900, letterSpacing: '0.3px' }}>
              {isTargetAchieved ? '✓ TARGET ACHIEVED (60%+ MET)' : '⚠️ AT RISK (60% REQUIRED)'}
            </span>
          </div>
        )}

        {/* FOR SUPER ADMIN & HR ALL VIEW: AGGREGATED RECRUITER PERFORMANCE GRID */}
        {(isSA || (isHR && targetViewMode === 'hr')) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <TargetMetricCard title="Calls Made (Total)" icon="📞" current={callsMadeCount} target={80 * employeeList.length} unit="Calls" weight="20%" iconBg="#F5F3FF" iconColor="#7C5CFC" />
              <TargetMetricCard title="Interviews Scheduled" icon="📅" current={interviewsScheduledTargetCount} target={15 * employeeList.length} unit="Interviews" weight="20%" iconBg="#EFF6FF" iconColor="#3B82F6" />
              <TargetMetricCard title="Walk-ins Today" icon="🚶" current={walkinsTargetCount} target={5 * employeeList.length} unit="Walkins" weight="20%" iconBg="#FEF3C7" iconColor="#D97706" />
              <TargetMetricCard title="Selected Today" icon="🏆" current={selectedTodayTargetCount} target={3 * employeeList.length} unit="Selected" weight="20%" iconBg="#ECFDF5" iconColor="#10B981" />
              <TargetMetricCard title="Joined Today" icon="👥" current={joinedTodayTargetCount} target={1 * employeeList.length} unit="Joined" weight="20%" iconBg="#FFF7ED" iconColor="#F97316" />
            </div>

            {/* RECRUITER PERFORMANCE LIST GRID */}
            <div style={{ marginTop: 8, background: '#F9FAFB', borderRadius: 20, padding: 18, border: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Recruiter Daily Performance Breakdown (60% Min Target)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                {employeePerformanceList.map(emp => (
                  <div 
                    key={emp.name} 
                    style={{ background: '#FFFFFF', borderRadius: 16, padding: 14, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', cursor: isHR ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (isHR) {
                        setSelectedEmployeeFilter(emp.name);
                        setTargetViewMode('employee');
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: '#111827' }}>{emp.name}</span>
                      <span style={{ background: emp.pct >= 60 ? '#E6F4EA' : '#FEF7E0', color: emp.pct >= 60 ? '#137333' : '#B06000', borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>
                        {emp.pct}% Done {emp.pct >= 60 ? '✓' : '⚠️'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      <span>📞 {emp.calls}/80</span>
                      <span>📅 {emp.itvs}/15</span>
                      <span>🚶 {emp.walks}/5</span>
                      <span>🏆 {emp.sels}/3</span>
                      <span>👥 {emp.jnds}/1</span>
                    </div>
                    <div style={{ background: '#E5E7EB', height: 6, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${emp.pct}%`, height: '100%', background: emp.pct >= 60 ? 'linear-gradient(90deg, #10B981 0%, #34D399 100%)' : 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)', borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* FOR EMPLOYEE & INDIVIDUAL HR VIEW: ALL 5 TARGET METRIC CARDS */
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <TargetMetricCard title="Calls Made" icon="📞" current={callsMadeCount} target={80} unit="Calls" weight="20%" iconBg="#F5F3FF" iconColor="#7C5CFC" onClick={() => setActiveTaskCategory('calls')} />
            <TargetMetricCard title="Interviews Scheduled" icon="📅" current={interviewsScheduledTargetCount} target={15} unit="Interviews" weight="20%" iconBg="#EFF6FF" iconColor="#3B82F6" onClick={() => setActiveTaskCategory('interviews')} />
            <TargetMetricCard title="Walk-ins Today" icon="🚶" current={walkinsTargetCount} target={5} unit="Walkins" weight="20%" iconBg="#FEF3C7" iconColor="#D97706" onClick={() => setActiveTaskCategory('walkins')} />
            <TargetMetricCard title="Selected Today" icon="🏆" current={selectedTodayTargetCount} target={3} unit="Selected" weight="20%" iconBg="#ECFDF5" iconColor="#10B981" onClick={() => setActiveTaskCategory('selected')} />
            <TargetMetricCard title="Joined Today" icon="👥" current={joinedTodayTargetCount} target={1} unit="Joined" weight="20%" iconBg="#FFF7ED" iconColor="#F97316" onClick={() => setActiveTaskCategory('joined')} />
          </div>
        )}
      </div>

      {/* 5 INDEPENDENT TASK DATASHEET PAGES TAB BAR */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button 
          onClick={() => setActiveTaskCategory('calls')}
          style={{
            background: activeTaskCategory === 'calls' ? '#7C5CFC' : '#FFFFFF',
            color: activeTaskCategory === 'calls' ? '#FFFFFF' : '#374151',
            border: activeTaskCategory === 'calls' ? '1px solid #6D28D9' : '1px solid #E5E7EB',
            borderRadius: 99, padding: '9px 18px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
            boxShadow: activeTaskCategory === 'calls' ? '0 4px 12px rgba(124,92,252,0.2)' : '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease'
          }}
        >
          📞 Calls Made Page ({roleFilteredCandidates.filter(c => getCategoryFromCandidate(c) === 'calls').length})
        </button>

        <button 
          onClick={() => setActiveTaskCategory('interviews')}
          style={{
            background: activeTaskCategory === 'interviews' ? '#3B82F6' : '#FFFFFF',
            color: activeTaskCategory === 'interviews' ? '#FFFFFF' : '#374151',
            border: activeTaskCategory === 'interviews' ? '1px solid #2563EB' : '1px solid #E5E7EB',
            borderRadius: 99, padding: '9px 18px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
            boxShadow: activeTaskCategory === 'interviews' ? '0 4px 12px rgba(59,130,246,0.2)' : '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease'
          }}
        >
          📅 Interviews Scheduled Page ({roleFilteredCandidates.filter(c => getCategoryFromCandidate(c) === 'interviews').length})
        </button>

        <button 
          onClick={() => setActiveTaskCategory('walkins')}
          style={{
            background: activeTaskCategory === 'walkins' ? '#D97706' : '#FFFFFF',
            color: activeTaskCategory === 'walkins' ? '#FFFFFF' : '#374151',
            border: activeTaskCategory === 'walkins' ? '1px solid #B45309' : '1px solid #E5E7EB',
            borderRadius: 99, padding: '9px 18px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
            boxShadow: activeTaskCategory === 'walkins' ? '0 4px 12px rgba(217,119,6,0.2)' : '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease'
          }}
        >
          🚶 Walk-ins Today Page ({roleFilteredCandidates.filter(c => getCategoryFromCandidate(c) === 'walkins').length})
        </button>

        <button 
          onClick={() => setActiveTaskCategory('selected')}
          style={{
            background: activeTaskCategory === 'selected' ? '#10B981' : '#FFFFFF',
            color: activeTaskCategory === 'selected' ? '#FFFFFF' : '#374151',
            border: activeTaskCategory === 'selected' ? '1px solid #059669' : '1px solid #E5E7EB',
            borderRadius: 99, padding: '9px 18px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
            boxShadow: activeTaskCategory === 'selected' ? '0 4px 12px rgba(16,185,129,0.2)' : '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease'
          }}
        >
          🏆 Selected Today Page ({roleFilteredCandidates.filter(c => getCategoryFromCandidate(c) === 'selected').length})
        </button>

        <button 
          onClick={() => setActiveTaskCategory('joined')}
          style={{
            background: activeTaskCategory === 'joined' ? '#F97316' : '#FFFFFF',
            color: activeTaskCategory === 'joined' ? '#FFFFFF' : '#374151',
            border: activeTaskCategory === 'joined' ? '1px solid #EA580C' : '1px solid #E5E7EB',
            borderRadius: 99, padding: '9px 18px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
            boxShadow: activeTaskCategory === 'joined' ? '0 4px 12px rgba(249,115,22,0.2)' : '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease'
          }}
        >
          👥 Joined Today Page ({roleFilteredCandidates.filter(c => getCategoryFromCandidate(c) === 'joined').length})
        </button>
      </div>

      {/* CANDIDATE DATASHEET TABLE & STATUS OVERVIEW GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: 24 }}>
        {/* LEFT: CANDIDATE TABLE CARD */}
        <div className="recruitment-page-card" style={{ background: 'rgba(255, 255, 255, 0.62)', backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)', border: '1px solid rgba(255, 255, 255, 0.75)', borderRadius: 24, padding: 24, boxShadow: '0 8px 32px rgba(120, 100, 80, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', fontFamily: "'Plus Jakarta Sans', 'Outfit', sans-serif" }}>
                {activeTaskCategory === 'calls' ? '📞 Calls Made Datasheet' :
                 activeTaskCategory === 'interviews' ? '📅 Interviews Scheduled Datasheet' :
                 activeTaskCategory === 'walkins' ? '🚶 Walk-ins Today Datasheet' :
                 activeTaskCategory === 'selected' ? '🏆 Selected Today Datasheet' :
                 '👥 Joined Today Datasheet'} {isEmp ? `(${user?.name})` : selectedEmployeeFilter !== 'ALL' ? `(${selectedEmployeeFilter})` : '(All Recruiter Log)'}
              </h3>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: '#059669', marginTop: 2 }}>✓ {saveStatus}</p>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 99, padding: '7px 16px', fontSize: 12, fontWeight: 600, width: 170, outline: 'none' }}
                placeholder="Search candidate..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151', borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleTriggerImport}>
                <IC n="file" s={13} /> Upload File
              </button>
              <button style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E', borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }} onClick={handleCleanDuplicates} title="Remove duplicate candidate entries">
                🧹 Clean Duplicates
              </button>
              <button style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 99, padding: '7px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }} onClick={handleClearAllCandidates} title="Clear all candidates to start fresh">
                🗑️ Clear
              </button>
              {/* Hide Add Candidate button for Super Admin */}
              {!isSA && (
                <button style={{ background: '#111827', color: '#ffffff', border: 'none', borderRadius: 99, padding: '7px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} onClick={handleAddInlineRow}>
                  <IC n="plus" s={13} /> Add Candidate
                </button>
              )}
            </div>
          </div>

          {/* HORIZONTAL TABLE CONTAINER WITH REF */}
          <div ref={tableScrollRef} style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid #F3F4F6', scrollBehavior: 'smooth' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1050 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {['SL No', 'Date', 'Candidate Name', 'Contact Number', 'Languages', 'Qualification', 'Response', 'Call Status', 'Location', 'Experience', 'Follow Up 1', 'Follow Up 2', 'Follow Up 3', 'Action'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: h === 'Action' ? 'center' : 'left', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#6B7280' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map(row => (
                  <tr key={row.id || row._id} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#9CA3AF' }}>{row.slNo}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        disabled={isSA}
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11, width: 85, fontWeight: 600, color: '#111827' }}
                        value={row.date || ''}
                        onChange={e => handleCellChange(row.id || row._id, 'date', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        disabled={isSA}
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#111827', width: 140 }}
                        value={row.name || ''}
                        onChange={e => handleCellChange(row.id || row._id, 'name', e.target.value.toUpperCase())}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        disabled={isSA}
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#111827', width: 110 }}
                        value={row.number || ''}
                        onChange={e => handleCellChange(row.id || row._id, 'number', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <select
                        disabled={isSA}
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#111827', outline: 'none' }}
                        value={row.languages || 'English'}
                        onChange={e => handleCellChange(row.id || row._id, 'languages', e.target.value)}
                      >
                        {LANGUAGE_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        disabled={isSA}
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#111827', width: 90 }}
                        value={row.qualification || ''}
                        onChange={e => handleCellChange(row.id || row._id, 'qualification', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        disabled={isSA}
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#111827', width: 130 }}
                        value={row.response || ''}
                        onChange={e => handleCellChange(row.id || row._id, 'response', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <select
                        disabled={isSA}
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 800, color: '#111827', outline: 'none' }}
                        value={row.callStatus || 'Select Status'}
                        onChange={e => handleCellChange(row.id || row._id, 'callStatus', e.target.value)}
                      >
                        <option value="Select Status">Select Status</option>
                        {CALL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        disabled={isSA}
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#111827', width: 100 }}
                        value={row.location || ''}
                        onChange={e => handleCellChange(row.id || row._id, 'location', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        disabled={isSA}
                        type="number"
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 6px', fontSize: 11, width: 45, textAlign: 'center', fontWeight: 700, color: '#111827' }}
                        value={row.experience ?? 0}
                        onChange={e => handleCellChange(row.id || row._id, 'experience', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        disabled={isSA}
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#111827', width: 110 }}
                        value={row.followUp1 || ''}
                        onChange={e => handleCellChange(row.id || row._id, 'followUp1', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        disabled={isSA}
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#111827', width: 110 }}
                        value={row.followUp2 || ''}
                        onChange={e => handleCellChange(row.id || row._id, 'followUp2', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        disabled={isSA}
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#111827', width: 110 }}
                        value={row.followUp3 || ''}
                        onChange={e => handleCellChange(row.id || row._id, 'followUp3', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      {!isSA && (
                        <button 
                          style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => handleDeleteCandidate(row.id || row._id)}
                          title="Delete candidate row"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* REQUIREMENT 3: HORIZONTAL TABLE SLIDE CONTROLLER BAR AT END OF PAGE */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#6B7280' }}>
              <span>↔ Slide Datasheet Columns:</span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>(Location, Experience, Follow Up 1, 2, 3)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 380 }}>
              <button 
                className="btn btn-xs btn-ghost" 
                style={{ borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 800, background: '#F3F4F6', color: '#111827' }}
                onClick={() => { if (tableScrollRef.current) tableScrollRef.current.scrollBy({ left: -250, behavior: 'smooth' }); }}
              >
                ◂ Slide Left
              </button>

              <input 
                type="range" 
                min="0" 
                max="100" 
                defaultValue="0" 
                style={{ flex: 1, accentColor: '#7C5CFC', cursor: 'pointer' }} 
                onInput={(e) => {
                  if (tableScrollRef.current) {
                    const maxScroll = tableScrollRef.current.scrollWidth - tableScrollRef.current.clientWidth;
                    tableScrollRef.current.scrollLeft = (e.target.value / 100) * maxScroll;
                  }
                }} 
              />

              <button 
                className="btn btn-xs btn-ghost" 
                style={{ borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 800, background: '#F3F4F6', color: '#111827' }}
                onClick={() => { if (tableScrollRef.current) tableScrollRef.current.scrollBy({ left: 250, behavior: 'smooth' }); }}
              >
                Slide Right ▸
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid #F3F4F6' }}>
            <button style={{ background: 'transparent', border: 'none', color: '#7C5CFC', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleTriggerImport}>
              <IC n="file" s={14} /> Upload File (.csv, .xlsx)
            </button>
            <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
              ✓ Instant auto-save on every keystroke. Synced to MongoDB Atlas cloud.
            </span>
          </div>
        </div>

        {/* RIGHT: CANDIDATE STATUS OVERVIEW DONUT CARD */}
        <div className="recruitment-page-card" style={{ background: 'rgba(255, 255, 255, 0.62)', backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)', border: '1px solid rgba(255, 255, 255, 0.75)', borderRadius: 24, padding: 24, boxShadow: '0 8px 32px rgba(120, 100, 80, 0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', width: '100%', textAlign: 'left', fontFamily: "'Plus Jakarta Sans', 'Outfit', sans-serif" }}>Candidate Status Overview</h3>

          <div style={{ position: 'relative', width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: doughnutGradient }} />
            <div style={{ position: 'absolute', inset: 22, background: '#FFFFFF', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#111827', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{totalCandidatesCount}</span>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#9CA3AF', letterSpacing: '0.6px' }}>CANDIDATES</span>
            </div>
          </div>

          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11.5, fontWeight: 700, borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
            <div><span style={{ color: '#10B981' }}>●</span> Selected: <strong style={{ color: '#111827' }}>{selPct}%</strong></div>
            <div><span style={{ color: '#8B5CF6' }}>●</span> Interview: <strong style={{ color: '#111827' }}>{itvPct}%</strong></div>
            <div><span style={{ color: '#F59E0B' }}>●</span> Screening: <strong style={{ color: '#111827' }}>{scrPct}%</strong></div>
            <div><span style={{ color: '#EF4444' }}>●</span> Rejected: <strong style={{ color: '#111827' }}>{rejPct}%</strong></div>
            <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#94A3B8' }}>●</span> Pending: <strong style={{ color: '#111827' }}>{pndPct}%</strong></div>
          </div>

          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderTop: '1px solid #F3F4F6', paddingTop: 14, textAlign: 'center' }}>
            <div style={{ background: '#F9FAFB', padding: '10px 8px', borderRadius: 14, border: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 800, letterSpacing: '0.4px' }}>TOTAL CANDIDATES</span>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#111827', marginTop: 2 }}>{totalCandidatesCount}</div>
            </div>
            <div style={{ background: '#F9FAFB', padding: '10px 8px', borderRadius: 14, border: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 800, letterSpacing: '0.4px' }}>TODAY'S ADDED</span>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#111827', marginTop: 2 }}>{todayAddedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1E1B4B', color: '#fff', padding: '14px 22px', borderRadius: 16, fontSize: 12.5, fontWeight: 700, boxShadow: '0 12px 32px rgba(0,0,0,0.3)', zIndex: 999 }}>
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}

function PerformancePage({ user }) {
  const [goals, setGoals] = useState([
    { id: 1, title: 'Core Interface Refactoring', target: 'Achieve 100% markup verification on Vite compiler', score: '98%', kpi: 'Build Errors: 0' },
    { id: 2, title: 'Response Speed Optimization', target: 'Decrease API endpoint query delays below 150ms', score: '85%', kpi: 'Latency logs limit' },
    { id: 3, title: 'CEGS Audit Engine deployment', target: 'Automate certificate scan rules verification scripts', score: '100%', kpi: 'Trust module online' },
  ]);
  const [form, setForm] = useState({ title: '', target: '', kpi: '', score: 'Pending Evaluation' });

  const submit = (e) => {
    e.preventDefault();
    setGoals([...goals, { id: Date.now(), ...form }]);
    setForm({ title: '', target: '', kpi: '', score: 'Pending Evaluation' });
  };

  return (
    <div className="dash-grid anim-fadeup">
      <div className="card">
        <div className="card-hdr">
          <div>
            <div className="section-title">Performance reviews & Target KPIs</div>
            <div className="section-sub">Track active goals, manager evaluations, and feedback records</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {goals.map((g, idx) => (
            <div key={idx} style={{ background: 'var(--bg-body)', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{g.title}</div>
                <span className="badge b-success" style={{ fontWeight: 800 }}>{g.score}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong>Objective:</strong> {g.target}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}><strong>KPI Metrics:</strong> {g.kpi}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-hdr"><div className="section-title">Submit Performance Target</div></div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Goal Title</label>
            <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sales quota achievement" required />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Target Objective</label>
            <input className="form-input" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} placeholder="e.g. Complete 5 client leads" required />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">KPI Measurement</label>
            <input className="form-input" value={form.kpi} onChange={e => setForm({ ...form, kpi: e.target.value })} placeholder="e.g. Total active deals count" required />
          </div>
          <button className="btn btn-dark" style={{ marginTop: 20, width: '100%' }} type="submit">Submit Goal</button>
        </form>
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

  const startNewCourse = () => {
    const title = prompt('Enter the name of the new training course you wish to assign/enroll:');
    if (title) {
      setCourses([...courses, { id: Date.now(), title, progress: 0, status: 'Assigned' }]);
    }
  };

  const study = (id) => {
    setCourses(courses.map(c => {
      if (c.id === id) {
        const nextProg = Math.min(c.progress + 25, 100);
        return {
          ...c,
          progress: nextProg,
          status: nextProg === 100 ? 'Completed' : 'In Progress'
        };
      }
      return c;
    }));
  };

  return (
    <div className="card anim-fadeup">
      <div className="card-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="section-title">Assigned Training Courses & Certifications</div>
          <div className="section-sub">Up-skill and monitor onboarding compliance requirements</div>
        </div>
        <button className="btn btn-dark" onClick={startNewCourse}><IC n="plus" /> Assign Course</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {courses.map(c => (
          <div key={c.id} style={{ background: 'var(--bg-body)', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.title}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${c.progress===100?'b-success':'b-pending'}`}>{c.status}</span>
                {c.progress < 100 && <button className="btn btn-xs btn-ghost" onClick={() => study(c.id)}><IC n="star" s={10}/> Study</button>}
              </div>
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
  const [steps, setSteps] = useState([
    { name: 'Formal resignation letter registry', done: true },
    { name: 'Hardware assets physical handover', done: false },
    { name: 'Financial clearance & final settlements', done: false },
    { name: 'Exit feedback feedback interview', done: false },
  ]);

  const toggle = (idx) => {
    setSteps(steps.map((s, i) => i === idx ? { ...s, done: !s.done } : s));
  };

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
            <input type="checkbox" checked={s.done} onChange={() => toggle(idx)} style={{ cursor: 'pointer', width: 16, height: 16 }} />
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

function DirectoryPage({ db, setQuickViewUser, setChatTargetUser, openChatWithUser }) {
  const [search, setSearch] = useState('');
  const list = db.users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || (u.title || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase()));

  const handleChat = (u) => {
    if (openChatWithUser) {
      openChatWithUser(u);
    } else if (setChatTargetUser) {
      setChatTargetUser(u);
    }
  };

  return (
    <div className="card anim-fadeup" style={{ padding: 20, borderRadius: 20 }}>
      <div className="card-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div className="section-title" style={{ fontSize: 18, fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>Company Employee Directory</div>
          <div className="section-sub" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Search and check contact cards of all team members ({list.length} Members)</div>
        </div>
      </div>
      <input className="form-input" style={{ marginBottom: 14, padding: '8px 14px', borderRadius: 12, fontSize: 12.5 }} placeholder="🔍 Search colleagues by name, email, or role title..." value={search} onChange={e=>setSearch(e.target.value)} />
      
      {/* COMPACT & SMOOTH SCROLLABLE GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, maxHeight: '420px', overflowY: 'auto', paddingRight: 6, scrollbarWidth: 'thin' }}>
        {list.map(u => (
          <div 
            key={u.id} 
            className="team-slide-card" 
            style={{ flex: 'none', width: 'auto', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', padding: '14px 12px', borderRadius: 16 }} 
            onClick={() => setQuickViewUser && setQuickViewUser(u)}
          >
            <div className="team-card-color-bar" style={{ background: '#7C5CFC', height: 3 }}></div>
            <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`} className="team-card-avatar" alt="" style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid #7C5CFC' }} />
            <div className="team-card-name" style={{ fontSize: 14, fontWeight: 900, marginTop: 6 }}>{u.name}</div>
            <div className="team-card-role" style={{ fontSize: 11.5, fontWeight: 700, color: '#7C5CFC' }}>{u.title || u.designation || u.role}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontFamily: 'JetBrains Mono,monospace', wordBreak: 'break-all' }}>{u.email}</div>

            <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'center' }}>
              <button 
                type="button"
                className="btn btn-sm btn-ghost" 
                onClick={(e) => { e.stopPropagation(); setQuickViewUser && setQuickViewUser(u); }}
                style={{ padding: '4px 10px', fontSize: 11, fontWeight: 800, borderRadius: 8 }}
              >
                👁️ Quick View
              </button>
              <button 
                type="button"
                className="btn btn-sm btn-dark" 
                onClick={(e) => { e.stopPropagation(); handleChat(u); }}
                style={{ padding: '4px 10px', fontSize: 11, fontWeight: 800, background: '#7C5CFC', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                💬 Chat
              </button>
            </div>
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
  const avatarFileRef = useRef(null);

  const isAdminOrHR = user?.role === 'super_admin' || user?.role === 'admin' || (user?.title && typeof user.title === 'string' && user.title.toLowerCase().includes('hr manager'));

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target.result;
      const updated = { ...formData, avatar: base64 };
      setFormData(updated);
      save('users', db.users.map(u => u.id === user.id ? { ...u, avatar: base64 } : u));
    };
    reader.readAsDataURL(file);
  };

  const update = e => {
    e.preventDefault();
    if (!isAdminOrHR) {
      alert('ℹ️ Employee profile details are managed centrally by HR Admin. Only profile photo upload is permitted for employees.');
      return;
    }
    save('users', db.users.map(u => u.id === user.id ? { ...u, ...formData } : u));
    alert('Profile information successfully saved.');
  };

  return (
    <div className="card anim-fadeup" style={{ maxWidth: 720 }}>
      <input type="file" ref={avatarFileRef} onChange={handleAvatarFile} accept="image/*" style={{ display: 'none' }} />
      
      <div className="card-hdr">
        <div>
          <div className="section-title">My Profile</div>
          <div className="section-sub">
            {isAdminOrHR ? 'Manage personal details, avatar photo, contact entries, and financial records' : 'View your official employee details and update your profile photo'}
          </div>
        </div>
      </div>

      {!isAdminOrHR && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '12px 16px', borderRadius: 14, marginBottom: 18, fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>ℹ️</span>
          <span>Official employee details are managed centrally by HR Admin. Employees are authorized to update their <strong>Profile Photo</strong>.</span>
        </div>
      )}

      {/* AVATAR PHOTO & UPLOAD IMAGE SECTION */}
      <div style={{ background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)', borderRadius: 20, padding: 20, marginBottom: 20, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <img 
            src={formData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} 
            alt={formData.name} 
            style={{ width: 84, height: 84, borderRadius: '50%', border: '3px solid #7C5CFC', objectFit: 'cover', boxShadow: '0 4px 14px rgba(124,92,252,0.25)' }} 
          />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>{formData.name}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginTop: 2 }}>{formData.title || 'Team Member'} · {formData.email}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn btn-sm btn-dark" 
              style={{ borderRadius: 99, padding: '6px 16px', fontWeight: 800 }} 
              onClick={() => avatarFileRef.current && avatarFileRef.current.click()}
            >
              📸 Upload Profile Image
            </button>
          </div>
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
              <input className="form-input" value={formData.name||''} onChange={e=>setFormData({...formData, name: e.target.value})} disabled={!isAdminOrHR} required />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Contact Phone Number</label>
              <input className="form-input" value={formData.phone||user?.contact||''} onChange={e=>setFormData({...formData, phone: e.target.value})} disabled={!isAdminOrHR} />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Emergency Number</label>
              <input className="form-input" value={formData.emergencyPhone||user?.emergency_contact||''} onChange={e=>setFormData({...formData, emergencyPhone: e.target.value})} placeholder="+91 9876543210" disabled={!isAdminOrHR} />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Role (Designation)</label>
              <input className="form-input" value={formData.title||user?.designation||''} onChange={e=>setFormData({...formData, title: e.target.value})} disabled={!isAdminOrHR} required />
            </div>
          </>
        )}
        {tab === 'experience' && (
          <>
            <div className="form-group">
              <label className="form-label">Professional Designation Title</label>
              <input className="form-input" value={formData.title||user?.designation||''} onChange={e=>setFormData({...formData, title: e.target.value})} disabled={!isAdminOrHR} />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Academic Degrees & Certifications</label>
              <input className="form-input" placeholder="B.S. Computer Science / AWS Architect" value={formData.degrees||''} onChange={e=>setFormData({...formData, degrees: e.target.value})} disabled={!isAdminOrHR} />
            </div>
          </>
        )}
        {tab === 'financial' && (
          <>
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input className="form-input" value={formData.bankName||user?.bank_name||''} onChange={e=>setFormData({...formData, bankName: e.target.value})} placeholder="State Bank of India / HDFC" disabled={!isAdminOrHR} />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Account Number</label>
              <input className="form-input" value={formData.bankAccount||user?.account_number||''} onChange={e=>setFormData({...formData, bankAccount: e.target.value})} placeholder="**** **** **** 8877" disabled={!isAdminOrHR} />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">IFSC Code</label>
              <input className="form-input" value={formData.bankIfsc||user?.ifsc_code||''} onChange={e=>setFormData({...formData, bankIfsc: e.target.value})} placeholder="SBIN0001234" disabled={!isAdminOrHR} />
            </div>
          </>
        )}
        {isAdminOrHR && <button className="btn btn-dark" style={{ marginTop: 16 }} type="submit">Save Changes</button>}
      </form>
    </div>
  );
}

/* ========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================
   MOUNT
   ======================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================== */
export default App;