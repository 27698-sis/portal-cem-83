// 
import * as React from 'react';
import { useState, useMemo, useEffect, useRef, memo, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { documents, Document, Category } from './data/documents';
import { Timeline } from './components/Timeline';
import { DocumentDetail } from './components/DocumentDetail';
import { Sidebar } from './components/Sidebar';
import { ProcessOverview } from './components/ProcessOverview';
import { SearchWindow } from './components/dashboard/SearchWindow';
import { BookOpen, Info, Menu, X, Search, ChevronDown, Calendar, LayoutDashboard, History, Sparkles, FileText, Settings, Bell, AlertCircle, Users, ShieldCheck, LockKeyhole, Monitor } from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { db } from './lib/firebase';

import { PlanningTemplate } from './components/PlanningTemplate';
import { NormativaFederal } from './components/NormativaFederal';
import { AdminDashboard } from './components/AdminDashboard';
import { CoordinatorDashboard } from './components/CoordinatorDashboard';
import { Chatbot } from './components/Chatbot';

// Memoize sub-components to prevent unnecessary re-renders
const MemoizedSidebar = memo(Sidebar);
const MemoizedTimeline = memo(Timeline);
const MemoizedProcessOverview = memo(ProcessOverview);
const MemoizedPlanningTemplate = memo(PlanningTemplate);
const MemoizedNormativaFederal = memo(NormativaFederal);
const MemoizedAdminDashboard = memo(AdminDashboard);
const MemoizedCoordinatorDashboard = memo(CoordinatorDashboard);
const MemoizedChatbot = memo(Chatbot);
const MemoizedDocumentDetail = memo(DocumentDetail);
const MemoizedSearchWindow = memo(SearchWindow);

export default function App() {
  console.log('App rendering');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'public' | 'home' | 'planning' | 'federal' | 'admin' | 'coordinator'>('public');
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [isRestrictedModalOpen, setIsRestrictedModalOpen] = useState(false);
  const [restrictedRole, setRestrictedRole] = useState<'docentes' | 'preceptoria' | 'directivo' | null>(null);
  const [doc_code, setDocCode] = useState('');
  const [doc_error, setDocError] = useState('');
  const [prec_code, setPrecCode] = useState('');
  const [prec_error, setPrecError] = useState('');
  const [dir_code, setDirCode] = useState('');
  const [dir_error, setDirError] = useState('');
  const [isCoordModalOpen, setIsCoordModalOpen] = useState(false);
  const [coordCode, setCoordCode] = useState('');
  const [coordError, setCoordError] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [publicNotifications, setPublicNotifications] = useState<any[]>([]);
  const [isPublicNotifModalOpen, setIsPublicNotifModalOpen] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      deferredPromptRef.current = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const CONFIG_CODES = {
    docentes: '76341',
    preceptoria: '35462',
    directivo: '87653',
    coordinacion: '5522'
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const session = localStorage.getItem('cem83_session');
    if (session) {
      setSessionRole(session);
      if (session === 'directivo') {
        setCurrentView('admin');
      } else if (session === 'coordinator') {
        setCurrentView('coordinator');
      } else {
        setCurrentView('home');
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return documents.filter((doc) => {
      const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
      const matchesSearch = doc.title.toLowerCase().includes(query) || 
                           doc.summary.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleRestrictedLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (restrictedRole === 'docentes' && doc_code === CONFIG_CODES.docentes) {
      setIsRestrictedModalOpen(false);
      setCurrentView('home');
      localStorage.setItem('cem83_session', 'docentes');
      setSessionRole('docentes');
      setDocCode('');
      setDocError('');
      setRestrictedRole(null);
    } else if (restrictedRole === 'preceptoria' && prec_code === CONFIG_CODES.preceptoria) {
      setIsRestrictedModalOpen(false);
      setCurrentView('home');
      localStorage.setItem('cem83_session', 'preceptoria');
      setSessionRole('preceptoria');
      setPrecCode('');
      setPrecError('');
      setRestrictedRole(null);
    } else if (restrictedRole === 'directivo' && dir_code === CONFIG_CODES.directivo) {
      setIsRestrictedModalOpen(false);
      setCurrentView('admin');
      localStorage.setItem('cem83_session', 'directivo');
      setSessionRole('directivo');
      setDirCode('');
      setDirError('');
      setRestrictedRole(null);
    } else {
      if (restrictedRole === 'docentes') setDocError('Código incorrecto');
      if (restrictedRole === 'preceptoria') setPrecError('Código incorrecto');
      if (restrictedRole === 'directivo') setDirError('Código incorrecto');
    }
  }, [restrictedRole, doc_code, prec_code, dir_code]);

  const handleCoordLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (coordCode === CONFIG_CODES.coordinacion) {
      setIsCoordModalOpen(false);
      setCurrentView('coordinator');
      setSessionRole('coordinator');
      localStorage.setItem('cem83_session', 'coordinator');
      setCoordCode('');
      setCoordError('');
      localStorage.setItem('epja_last_seen_obs', Date.now().toString());
      setShowNotification(false);
    } else {
      setCoordError('Código incorrecto');
    }
  }, [coordCode]);

  const lastNotifiedTimeRef = useRef<number>(0);

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const storedPlannings = localStorage.getItem('epja_plannings');
        const plannings = storedPlannings ? JSON.parse(storedPlannings) : [];
        const observed = plannings.filter((p: any) => p.status === 'Observado' && p.observations && p.observations.length > 0);
        
        const lastSeenObs = localStorage.getItem('epja_last_seen_obs') || '0';
        const latestObsTime = observed.length > 0 
          ? Math.max(...observed.flatMap((p: any) => p.observations.map((o: any) => o.date))) 
          : 0;
        
        if (latestObsTime > parseInt(lastSeenObs) && latestObsTime > lastNotifiedTimeRef.current) {
          setNotifications(observed);
          setShowNotification(true);
          lastNotifiedTimeRef.current = latestObsTime;
        }
      } catch (e) {
        console.error(e);
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'notificaciones'), where('activa', '==', true), orderBy('fecha', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => {
        const data = doc.data();
        const fecha = data.fecha?.toDate ? data.fecha.toDate().toLocaleDateString('es-AR') : (data.fecha || new Date().toLocaleDateString('es-AR'));
        return { id: doc.id, ...data, fecha };
      });
      setPublicNotifications(notifs);
    });
    return () => unsubscribe();
  }, []);


  return (
    <div className="min-h-screen bg-valle-sand text-valle-stone font-sans selection:bg-patagonia-sky/20 selection:text-patagonia-sky overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-zinc-200/50 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsCoordModalOpen(true)}
                className="relative flex items-center gap-2 px-3 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors"
                title="Coordinación"
              >
                <Settings size={16} />
                <span className="hidden sm:inline">Coordinación</span>
                {showNotification && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-patagonia-red rounded-full animate-pulse border-2 border-white" />
                )}
              </button>
              <button
                onClick={() => {
                  const session = localStorage.getItem('cem83_session');
                  if (session === 'directivo') {
                    setCurrentView('admin');
                  } else {
                    setCurrentView(session ? 'home' : 'public');
                  }
                  setSelectedCategory('All');
                }}
                className="flex items-center gap-4 cursor-pointer group ml-2"
              >
                <div className="w-12 h-12 bg-valle-wine rounded-2xl flex items-center justify-center shadow-xl shadow-valle-wine/20 group-hover:scale-110 transition-transform">
                  <BookOpen className="text-white" size={28} />
                </div>
                <div className="hidden sm:block text-left">
                  <h1 className="text-xl font-bold tracking-tight text-valle-stone font-serif italic">Portal Educativo EPJA</h1>
                  <p className="text-xs font-medium text-valle-green uppercase tracking-[0.2em]">Río Negro • Norpatagonia</p>
                </div>
              </button>
            </div>

              {currentView !== 'public' && (
                <nav className="hidden lg:flex items-center gap-8">
                  <button 
                    onClick={() => {
                      const session = localStorage.getItem('cem83_session');
                      if (session === 'directivo') {
                        setCurrentView('admin');
                      } else {
                        setCurrentView(session ? 'home' : 'public');
                      }
                      setSelectedCategory('All');
                    }}
                    className={`text-xs font-black uppercase tracking-widest transition-colors ${currentView === 'home' ? 'text-valle-wine' : 'text-zinc-400 hover:text-valle-stone'}`}
                  >
                    Normativa
                  </button>
                  <button 
                    onClick={() => {
                      const session = localStorage.getItem('cem83_session');
                      if (!session) {
                        setIsRestrictedModalOpen(true);
                        return;
                      }
                      setCurrentView('federal');
                    }}
                    className={`text-xs font-black uppercase tracking-widest transition-colors ${currentView === 'federal' ? 'text-valle-wine' : 'text-zinc-400 hover:text-valle-stone'}`}
                  >
                    Normativa Federal
                  </button>
                  <button 
                    onClick={() => {
                      const session = localStorage.getItem('cem83_session');
                      if (!session) {
                        setIsRestrictedModalOpen(true);
                        return;
                      }
                      setCurrentView('planning');
                    }}
                    className={`text-xs font-black uppercase tracking-widest transition-colors ${currentView === 'planning' ? 'text-valle-wine' : 'text-zinc-400 hover:text-valle-stone'}`}
                  >
                    Plantilla de Planificación
                  </button>
                </nav>
              )}

            <div className="flex items-center gap-3 sm:gap-8">
              {currentView !== 'public' && (
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="hidden md:flex items-center gap-3 px-4 py-2 bg-zinc-100/50 border border-zinc-200/50 rounded-2xl text-zinc-400 hover:text-valle-stone hover:bg-white hover:border-zinc-300 transition-all w-72 shadow-sm group"
                >
                  <Search size={18} className="group-hover:text-valle-wine transition-colors" />
                  <span className="text-sm flex-1 text-left">Buscar normativa...</span>
                  <span className="text-[10px] font-mono bg-white px-2 py-1 rounded-lg border border-zinc-200 shadow-sm">⌘K</span>
                </button>
              )}

              {/* Mobile search icon */}
              {currentView !== 'public' && (
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="md:hidden p-2 text-zinc-500 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  <Search size={20} />
                </button>
              )}
              
              {currentView === 'public' && publicNotifications.length > 0 && (
                <button
                  onClick={() => setIsPublicNotifModalOpen(true)}
                  className="relative p-2 text-patagonia-red hover:bg-patagonia-red/5 rounded-xl transition-all animate-pulse"
                  title="Notificaciones"
                >
                  <Bell size={20} />
                  <span className="absolute top-1 right-1 w-3 h-3 bg-patagonia-red rounded-full border-2 border-white" />
                </button>
              )}
              
              {sessionRole ? (
                <button
                  onClick={() => {
                    localStorage.removeItem('cem83_session');
                    setSessionRole(null);
                    setCurrentView('public');
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-[10px] sm:text-xs font-bold hover:bg-zinc-200 transition-colors"
                >
                  Cerrar Sesión
                </button>
              ) : (
                <button
                  onClick={() => setIsRestrictedModalOpen(true)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-zinc-200 text-zinc-900 rounded-xl text-[10px] sm:text-xs font-bold hover:bg-zinc-300 transition-colors shadow-sm"
                >
                  <LockKeyhole size={14} />
                  Acceso Restringido
                </button>
              )}
            </div>

            {currentView !== 'public' && (
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 text-zinc-500 hover:bg-zinc-100 rounded-xl transition-colors"
              >
                {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Push Notification Toast */}
      <AnimatePresence>
        {showNotification && currentView !== 'coordinator' && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-24 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-patagonia-yellow/20 p-4 max-w-sm flex gap-4 items-start cursor-pointer hover:bg-patagonia-yellow/5 transition-colors will-change-transform"
            onClick={() => setIsCoordModalOpen(true)}
          >
            <div className="w-10 h-10 bg-patagonia-yellow/10 text-patagonia-yellow rounded-full flex items-center justify-center flex-shrink-0">
              <Bell size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-zinc-900 mb-1">Nueva Observación</h4>
              <p className="text-xs text-zinc-600">El equipo directivo ha realizado observaciones en una planificación.</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowNotification(false);
              }}
              className="text-zinc-400 hover:text-zinc-900"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restricted Access Modal */}
      <AnimatePresence>
        {isRestrictedModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl will-change-transform"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900">
                  {restrictedRole === null ? 'Seleccione su Rol' : 
                   restrictedRole === 'docentes' ? 'Docentes' :
                   restrictedRole === 'directivo' ? 'Equipo Directivo' : 'Preceptoría'}
                </h3>
                <button 
                  onClick={() => {
                    if (restrictedRole !== null) {
                      setRestrictedRole(null);
                      setDocCode(''); setDocError('');
                      setPrecCode(''); setPrecError('');
                      setDirCode(''); setDirError('');
                    } else {
                      setIsRestrictedModalOpen(false);
                      setRestrictedRole(null);
                      setDocCode(''); setDocError('');
                      setPrecCode(''); setPrecError('');
                      setDirCode(''); setDirError('');
                    }
                  }}
                  className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {restrictedRole === null ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setRestrictedRole('docentes')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-200 hover:border-valle-wine hover:bg-valle-wine/5 transition-all text-left group"
                  >
                    <div className="w-12 h-12 bg-valle-wine/10 text-valle-wine rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">Docentes</h4>
                      <p className="text-xs text-zinc-500">Acceso a normativa y planificaciones</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setRestrictedRole('preceptoria')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-200 hover:border-valle-green hover:bg-valle-green/5 transition-all text-left group"
                  >
                    <div className="w-12 h-12 bg-valle-green/10 text-valle-green rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">Preceptoría</h4>
                      <p className="text-xs text-zinc-500">Gestión de estudiantes y asistencia</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setRestrictedRole('directivo')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-zinc-200 hover:border-patagonia-sky hover:bg-patagonia-sky/5 transition-all text-left group"
                  >
                    <div className="w-12 h-12 bg-patagonia-sky/10 text-patagonia-sky rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">Equipo Directivo</h4>
                      <p className="text-xs text-zinc-500">Gestión de planificaciones y reportes</p>
                    </div>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRestrictedLogin}>
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-zinc-700 mb-2">
                      Código de Acceso
                    </label>
                    <input
                      type="password"
                      value={restrictedRole === 'docentes' ? doc_code : restrictedRole === 'preceptoria' ? prec_code : dir_code}
                      onChange={(e) => {
                        if (restrictedRole === 'docentes') setDocCode(e.target.value);
                        if (restrictedRole === 'preceptoria') setPrecCode(e.target.value);
                        if (restrictedRole === 'directivo') setDirCode(e.target.value);
                      }}
                      placeholder="Ingrese el código"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-patagonia-yellow focus:border-transparent outline-none transition-all"
                      autoFocus
                    />
                    {(doc_error || prec_error || dir_error) && (
                      <p className="text-patagonia-red text-xs font-bold mt-2">
                        {restrictedRole === 'docentes' ? doc_error : restrictedRole === 'preceptoria' ? prec_error : dir_error}
                      </p>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-valle-wine text-white rounded-xl py-3 font-bold text-sm hover:bg-valle-wine/90 transition-colors shadow-lg shadow-valle-wine/20"
                  >
                    Ingresar
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Coord Login Modal */}
      <AnimatePresence>
        {isCoordModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl will-change-transform"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900">Acceso Coordinación</h3>
                <button 
                  onClick={() => {
                    setIsCoordModalOpen(false);
                    setCoordError('');
                    setCoordCode('');
                  }}
                  className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCoordLogin}>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-zinc-700 mb-2">
                    Código de Acceso
                  </label>
                  <input
                    type="password"
                    value={coordCode}
                    onChange={(e) => setCoordCode(e.target.value)}
                    placeholder="Ingrese el código"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                    autoFocus
                  />
                  {coordError && (
                    <p className="text-patagonia-red text-xs font-bold mt-2">{coordError}</p>
                  )}
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-zinc-900 text-white rounded-xl py-3 font-bold text-sm hover:bg-zinc-800 transition-colors"
                >
                  Ingresar
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 will-change-transform">
        <AnimatePresence mode="wait">
          {currentView === 'public' ? (
            <motion.div key="public" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="relative mb-20 rounded-[2.5rem] bg-zinc-950 overflow-hidden shadow-2xl border border-zinc-800">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 z-0 opacity-10">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                  </div>
                  <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[70%] rounded-full bg-valle-green/10 blur-[60px] will-change-[filter]" />
                  <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[70%] rounded-full bg-patagonia-sky/10 blur-[60px] will-change-[filter]" />
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
                </div>

                <div className="relative z-10 px-6 py-20 md:py-28 text-center max-w-4xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/10 text-zinc-300 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-8"
                  >
                    <span className="w-1.5 h-1.5 bg-valle-green rounded-full animate-pulse" />
                    Plataforma de Gestión Académica
                  </motion.div>
                  
                  <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight font-serif"
                  >
                    PORTAL EDUCATIVO <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-valle-green to-valle-wine italic font-light">
                      CEM 83
                    </span>
                  </motion.h2>
                  
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg md:text-xl text-zinc-400 leading-relaxed font-light max-w-2xl mx-auto"
                  >
                    Bienvenidos al espacio digital del Centro de Educación Media N° 83 de Villa Regina. Aquí encontrarás información institucional, recursos y canales de comunicación de tu colegio.
                  </motion.p>

                  {/* No buttons in public hero */}
                </div>
              </div>

              {/* Institutional Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
                {[
                  { title: 'Secretaría', icon: FileText, desc: 'Trámites y constancias', color: 'text-patagonia-sky', bg: 'bg-patagonia-sky/10' },
                  { title: 'Preceptoría', icon: Users, desc: 'Asistencia y seguimiento', color: 'text-valle-green', bg: 'bg-valle-green/10' },
                  { title: 'Biblioteca', icon: BookOpen, desc: 'Material de estudio', color: 'text-patagonia-yellow', bg: 'bg-patagonia-yellow/10' },
                  { title: 'Informática', icon: Monitor, desc: 'Soporte y recursos TIC', color: 'text-patagonia-red', bg: 'bg-patagonia-red/10' },
                  { title: 'Aula Virtual', icon: LayoutDashboard, desc: 'Plataforma educativa', color: 'text-valle-wine', bg: 'bg-valle-wine/10' }
                ].map((card, idx) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + idx * 0.1 }}
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                    className="group p-8 bg-white border border-zinc-100 rounded-[2.5rem] text-center shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300"
                  >
                    <div className={`w-20 h-20 ${card.bg} rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300`}>
                      <card.icon size={36} className={card.color} />
                    </div>
                    <h3 className="font-bold text-zinc-900 text-xl mb-3">{card.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed px-2">{card.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* Novedades Section */}
              <div className="max-w-7xl mx-auto px-4 mt-24">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h3 className="text-3xl font-bold text-valle-stone font-serif italic">Novedades Institucionales</h3>
                    <p className="text-zinc-500 mt-2">Comunicados recientes del equipo directivo</p>
                  </div>
                  <div className="h-px flex-1 bg-zinc-200 mx-8 hidden md:block" />
                  <Bell className="text-valle-wine" size={24} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {publicNotifications.length > 0 ? (
                    publicNotifications.map((notif, idx) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-2 h-2 bg-valle-green rounded-full animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{notif.fecha}</span>
                        </div>
                        <h4 className="font-bold text-valle-stone mb-2">{notif.titulo}</h4>
                        <p className="text-sm text-zinc-500 leading-relaxed line-clamp-3">{notif.mensaje}</p>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center bg-zinc-50 rounded-[3rem] border border-dashed border-zinc-200">
                      <Bell className="mx-auto text-zinc-300 mb-4" size={48} />
                      <p className="text-zinc-400 font-medium">No hay comunicados recientes</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : currentView === 'admin' ? (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MemoizedAdminDashboard />
            </motion.div>
          ) : currentView === 'coordinator' ? (
            <motion.div key="coord" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MemoizedCoordinatorDashboard />
            </motion.div>
          ) : currentView === 'home' ? (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Docente Header */}
              {sessionRole === 'docentes' && (
                <header className="mb-12">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-valle-wine text-white rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                    <BookOpen size={14} />
                    Panel Docente
                  </div>
                  <h2 className="text-4xl font-bold text-valle-stone font-serif italic tracking-tight mb-4">
                    Bienvenido, Docente
                  </h2>
                  <p className="text-zinc-500 text-lg max-w-2xl">
                    Acceda a la normativa federal, planificaciones y material de apoyo institucional.
                  </p>
                </header>
              )}

              {/* Recommended Reading Banner */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mb-24"
              >
                <div className="relative p-1 bg-gradient-to-r from-valle-green via-patagonia-sky to-valle-wine rounded-[3rem] shadow-2xl overflow-hidden">
                  <div className="bg-white rounded-[2.8rem] p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-valle-green/5 rounded-full blur-3xl -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-patagonia-sky/5 rounded-full blur-3xl -ml-20 -mb-20" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                      <div className="flex-1 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-patagonia-yellow/10 text-patagonia-yellow rounded-full text-xs font-black uppercase tracking-widest mb-6">
                          <Sparkles size={16} />
                          Material de la 1° Jornada 2026
                        </div>
                        <h3 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-6 font-serif italic leading-tight">
                          Lectura Recomendada: <br />
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-valle-green to-patagonia-sky">Nuevos Anexos de Resolución</span>
                        </h3>
                        <p className="text-zinc-600 text-lg font-medium leading-relaxed mb-8 max-w-xl">
                          Se sugiere la lectura de los tres anexos compartidos en la primera jornada docente de este año, los cuales consolidan la visión pedagógica y organizativa de la modalidad.
                        </p>
                        <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                          <button 
                            onClick={() => {
                              const el = document.getElementById('anexo-1-res-2026');
                              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              setSelectedDoc(documents.find(d => d.id === 'anexo-1-res-2026') || null);
                            }}
                            className="px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold text-sm hover:scale-105 transition-transform"
                          >
                            Explorar Material
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto">
                        {[
                          { id: 'anexo-1-res-2026', title: 'Anexo I', sub: 'Pedagogía' },
                          { id: 'anexo-2-res-2026', title: 'Anexo II', sub: 'Componentes' },
                          { id: 'anexo-3-res-2026', title: 'Anexo III', sub: 'Estructura' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              const doc = documents.find(d => d.id === item.id);
                              if (doc) setSelectedDoc(doc);
                            }}
                            className="group p-6 bg-zinc-50 border border-zinc-100 rounded-3xl text-center hover:border-valle-green/50 transition-all hover:shadow-xl"
                          >
                            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                              <FileText size={24} className="text-valle-green" />
                            </div>
                            <div className="font-black text-xs uppercase tracking-widest text-zinc-400 mb-1">{item.sub}</div>
                            <div className="font-bold text-zinc-900">{item.title}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Process Steps Cards */}
              <section className="mb-32">
                <div className="flex items-center justify-between mb-12">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">El Proceso de Especificación</h3>
                  <div className="h-px flex-1 bg-zinc-200 mx-8" />
                </div>
                <MemoizedProcessOverview />
              </section>

              <div className="flex flex-col lg:flex-row gap-20">
                {/* Sidebar Overlay for Mobile */}
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-30 lg:hidden"
                      onClick={() => setIsSidebarOpen(false)}
                    />
                  )}
                </AnimatePresence>

                {/* Sidebar */}
                <aside className={`
                  fixed lg:sticky lg:top-32 z-40 inset-y-0 left-0 w-80 bg-[#FDFCFB] p-8 lg:p-0
                  transform transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto
                  ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
                `}>
                  <div className="lg:hidden flex justify-between items-center mb-8">
                    <h2 className="text-lg font-bold text-zinc-900">Menú</h2>
                    <button 
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="lg:hidden mb-8">
                    {sessionRole ? (
                      <button
                        onClick={() => {
                          localStorage.removeItem('cem83_session');
                          setSessionRole(null);
                          setCurrentView('public');
                          setIsSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-100 text-zinc-600 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-colors"
                      >
                        Cerrar Sesión
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsRestrictedModalOpen(true);
                          setIsSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-200 text-zinc-900 rounded-xl text-sm font-bold hover:bg-zinc-300 transition-colors shadow-sm"
                      >
                        <LockKeyhole size={18} />
                        Acceso Restringido
                      </button>
                    )}
                  </div>

                  <MemoizedSidebar 
                    selectedCategory={selectedCategory}
                    onCategoryChange={(cat) => {
                      const session = localStorage.getItem('cem83_session');
                      if (cat === 'Planillas de Planificación') {
                        if (!session) {
                          setIsRestrictedModalOpen(true);
                        } else {
                          setCurrentView('planning');
                        }
                      } else if (cat === 'Normativa Federal') {
                        if (!session) {
                          setIsRestrictedModalOpen(true);
                        } else {
                          setCurrentView('federal');
                        }
                      } else {
                        if (session === 'directivo') {
                        setCurrentView('admin');
                      } else if (session === 'coordinator') {
                        setCurrentView('coordinator');
                      } else {
                        setCurrentView(session ? 'home' : 'public');
                      }
                        setSelectedCategory(cat);
                      }
                      setIsSidebarOpen(false);
                    }}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    currentView={currentView}
                  />
                </aside>

                {/* Timeline Area */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-16">
                    <h3 className="text-3xl font-bold text-zinc-900 font-serif italic">Línea del Tiempo</h3>
                    <div className="flex items-center gap-3 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] bg-zinc-100 px-5 py-2.5 rounded-full border border-zinc-200 w-fit">
                      <Calendar size={14} />
                      <span>Orden Cronológico</span>
                    </div>
                  </div>

                  {filteredDocuments.length > 0 ? (
                    <MemoizedTimeline 
                      documents={filteredDocuments} 
                      onSelect={setSelectedDoc}
                      selectedId={selectedDoc?.id}
                    />
                  ) : (
                    <div className="py-20 text-center bg-white border border-dashed border-zinc-200 rounded-3xl">
                      <BookOpen className="mx-auto text-zinc-300 mb-4" size={48} />
                      <h3 className="text-lg font-bold text-zinc-900">En proceso de carga de datos</h3>
                      <p className="text-zinc-500 mt-2">No encontramos documentos que coincidan con tu búsqueda.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : currentView === 'planning' ? (
            <motion.div key="planning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MemoizedPlanningTemplate />
            </motion.div>
          ) : (
            <motion.div key="federal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MemoizedNormativaFederal />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Search Window */}
      <MemoizedSearchWindow 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onSelect={(doc) => {
          setSelectedDoc(doc);
        }} 
      />

      {/* Document Detail Panel */}
      <AnimatePresence>
        {selectedDoc && (
          <React.Fragment key="doc-detail">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-50"
              onClick={() => setSelectedDoc(null)}
            />
            <MemoizedDocumentDetail 
              document={selectedDoc} 
              onClose={() => setSelectedDoc(null)} 
            />
          </React.Fragment>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-zinc-950 py-24 mt-32 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-valle-green/5 rounded-full blur-3xl -mt-48" />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-valle-green rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-valle-green/20">
                  <BookOpen className="text-white" size={28} />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white tracking-tight">CEM 83</h4>
                  <p className="text-[10px] font-black text-valle-green uppercase tracking-[0.3em]">Villa Regina • Río Negro</p>
                </div>
              </div>
              <p className="text-zinc-400 text-lg leading-relaxed max-w-md font-light">
                Centro de Educación Media N° 83. <br />
                Comprometidos con la formación integral de jóvenes y adultos en nuestra comunidad.
              </p>
            </div>

            <div>
              <h5 className="text-white font-bold text-sm uppercase tracking-widest mb-8">Navegación</h5>
              <ul className="space-y-4 text-sm text-zinc-500">
                <li><button onClick={() => setCurrentView('public')} className="hover:text-valle-green transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover:bg-valle-green transition-colors" /> Inicio</button></li>
                <li><button onClick={() => setIsRestrictedModalOpen(true)} className="hover:text-valle-green transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover:bg-valle-green transition-colors" /> Acceso Docente</button></li>
                <li><button onClick={() => setIsSearchOpen(true)} className="hover:text-valle-green transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover:bg-valle-green transition-colors" /> Buscador</button></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-bold text-sm uppercase tracking-widest mb-8">Contacto</h5>
              <ul className="space-y-6 text-sm text-zinc-500">
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center flex-shrink-0 border border-zinc-800">
                    <Info size={18} className="text-valle-green" />
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">Ubicación</p>
                    <p className="text-xs leading-relaxed">Villa Regina, Río Negro <br /> República Argentina</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center flex-shrink-0 border border-zinc-800">
                    <Calendar size={18} className="text-valle-green" />
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">Ciclo Lectivo</p>
                    <p className="text-xs">2026 • Modalidad EPJA</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="h-px bg-zinc-900 mb-12" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
            <div className="flex items-center gap-6">
              <p>© 2026 CEM 83 • Villa Regina</p>
              <div className="hidden sm:block w-1 h-1 bg-zinc-800 rounded-full" />
              <p className="hidden sm:block">Ministerio de Educación y Derechos Humanos</p>
            </div>
            <div className="flex gap-8">
              <a href="#" className="hover:text-valle-green transition-colors">Privacidad</a>
              <a href="#" className="hover:text-valle-green transition-colors">Términos</a>
            </div>
          </div>
        </div>
      </footer>
      {/* Public Notifications Modal */}
      <AnimatePresence>
        {isPublicNotifModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPublicNotifModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-200"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                      <Bell className="w-6 h-6 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900">Notificaciones</h2>
                  </div>
                  <button onClick={() => setIsPublicNotifModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-zinc-400" />
                  </button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {publicNotifications.map((notif) => (
                    <div key={notif.id} className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-zinc-900">{notif.titulo}</h3>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{notif.fecha}</span>
                      </div>
                      <p className="text-sm text-zinc-600 leading-relaxed">{notif.mensaje}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chatbot Integration */}
      <MemoizedChatbot />
    </div>
  );
}
