import { useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Download,
  FileBarChart,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MoreHorizontal,
  NotebookPen,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  UserPlus,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import './styles.css';

type Role = 'directeur' | 'enseignant' | 'secretaire' | 'comptable';
type View = 'dashboard' | 'students' | 'staff' | 'classes' | 'attendance' | 'grades' | 'timetable' | 'finance' | 'settings';
type Icon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
type Student = { id: number; initials: string; name: string; className: string; attendance: number; balance: string; status: 'Actif' | 'À compléter' };
type AttendanceStatus = 'present' | 'late' | 'absent';

type NavItem = { id: View; label: string; icon: Icon; roles: Role[]; section?: string };

const navItems: NavItem[] = [
  { id: 'dashboard', label: "Vue d'ensemble", icon: LayoutDashboard, roles: ['directeur', 'enseignant', 'secretaire', 'comptable'] },
  { id: 'students', label: 'Élèves', icon: Users, roles: ['directeur', 'secretaire', 'enseignant'] },
  { id: 'staff', label: 'Personnel', icon: UserRound, roles: ['directeur', 'secretaire'] },
  { id: 'classes', label: 'Classes', icon: Building2, roles: ['directeur', 'enseignant', 'secretaire'] },
  { id: 'grades', label: 'Académique', icon: BookOpen, roles: ['directeur', 'enseignant'] },
  { id: 'timetable', label: 'Planning', icon: CalendarDays, roles: ['directeur', 'enseignant'] },
  { id: 'attendance', label: 'Présences', icon: ClipboardCheck, roles: ['directeur', 'enseignant', 'secretaire'] },
  { id: 'finance', label: 'Finances', icon: WalletCards, roles: ['directeur', 'comptable'] },
  { id: 'settings', label: 'Paramètres', icon: Settings, roles: ['directeur'] },
];

const roleLabels: Record<Role, string> = { directeur: 'Directeur', enseignant: 'Enseignant', secretaire: 'Secrétaire', comptable: 'Comptable' };
const roleNames: Record<Role, string> = { directeur: 'Jean Kabeya', enseignant: 'Patrick Ilunga', secretaire: 'Chantal Mwamba', comptable: 'Joseph Mbala' };
const roleInitials: Record<Role, string> = { directeur: 'JK', enseignant: 'PI', secretaire: 'CM', comptable: 'JM' };

const initialStudents: Student[] = [
  { id: 1, initials: 'KM', name: 'Kevin Mukendi', className: '6ème primaire A', attendance: 96, balance: 'À jour', status: 'Actif' },
  { id: 2, initials: 'GN', name: 'Grace Ntumba', className: '4ème primaire B', attendance: 88, balance: '120 000 FC', status: 'Actif' },
  { id: 3, initials: 'DL', name: 'David Lumumba', className: '6ème primaire A', attendance: 94, balance: 'À jour', status: 'Actif' },
  { id: 4, initials: 'CM', name: 'Chantal Mbuyi', className: '6ème primaire A', attendance: 91, balance: '50 000 FC', status: 'À compléter' },
  { id: 5, initials: 'JK', name: 'Joel Kalala', className: '5ème primaire A', attendance: 98, balance: 'À jour', status: 'Actif' },
  { id: 6, initials: 'EM', name: 'Esther Mangala', className: '6ème primaire B', attendance: 93, balance: 'À jour', status: 'Actif' },
];

const classStudents = initialStudents.filter((student) => student.className === '6ème primaire A');
const attendanceRoster: Student[] = [...classStudents, { id: 7, initials: 'AM', name: 'Amadou Kabasele', className: '6ème primaire A', attendance: 90, balance: 'À jour', status: 'Actif' }];

function App() {
  const [role, setRole] = useState<Role>(() => (localStorage.getItem('zeno-role') as Role) || 'directeur');
  const [view, setView] = useState<View>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('zeno-students');
    return saved ? JSON.parse(saved) as Student[] : initialStudents;
  });
  const [toast, setToast] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>(() =>
    Object.fromEntries(attendanceRoster.map((student) => [student.id, 'present'])) as Record<number, AttendanceStatus>,
  );
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  useEffect(() => { localStorage.setItem('zeno-role', role); }, [role]);
  useEffect(() => { localStorage.setItem('zeno-students', JSON.stringify(students)); }, [students]);
  useEffect(() => {
    const handleToast = (event: Event) => setToast((event as CustomEvent<string>).detail);
    window.addEventListener('zeno-toast', handleToast);
    return () => window.removeEventListener('zeno-toast', handleToast);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const totalStudentCount = 1284 + Math.max(0, students.length - initialStudents.length);
  const visibleNav = useMemo(() => navItems.filter((item) => item.roles.includes(role)), [role]);
  const navigate = (nextView: View) => { setView(nextView); setMobileNavOpen(false); setAttendanceSaved(false); };

  const addStudent = (name: string, className: string) => {
    const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    setStudents((current) => [...current, { id: Date.now(), initials, name, className, attendance: 100, balance: 'À jour', status: 'Actif' }]);
    setToast(`${name} a été ajouté à la liste des élèves.`);
  };

  const saveAttendance = () => {
    setAttendanceSaved(true);
    setToast('Appel enregistré. Les statistiques de la classe sont à jour.');
  };

  return (
    <div className="zeno-app">
      <button className={`mobile-overlay ${mobileNavOpen ? 'is-open' : ''}`} onClick={() => setMobileNavOpen(false)} aria-label="Fermer la navigation" />
      <Sidebar role={role} view={view} items={visibleNav} open={mobileNavOpen} onNavigate={navigate} onClose={() => setMobileNavOpen(false)} />
      <main className="main-shell">
        <Topbar role={role} onMenu={() => setMobileNavOpen(true)} onSearch={() => navigate('students')} onRoleChange={(nextRole) => { setRole(nextRole); navigate('dashboard'); }} />
        <div className="page-wrap">
          {view === 'dashboard' && <Dashboard role={role} onNavigate={navigate} studentsCount={totalStudentCount} />}
          {view === 'students' && <StudentsPage students={students} role={role} totalStudentCount={totalStudentCount} onAdd={addStudent} onToast={setToast} />}
          {view === 'staff' && <StaffPage onToast={setToast} />}
          {view === 'classes' && <ClassesPage onNavigate={navigate} />}
          {view === 'attendance' && <AttendancePage attendance={attendance} setAttendance={setAttendance} saved={attendanceSaved} onSave={saveAttendance} />}
          {view === 'grades' && <GradesPage onToast={setToast} />}
          {view === 'timetable' && <TimetablePage onToast={setToast} />}
          {view === 'finance' && <FinancePage onToast={setToast} />}
          {view === 'settings' && <SettingsPage onToast={setToast} />}
        </div>
      </main>
      {toast && <div className="toast"><CheckCircle2 size={18} /><span>{toast}</span><button onClick={() => setToast(null)} aria-label="Fermer"><X size={16} /></button></div>}
    </div>
  );
}

function Sidebar({ role, view, items, open, onNavigate, onClose }: { role: Role; view: View; items: NavItem[]; open: boolean; onNavigate: (view: View) => void; onClose: () => void }) {
  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <div className="brand-row"><div className="brand-mark">Z</div><div><strong>Zeno</strong><span>Complexe Scolaire La Sagesse</span></div><button className="sidebar-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div>
      <div className="school-switcher"><div className="school-avatar"><Building2 size={16} /></div><div><span>Établissement actif</span><strong>2026–2027</strong></div><ChevronRight size={16} /></div>
      <nav className="nav-list" aria-label="Navigation principale">
        {items.map((item) => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => onNavigate(item.id)}><item.icon size={18} strokeWidth={view === item.id ? 2.2 : 1.8} /><span>{item.label}</span>{item.id === 'attendance' && <span className="nav-count">3</span>}</button>)}
      </nav>
      <div className="sidebar-bottom"><button className="help-link"><ShieldCheck size={17} /> Données protégées</button><div className="user-row"><div className="avatar avatar-photo">{role === 'directeur' ? 'JK' : role === 'enseignant' ? 'PI' : role === 'secretaire' ? 'CM' : 'JM'}</div><div><strong>{roleNames[role]}</strong><span>{roleLabels[role]}</span></div><MoreHorizontal size={17} /></div></div>
    </aside>
  );
}

function Topbar({ role, onMenu, onSearch, onRoleChange }: { role: Role; onMenu: () => void; onSearch: () => void; onRoleChange: (role: Role) => void }) {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  return <header className="topbar"><button className="mobile-menu" onClick={onMenu} aria-label="Ouvrir la navigation"><SlidersHorizontal size={20} /></button><div className="breadcrumbs"><span>Zeno</span><ChevronRight size={14} /><strong>{roleLabels[role]}</strong></div><div className="topbar-actions"><button className="search-trigger" onClick={onSearch}><Search size={16} /><span>Rechercher un élève, un enseignant…</span><kbd>⌘ K</kbd></button><button className="icon-button has-dot" aria-label="Notifications"><Bell size={18} /></button><button className="icon-button" aria-label="Aide"><CircleDollarIcon /></button><div className="role-menu-wrap"><button className="top-avatar" onClick={() => setRoleMenuOpen((open) => !open)} aria-label="Changer de rôle">{roleInitials[role]}</button>{roleMenuOpen && <div className="role-menu">{(Object.keys(roleLabels) as Role[]).map((candidate) => <button key={candidate} className={candidate === role ? 'selected' : ''} onClick={() => { onRoleChange(candidate); setRoleMenuOpen(false); }}>{roleLabels[candidate]}<small>{roleNames[candidate]}</small></button>)}</div>}</div></div></header>;
}

function CircleDollarIcon() { return <span className="question-mark">?</span>; }

function Dashboard({ role, onNavigate, studentsCount }: { role: Role; onNavigate: (view: View) => void; studentsCount: number }) {
  if (role === 'enseignant') return <TeacherDashboard onNavigate={onNavigate} />;
  if (role === 'secretaire') return <SecretaryDashboard onNavigate={onNavigate} />;
  if (role === 'comptable') return <AccountantDashboard onNavigate={onNavigate} />;
  return <DirectorDashboard onNavigate={onNavigate} studentsCount={studentsCount} />;
}

function DirectorDashboard({ onNavigate, studentsCount }: { onNavigate: (view: View) => void; studentsCount: number }) {
  return <>
    <PageIntro eyebrow="Mardi 12 novembre · Année scolaire 2026–2027" title="Bonjour, Monsieur le Directeur." subtitle="Voici ce qui mérite votre attention aujourd’hui." action={<button className="button primary" onClick={() => onNavigate('students')}><Plus size={17} /> Nouvelle inscription</button>} />
    <div className="metrics-grid"><Metric label="Élèves inscrits" value={studentsCount.toLocaleString('fr-FR')} trend="+42 ce mois" icon={GraduationCap} tone="blue" /><Metric label="Enseignants" value="73" trend="Stable" icon={Users} tone="amber" /><Metric label="Classes actives" value="42" trend="+2 cette année" icon={Building2} tone="violet" /><Metric label="Présence aujourd’hui" value="97%" trend="+1,4% cette semaine" icon={CheckCircle2} tone="green" /></div>
    <div className="attention-panel panel"><div className="panel-heading"><div><p className="eyebrow">À votre attention</p><h2>Les sujets qui nécessitent une action</h2></div><button className="text-button">Tout voir <ArrowUpRight size={15} /></button></div><div className="attention-grid"><ActionRow icon={ClipboardCheck} tone="amber" title="3 appels non effectués" detail="6A, 4B et 5ème primaire" onClick={() => onNavigate('attendance')} /><ActionRow icon={FileText} tone="blue" title="8 dossiers élèves incomplets" detail="Documents à vérifier" onClick={() => onNavigate('students')} /><ActionRow icon={AlertTriangle} tone="red" title="1 conflit de planning" detail="Double réservation salle B4" onClick={() => onNavigate('timetable')} /><ActionRow icon={CheckCircle2} tone="green" title="97% des enseignants ont commencé" detail="Pointage du matin" /></div></div>
    <div className="split-grid"><ActivityPanel /><AcademicSnapshot onNavigate={onNavigate} /></div>
  </>;
}

function TeacherDashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  return <><PageIntro eyebrow="Mardi 12 novembre · 07:50" title="Bonjour Patrick." subtitle="Voici ce que votre journée vous réserve en Mathématiques." action={<button className="button primary" onClick={() => onNavigate('attendance')}><ClipboardCheck size={17} /> Faire l’appel</button>} /><div className="teacher-layout"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">Votre journée</p><h2>Planning d’aujourd’hui</h2></div><button className="text-button" onClick={() => onNavigate('timetable')}>Voir la semaine <ArrowUpRight size={15} /></button></div><ScheduleRow time="08:00 – 10:00" subject="Mathématiques" className="6ème primaire A" room="Salle 12" status="En cours" onClick={() => onNavigate('attendance')} /><ScheduleRow time="10:00 – 12:00" subject="Mathématiques" className="6ème primaire B" room="Salle 8" status="À venir" /><ScheduleRow time="14:00 – 16:00" subject="Mathématiques" className="6ème primaire A" room="Salle 12" status="À venir" /></section><section className="side-stack"><div className="panel task-panel"><div className="panel-heading"><div><p className="eyebrow">À faire</p><h2>Vos tâches</h2></div></div><Task title="Appel — 6ème A" time="08:00 · Mathématiques" icon={ClipboardCheck} onClick={() => onNavigate('attendance')} /><Task title="Notes à saisir — 6ème B" time="Contrôle du 8 novembre" icon={NotebookPen} onClick={() => onNavigate('grades')} /><Task title="Devoir à publier — 6ème A" time="Pour vendredi" icon={FileText} /></div><div className="class-mini panel"><p className="eyebrow">Mes classes</p><div className="mini-class-row"><strong>6ème A</strong><span>32 élèves · Titulaire</span></div><div className="mini-class-row"><strong>6ème B</strong><span>30 élèves · Mathématiques</span></div></div></section></div></>;
}

function SecretaryDashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  return <><PageIntro eyebrow="Mardi 12 novembre · Secrétariat" title="Bonjour, Chantal." subtitle="12 dossiers attendent votre attention." action={<button className="button primary" onClick={() => onNavigate('students')}><UserPlus size={17} /> Nouvelle inscription</button>} /><div className="metrics-grid three"><Metric label="Dossiers incomplets" value="12" trend="À traiter aujourd’hui" icon={FileText} tone="red" /><Metric label="Nouvelles inscriptions" value="4" trend="Cette semaine" icon={UserPlus} tone="blue" /><Metric label="Changements de classe" value="3" trend="En attente de validation" icon={ArrowUpRight} tone="amber" /></div><div className="split-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">À traiter maintenant</p><h2>Dossiers incomplets</h2></div><button className="text-button" onClick={() => onNavigate('students')}>Tout voir <ArrowUpRight size={15} /></button></div><IncompleteRow initials="CM" name="Chantal Mbuyi" detail="1ère humanités — A" missing="Acte de naissance" /><IncompleteRow initials="GN" name="Grace Ntumba" detail="4ème primaire — B" missing="Photo d’identité" /><IncompleteRow initials="SK" name="Sarah Kabeya" detail="6ème primaire — A" missing="Certificat de transfert" /></section><section className="panel quick-actions"><p className="eyebrow">Accès rapide</p><h2>Gagner du temps</h2><QuickAction icon={Upload} title="Importer un fichier" onClick={() => setToastFromButton('Import prêt à être configuré')} /><QuickAction icon={FileText} title="Ajouter un document" onClick={() => setToastFromButton('Sélectionnez d’abord un élève')} /><QuickAction icon={ArrowUpRight} title="Transférer un élève" onClick={() => setToastFromButton('Le transfert sera disponible dans le dossier élève')} /></section></div></>;
}

function AccountantDashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  return <><PageIntro eyebrow="Mardi 12 novembre · Année scolaire 2026–2027" title="Bonjour, Joseph." subtitle="Voici la situation financière de l’établissement." action={<button className="button primary" onClick={() => onNavigate('finance')}><Plus size={17} /> Enregistrer un paiement</button>} /><div className="metrics-grid"><Metric label="Encaissé ce mois" value="18,4M FC" trend="+6% vs octobre" icon={CircleDollarSign} tone="green" /><Metric label="En attente" value="4,1M FC" trend="96 élèves concernés" icon={Clock3} tone="amber" /><Metric label="Échéances aujourd’hui" value="340 000 FC" trend="7 factures" icon={ReceiptText} tone="blue" /><Metric label="Dépenses ce mois" value="3,2M FC" trend="Salaires, matériel" icon={WalletCards} tone="violet" /></div><div className="split-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">Derniers mouvements</p><h2>Paiements récents</h2></div><button className="text-button" onClick={() => onNavigate('finance')}>Tout voir <ArrowUpRight size={15} /></button></div><PaymentRow name="Kevin Mukendi" amount="250 000 FC" method="Espèces" status="Confirmé" /><PaymentRow name="Grace Ntumba" amount="180 000 FC" method="Mobile Money" status="À rapprocher" /><PaymentRow name="David Lumumba" amount="250 000 FC" method="Virement" status="Confirmé" /></section><section className="panel collection-panel"><p className="eyebrow">Encaissements</p><h2>78% de l’objectif mensuel</h2><div className="progress-track"><span style={{ width: '78%' }} /></div><div className="progress-meta"><span>Objectif : 23,5M FC</span><strong>18,4M FC</strong></div><div className="muted-note"><CheckCircle2 size={16} /> Les encaissements progressent par rapport au mois dernier.</div></section></div></>;
}

function setToastFromButton(message: string) { window.dispatchEvent(new CustomEvent('zeno-toast', { detail: message })); }

function PageIntro({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) { return <div className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function Metric({ label, value, trend, icon: MetricIcon, tone }: { label: string; value: string; trend: string; icon: Icon; tone: string }) { return <div className="metric panel"><div className={`metric-icon ${tone}`}><MetricIcon size={19} /></div><span>{label}</span><strong>{value}</strong><small className={tone === 'red' ? 'negative' : ''}>{trend}</small></div>; }
function ActionRow({ icon: ActionIcon, tone, title, detail, onClick }: { icon: Icon; tone: string; title: string; detail: string; onClick?: () => void }) { return <button className="action-row" onClick={onClick}><span className={`row-icon ${tone}`}><ActionIcon size={17} /></span><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={17} /></button>; }
function ActivityPanel() { return <section className="panel activity-panel"><div className="panel-heading"><div><p className="eyebrow">Ce qui a changé</p><h2>Activité récente</h2></div><button className="text-button">Tout voir <ArrowUpRight size={15} /></button></div><Activity icon={ClipboardCheck} text={<><b>Patrick</b> a marqué Jean absent</>} time="il y a 12 min" /><Activity icon={UserPlus} text={<><b>Le secrétariat</b> a inscrit 2 nouveaux élèves</>} time="il y a 1 h" /><Activity icon={CircleDollarIcon} text={<><b>Comptabilité</b> a enregistré un paiement de 250 000 FC</>} time="il y a 2 h" /><Activity icon={BookOpen} text={<><b>Mme Okot</b> a saisi les notes de Mathématiques</>} time="hier" /></section>; }
function Activity({ icon: ActivityIcon, text, time }: { icon: Icon; text: ReactNode; time: string }) { return <div className="activity-row"><span className="activity-icon"><ActivityIcon size={15} /></span><span>{text}</span><time>{time}</time></div>; }
function AcademicSnapshot({ onNavigate }: { onNavigate: (view: View) => void }) { return <section className="panel academic-snapshot"><div className="panel-heading"><div><p className="eyebrow">Aperçu académique</p><h2>La semaine en un regard</h2></div><button className="icon-button" onClick={() => onNavigate('grades')} aria-label="Voir l'académique"><ArrowUpRight size={17} /></button></div><div className="donut-wrap"><div className="donut"><strong>94%</strong><span>Présence</span></div><div><strong className="snapshot-number">+2,4%</strong><p>vs. semaine dernière</p></div></div><div className="bar-chart" aria-label="Tendance des inscriptions"><span style={{ height: '38%' }} /><span style={{ height: '53%' }} /><span style={{ height: '45%' }} /><span style={{ height: '68%' }} /><span style={{ height: '61%' }} /><span style={{ height: '82%' }} /><span style={{ height: '90%' }} /></div><div className="chart-labels"><span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span></div></section>; }
function ScheduleRow({ time, subject, className, room, status, onClick }: { time: string; subject: string; className: string; room: string; status: string; onClick?: () => void }) { return <button className="schedule-row" onClick={onClick}><time>{time}</time><span className="schedule-dot" /><span className="schedule-main"><strong>{subject}</strong><small>{className} · {room}</small></span><span className={`status-pill ${status === 'En cours' ? 'green' : 'neutral'}`}>{status}</span><ChevronRight size={16} /></button>; }
function Task({ title, time, icon: TaskIcon, onClick }: { title: string; time: string; icon: Icon; onClick?: () => void }) { return <button className="task-row" onClick={onClick}><span className="task-icon"><TaskIcon size={16} /></span><span><strong>{title}</strong><small>{time}</small></span><ChevronRight size={16} /></button>; }
function IncompleteRow({ initials, name, detail, missing }: { initials: string; name: string; detail: string; missing: string }) { return <div className="incomplete-row"><span className="avatar">{initials}</span><span><strong>{name}</strong><small>{detail}</small></span><span className="missing-tag">{missing}</span><ChevronRight size={16} /></div>; }
function QuickAction({ icon: QuickIcon, title, onClick }: { icon: Icon; title: string; onClick: () => void }) { return <button className="quick-action" onClick={onClick}><span className="quick-icon"><QuickIcon size={17} /></span><strong>{title}</strong><ChevronRight size={16} /></button>; }
function PaymentRow({ name, amount, method, status }: { name: string; amount: string; method: string; status: string }) { return <div className="payment-row"><span className="avatar">{name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span><span><strong>{name}</strong><small>{method}</small></span><b>{amount}</b><span className={`status-pill ${status === 'Confirmé' ? 'green' : 'amber'}`}>{status}</span></div>; }

function StudentsPage({ students, role, totalStudentCount, onAdd, onToast }: { students: Student[]; role: Role; totalStudentCount: number; onAdd: (name: string, className: string) => void; onToast: (message: string) => void }) {
  const [query, setQuery] = useState(''); const [showForm, setShowForm] = useState(false); const [name, setName] = useState(''); const [className, setClassName] = useState('6ème primaire A');
  const filtered = students.filter((student) => `${student.name} ${student.className}`.toLowerCase().includes(query.toLowerCase()));
  const submit = (event: FormEvent) => { event.preventDefault(); if (!name.trim()) return; onAdd(name.trim(), className); setName(''); setShowForm(false); };
  return <><PageIntro eyebrow="Élèves · Année scolaire 2026–2027" title="Élèves" subtitle={`${totalStudentCount.toLocaleString('fr-FR')} élèves inscrits dans votre établissement.`} action={<div className="action-group"><button className="button secondary" onClick={() => onToast('Le module d’import XLSX/CSV est prêt pour la prochaine étape.')}><Upload size={17} /> Importer Excel / CSV</button><button className="button primary" onClick={() => setShowForm((value) => !value)}><Plus size={17} /> Ajouter un élève</button></div>} />{showForm && <form className="inline-form panel" onSubmit={submit}><div><p className="eyebrow">Nouvelle inscription</p><h2>Ajouter un élève</h2></div><label>Nom complet<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Sarah Kabeya" autoFocus /></label><label>Classe<select value={className} onChange={(event) => setClassName(event.target.value)}><option>6ème primaire A</option><option>6ème primaire B</option><option>5ème primaire A</option><option>4ème primaire B</option></select></label><div className="form-actions"><button type="button" className="button secondary" onClick={() => setShowForm(false)}>Annuler</button><button className="button primary" type="submit">Enregistrer l’élève</button></div></form>}<section className="panel table-panel"><div className="table-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un élève…" /></div><div className="toolbar-actions"><button className="filter-button"><SlidersHorizontal size={16} /> Toutes les classes</button><button className="filter-button"><SlidersHorizontal size={16} /> Statut</button><button className="icon-button"><Download size={17} /></button></div></div><div className="table-meta"><span><strong>{filtered.length}</strong> résultats</span><span className="muted">Les données sont filtrées selon vos permissions · {roleLabels[role]}</span></div><div className="students-table"><div className="table-head"><span>Élève</span><span>Classe</span><span>Présence</span><span>Solde scolaire</span><span>Statut</span><span /></div>{filtered.map((student) => <div className="table-row" key={student.id}><span className="student-cell"><span className="avatar">{student.initials}</span><span><strong>{student.name}</strong><small>Né le 14/03/2013 · ID ZN-{String(student.id).padStart(4, '0')}</small></span></span><span>{student.className}</span><span><strong>{student.attendance}%</strong><div className="mini-progress"><span style={{ width: `${student.attendance}%` }} /></div></span><span className={student.balance === 'À jour' ? 'positive-text' : 'warning-text'}>{student.balance}</span><span><span className={`status-pill ${student.status === 'Actif' ? 'green' : 'amber'}`}>{student.status}</span></span><button className="row-more" aria-label={`Options pour ${student.name}`}><MoreHorizontal size={18} /></button></div>)}</div><div className="pagination"><span>Affichage de 1 à {filtered.length} sur {totalStudentCount.toLocaleString('fr-FR')} élèves</span><div><button className="page-number active">1</button><button className="page-number">2</button><button className="page-number">3</button><button className="page-number"><ChevronRight size={15} /></button></div></div></section></>;
}

function AttendancePage({ attendance, setAttendance, saved, onSave }: { attendance: Record<number, AttendanceStatus>; setAttendance: (value: Record<number, AttendanceStatus>) => void; saved: boolean; onSave: () => void }) {
  const counts = Object.values(attendance).reduce((acc, status) => ({ ...acc, [status]: acc[status] + 1 }), { present: 0, late: 0, absent: 0 });
  return <><PageIntro eyebrow="Présences · Mathématiques · 6ème primaire A" title="Appel — 08:00" subtitle="Mardi 12 novembre 2026 · Patrick Ilunga" action={<span className="sync-badge"><span className="sync-dot" /> Enregistré sur cet appareil</span>} /><div className="attendance-stats"><StatBox value={String(counts.present)} label="présents" tone="green" /><StatBox value={String(counts.absent)} label="absents" tone="red" /><StatBox value={String(counts.late)} label="en retard" tone="amber" /></div><section className="panel attendance-panel"><div className="panel-heading"><div><p className="eyebrow">32 élèves · présence par défaut</p><h2>Marquer l’appel</h2></div><span className="status-pill neutral"><Clock3 size={14} /> Dernière sauvegarde 07:58</span></div><div className="attendance-list">{attendanceRoster.map((student) => <div className="attendance-row" key={student.id}><span className="avatar">{student.initials}</span><span><strong>{student.name}</strong><small>ID élève · ZN-{String(student.id).padStart(4, '0')}</small></span><div className="attendance-buttons">{(['present', 'late', 'absent'] as AttendanceStatus[]).map((status) => <button key={status} className={`${attendance[student.id] === status ? `selected ${status}` : ''}`} onClick={() => setAttendance({ ...attendance, [student.id]: status })}>{status === 'present' ? 'P' : status === 'late' ? 'R' : 'A'}<span>{status === 'present' ? 'Présent' : status === 'late' ? 'Retard' : 'Absent'}</span></button>)}</div></div>)}</div><div className="attendance-footer"><span><ShieldCheck size={16} /> Les changements sont sauvegardés localement en cas de coupure.</span><button className="button primary" onClick={onSave}>{saved ? <Check size={17} /> : <ClipboardCheck size={17} />} {saved ? 'Appel enregistré' : 'Valider l’appel'}</button></div></section></>;
}
function StatBox({ value, label, tone }: { value: string; label: string; tone: string }) { return <div className={`stat-box ${tone}`}><strong>{value}</strong><span>{label}</span></div>; }

function GradesPage({ onToast }: { onToast: (message: string) => void }) { return <><PageIntro eyebrow="Académique · Notes" title="Saisie des notes" subtitle="1er trimestre · Évaluation T1 · Mathématiques · 6ème primaire A" action={<button className="button primary" onClick={() => onToast('Les notes sont prêtes à être soumises pour validation.')}><CheckCircle2 size={17} /> Soumettre pour validation</button>} /><div className="grades-layout"><section className="panel table-panel"><div className="table-toolbar"><div><p className="eyebrow">28 élèves</p><h2>Évaluation T1</h2></div><button className="filter-button"><Download size={16} /> Exporter</button></div><div className="grades-table"><div className="table-head"><span>Élève</span><span>Note /20</span><span>Appréciation</span><span>Statut</span></div>{['Jean Dupont', 'Marie Claire', 'Paul Pogba', 'Sophie Martin', 'Lucas Dubois'].map((name, index) => <div className="table-row" key={name}><span className="student-cell"><span className="avatar">{name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{name}</strong><small>6ème primaire A</small></span></span><input className="grade-input" defaultValue={String([15, 13, 17, 11, 16][index])} /><span className="muted">{index === 3 ? 'Peut mieux faire' : index === 1 ? 'Satisfaisant' : 'Très bon travail'}</span><span className="status-pill neutral">Brouillon</span></div>)}</div></section><aside className="panel grade-summary"><p className="eyebrow">Résumé</p><h2>Performance de la classe</h2><div className="summary-number">14,2<span>/20</span></div><div className="summary-line"><span>Notes saisies</span><strong>24 / 28</strong></div><div className="summary-line"><span>Moyenne précédente</span><strong>13,8 /20</strong></div><div className="summary-line"><span>À revoir</span><strong className="warning-text">2 élèves</strong></div><div className="notice blue"><Sparkles size={16} /><span>4 notes restent à compléter avant la validation.</span></div></aside></div></>; }

function TimetablePage({ onToast }: { onToast: (message: string) => void }) { const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']; return <><PageIntro eyebrow="Planning · 6ème primaire A" title="Emploi du temps" subtitle="Année scolaire 2026–2027 · Trimestre 1" action={<div className="action-group"><button className="button secondary" onClick={() => onToast('La version imprimable sera générée ici.')}><Download size={17} /> Imprimer</button><button className="button primary" onClick={() => onToast('Création d’un créneau — vérification des conflits activée.')}><Plus size={17} /> Ajouter un créneau</button></div>} /><section className="panel timetable-panel"><div className="conflict-banner"><AlertTriangle size={18} /><span><strong>Conflit de planification détecté</strong><small>Patrick est déjà assigné à la classe 6B lundi à 10:00. Résolvez ce conflit avant d’enregistrer.</small></span><button className="text-button" onClick={() => onToast('Le conflit est ouvert pour résolution.')}>Résoudre</button></div><div className="timetable-grid"><div className="time-column"><span /><span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span></div>{days.map((day, index) => <div className="day-column" key={day}><strong>{day}</strong><div className="time-slot"><span className="lesson blue-lesson">Mathématiques<small>Patrick · Salle 12</small></span></div><div className="time-slot">{index < 3 && <span className="lesson violet-lesson">Français<small>Marie · Salle 4</small></span>}</div><div className="time-slot" /><div className="time-slot">{index === 1 && <span className="lesson amber-lesson">Sciences<small>David · Salle 8</small></span>}</div><div className="time-slot" /></div>)}</div></section></>; }

function FinancePage({ onToast }: { onToast: (message: string) => void }) { return <><PageIntro eyebrow="Finances · Année scolaire 2026–2027" title="Suivi des frais scolaires" subtitle="Vue consolidée des soldes et encaissements de l’établissement." action={<div className="action-group"><button className="button secondary" onClick={() => onToast('Le rapport financier est prêt à être exporté.')}><Download size={17} /> Exporter</button><button className="button primary" onClick={() => onToast('Formulaire de paiement ouvert.')}><Plus size={17} /> Enregistrer un paiement</button></div>} /><div className="metrics-grid three"><Metric label="Total à recouvrer" value="4,25M FC" trend="↓ 15 élèves en retard" icon={ReceiptText} tone="amber" /><Metric label="Perçu ce mois" value="18,4M FC" trend="↑ +6% vs octobre" icon={CircleDollarSign} tone="green" /><Metric label="Taux de recouvrement" value="78%" trend="Objectif trimestre : 85%" icon={WalletCards} tone="blue" /></div><section className="panel table-panel"><div className="table-toolbar"><div><p className="eyebrow">Détails par étudiant</p><h2>Soldes élèves</h2></div><div className="search-field compact"><Search size={16} /><input placeholder="Rechercher…" /></div></div><div className="payment-table"><div className="table-head"><span>Élève</span><span>Classe</span><span>Frais du trimestre</span><span>Payé</span><span>Solde</span><span>Statut</span></div>{initialStudents.slice(0, 5).map((student, index) => <div className="table-row" key={student.id}><span className="student-cell"><span className="avatar">{student.initials}</span><strong>{student.name}</strong></span><span>{student.className}</span><span>{index === 1 ? '850 000 FC' : '1 200 000 FC'}</span><span>{index === 1 ? '730 000 FC' : '1 200 000 FC'}</span><span className={student.balance === 'À jour' ? 'positive-text' : 'warning-text'}>{student.balance === 'À jour' ? '0 FC' : student.balance}</span><span className={`status-pill ${student.balance === 'À jour' ? 'green' : 'amber'}`}>{student.balance === 'À jour' ? 'Soldé' : 'En attente'}</span></div>)}</div></section></>; }

function StaffPage({ onToast }: { onToast: (message: string) => void }) { return <><PageIntro eyebrow="Administration · Personnel" title="Personnel" subtitle="73 enseignants · 4 secrétaires · 2 comptables" action={<button className="button primary" onClick={() => onToast('Invitation d’un membre du personnel ouverte.')}><UserPlus size={17} /> Ajouter un membre</button>} /><div className="staff-grid"><StaffCard initials="PI" name="Patrick Ilunga" role="Enseignant · Mathématiques" detail="Classes 6A, 6B · Titulaire 6A" status="A commencé sa journée" tone="green" /><StaffCard initials="MK" name="Marie Kabongo" role="Enseignante · Français" detail="Classes 6A, 5A" status="Disponible" tone="blue" /><StaffCard initials="CM" name="Chantal Mwamba" role="Secrétaire" detail="Inscriptions · Documents" status="Dossier à traiter" tone="amber" /><StaffCard initials="JM" name="Joseph Mbala" role="Comptable" detail="Paiements · Rapports" status="Disponible" tone="green" /></div></>; }
function StaffCard({ initials, name, role, detail, status, tone }: { initials: string; name: string; role: string; detail: string; status: string; tone: string }) { return <div className="panel staff-card"><div className="staff-card-head"><span className="avatar large">{initials}</span><button className="row-more"><MoreHorizontal size={18} /></button></div><h2>{name}</h2><p>{role}</p><small>{detail}</small><div className={`staff-status ${tone}`}><span />{status}</div></div>; }

function ClassesPage({ onNavigate }: { onNavigate: (view: View) => void }) { return <><PageIntro eyebrow="Classes · 42 actives" title="Vos classes" subtitle="Structure académique de Complexe Scolaire La Sagesse." action={<button className="button primary" onClick={() => onNavigate('settings')}><Plus size={17} /> Ajouter une classe</button>} /><div className="class-grid"><ClassCard name="6ème primaire A" titular="Patrick Ilunga" students="32 élèves" subjects="8 matières" onClick={() => onNavigate('attendance')} /><ClassCard name="6ème primaire B" titular="Marie Kabongo" students="30 élèves" subjects="8 matières" onClick={() => onNavigate('grades')} /><ClassCard name="5ème primaire A" titular="David Kanku" students="28 élèves" subjects="7 matières" /><ClassCard name="4ème primaire B" titular="Sarah Kabeya" students="29 élèves" subjects="7 matières" /></div><section className="panel info-panel"><CalendarRange size={22} /><div><strong>Structure configurée pour cette école</strong><p>Primaire · 1ère à 6ème primaire · 42 classes actives. Les niveaux non activés restent masqués.</p></div><button className="text-button" onClick={() => onNavigate('settings')}>Gérer la structure <ChevronRight size={15} /></button></section></>; }
function ClassCard({ name, titular, students, subjects, onClick }: { name: string; titular: string; students: string; subjects: string; onClick?: () => void }) { return <button className="panel class-card" onClick={onClick}><div className="class-card-top"><span className="class-icon"><Building2 size={20} /></span><span className="status-pill green">Active</span></div><h2>{name}</h2><p>Titulaire : {titular}</p><div className="class-card-meta"><span>{students}</span><span>{subjects}</span></div><ChevronRight size={17} /></button>; }

function SettingsPage({ onToast }: { onToast: (message: string) => void }) { return <><PageIntro eyebrow="Configuration de l’établissement" title="Paramètres" subtitle="Les règles de votre école, réunies au même endroit." /><div className="settings-grid"><section className="panel settings-list"><SettingRow icon={Building2} title="Identité de l’établissement" detail="Nom, logo, adresse et contacts" onClick={() => onToast('Identité de l’établissement sélectionnée.')} /><SettingRow icon={GraduationCap} title="Structure académique" detail="Primaire · 1ère à 6ème primaire" onClick={() => onToast('Structure académique sélectionnée.')} /><SettingRow icon={CalendarRange} title="Année scolaire" detail="2026–2027 · Trimestre 1 en cours" onClick={() => onToast('L’année scolaire reste accessible dans l’historique.')} /><SettingRow icon={ShieldCheck} title="Rôles et permissions" detail="4 rôles configurés · accès contrôlés côté serveur" onClick={() => onToast('La gestion fine des permissions arrive dans la prochaine étape.')} /><SettingRow icon={Archive} title="Historique et archivage" detail="Les années précédentes sont conservées" onClick={() => onToast('Aucune donnée historique ne sera supprimée.')} /></section><aside className="panel settings-aside"><div className="setting-logo">Z</div><p className="eyebrow">Complexe Scolaire La Sagesse</p><h2>Votre école, à votre façon.</h2><p>Les niveaux et modules visibles s’adaptent à la structure configurée de l’établissement.</p><div className="notice green"><CheckCircle2 size={16} /><span>Isolation des données activée</span></div></aside></div></>; }
function SettingRow({ icon: SettingIcon, title, detail, onClick }: { icon: Icon; title: string; detail: string; onClick: () => void }) { return <button className="setting-row" onClick={onClick}><span className="setting-icon"><SettingIcon size={18} /></span><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={17} /></button>; }

export default App;
