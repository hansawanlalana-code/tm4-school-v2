import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  OperationType, 
  handleFirestoreError 
} from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit
} from 'firebase/firestore';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  Upload, 
  Download, 
  Search, 
  X,
  Calendar,
  Filter, 
  ChevronRight, 
  User, 
  BookOpen, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Activity, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Moon, 
  Sun, 
  Lock, 
  Check, 
  FileUp, 
  DownloadCloud, 
  UploadCloud, 
  Bell, 
  FileCheck, 
  AlertCircle, 
  Clock,
  Video,
  Music,
  FolderOpen,
  Play,
  Folder,
  Save,
  RotateCcw,
  PlusCircle,
  Trash,
  Image,
  Camera,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FileSpreadsheet,
  PlayCircle
} from 'lucide-react';

// Predefined list of Subject Groups (กลุ่มสาระ)
const SUBJECT_GROUPS = [
  'วิทยาศาสตร์และเทคโนโลยี',
  'คณิตศาสตร์',
  'ภาษาไทย',
  'ภาษาต่างประเทศ',
  'สังคมศึกษา ศาสนา และวัฒนธรรม',
  'สุขศึกษาและพลศึกษา',
  'ศิลปะ',
  'การงานอาชีพ',
  'บริหารงานวิชาการ'
];

// Predefined positions (ตำแหน่ง)
const POSITIONS = [
  'ครูผู้ช่วย',
  'ครู',
  'ครู ค.ศ. 1',
  'ครู ค.ศ. 2',
  'ครู ค.ศ. 3',
  'หัวหน้าฝ่ายวิชาการ'
];

// Predefined Assignment Deadlines (วันครบกำหนดส่งงาน)
const ASSIGNMENT_DEADLINES: Record<string, { date: string; label: string }> = {
  'แผนการจัดการเรียนรู้': { date: '2026-08-31', label: '31 ส.ค. 2569' },
  'รายงานผลการสอน': { date: '2026-09-30', label: '30 ก.ย. 2569' },
  'โครงการวิชาการ': { date: '2026-10-31', label: '31 ต.ค. 2569' },
  'บันทึกการประชุม': { date: '2026-11-30', label: '30 พ.ย. 2569' },
  'อื่นๆ': { date: '2026-12-15', label: '15 ธ.ค. 2569' }
};

interface Teacher {
  id: string;
  name: string;
  email: string;
  password?: string;
  position: string;
  subjectGroup: string;
  profilePic: string;
  role: 'teacher' | 'academic';
  status: 'active' | 'inactive';
  createdAt?: string;
}

interface Submission {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherProfilePic: string;
  teacherSubjectGroup: string;
  title: string;
  description: string;
  type: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string; // base64 payload
  isChunked?: boolean;
  chunksCount?: number;
  status: 'pending_submission' | 'submitted' | 'checking' | 'needs_edit' | 'approved';
  comments?: string;
  submittedAt?: string;
  checkedAt?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

interface SystemSettings {
  id: string;
  schoolLogo: string;
  schoolName: string;
  websiteTitle: string;
  loginMessage: string;
  primaryColor: string;
  backgroundImage: string;
  allowedFileTypes: string[];
  maxFileSize: number; // in MB
  enableNotifications: boolean;
  deadlines?: Record<string, { date: string; label: string }>;
}

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  createdAt: string;
}

const formatTimeAgo = (isoString: string) => {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    return `${diffDays} วันที่แล้ว`;
  } catch {
    return '';
  }
};

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const firstChar = parts[0][0] || '';
    const lastChar = parts[1][0] || '';
    return (firstChar + lastChar).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const formatDateToThaiLabel = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      
      const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      
      const buddhistYear = year + 543;
      return `${day} ${thaiMonths[month - 1]} ${buddhistYear}`;
    }
  } catch (e) {
    console.error(e);
  }
  return dateStr;
};

const renderAvatar = (picUrl: string, name: string, sizeClass = "w-10 h-10 text-xs", roundedClass = "rounded-xl") => {
  const isDefaultAvatar = !picUrl || picUrl.includes('ui-avatars.com') || picUrl.includes('gravatar.com');
  if (isDefaultAvatar) {
    const initials = getInitials(name);
    return (
      <div className={`${sizeClass} ${roundedClass} flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-600 border border-white/20 shadow-sm text-white font-bold flex-shrink-0 select-none`}>
        {initials}
      </div>
    );
  }
  return (
    <div className={`${sizeClass} ${roundedClass} overflow-hidden border border-white/20 shadow bg-slate-100 flex-shrink-0`}>
      <img src={picUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    </div>
  );
};

export default function App() {
  // System configurations & settings state
  const [settings, setSettings] = useState<SystemSettings>({
    id: 'config',
    schoolLogo: 'https://ui-avatars.com/api/?name=T4&background=0284c7&color=fff&size=128',
    schoolName: 'โรงเรียนเทศบาล 4 (บ้านเชียงราย)',
    websiteTitle: 'ระบบส่งไฟล์งาน',
    loginMessage: 'ระบบตรวจสอบและส่งไฟล์วิชาการสำหรับครูและฝ่ายวิชาการ',
    primaryColor: '#0284c7', // Slate sky blue
    backgroundImage: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200&auto=format&fit=crop',
    allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'png', 'zip'],
    maxFileSize: 100,
    enableNotifications: true,
    deadlines: ASSIGNMENT_DEADLINES
  });

  const activeDeadlines = settings.deadlines || ASSIGNMENT_DEADLINES;

  // User Auth states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Teacher | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // App views
  const [currentTab, setCurrentTab] = useState('home'); // home, submissions, teachers, settings, logs, submitWork
  const [darkMode, setDarkMode] = useState(false);
  const [showNotificationCount, setShowNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Profile Edit modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    position: '',
    subjectGroup: '',
    profilePic: '',
    password: ''
  });

  // Main collections state
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Modals & UI helpers
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginType, setLoginType] = useState<'teacher' | 'academic'>('teacher');
  const [submitting, setSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    position: 'ครู',
    subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี',
    role: 'teacher' as 'teacher' | 'academic'
  });

  // Filters & Searches
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending_submission, submitted, checking, needs_edit, approved

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // New/Edit teacher state
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    password: '',
    position: 'ครู',
    subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี',
    profilePic: '',
    role: 'teacher' as 'teacher' | 'academic',
    status: 'active' as 'active' | 'inactive'
  });

  // New submission form state
  const [submissionForm, setSubmissionForm] = useState({
    title: '',
    description: '',
    type: 'แผนการจัดการเรียนรู้',
    fileName: '',
    fileType: '',
    fileSize: 0,
    fileUrl: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewBlobUrlRef = useRef<string | null>(null);

  // Inspect submission details state
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // File preview states for Academic
  const [previewSubmission, setPreviewSubmission] = useState<Submission | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [submissionToCancel, setSubmissionToCancel] = useState<Submission | null>(null);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);

  // Archive & MS Office simulator states
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeSheet, setActiveSheet] = useState('sheet1');
  const [selectedArchiveFile, setSelectedArchiveFile] = useState<any | null>(null);

  // Reset simulator states and clean up preview blob URL when preview submission changes
  useEffect(() => {
    setActiveSlide(0);
    setActiveSheet('sheet1');
    setSelectedArchiveFile(null);

    return () => {
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
    };
  }, [previewSubmission]);

  // Interactive Office Simulator & Online Editing States
  const [wordData, setWordData] = useState<any>(null);
  const [excelData, setExcelData] = useState<any>(null);
  const [pptData, setPptData] = useState<any>(null);
  const [zipData, setZipData] = useState<any>(null);
  const [rawTextData, setRawTextData] = useState<string>("");
  const [imageAdjustments, setImageAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    hueRotate: 0,
    rotation: 0,
    annotations: [] as { x: number; y: number; text: string; id: number }[]
  });
  const [newAnnotationText, setNewAnnotationText] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [videoSpeed, setVideoSpeed] = useState(1);
  
  // Custom interactive annotation comments for video/audio
  const [mediaBookmarks, setMediaBookmarks] = useState<{ time: string; text: string }[]>([]);
  const [newBookmarkText, setNewBookmarkText] = useState("");

  // Populate interactive data states when a file is selected for preview
  useEffect(() => {
    if (!previewSubmission) {
      setWordData(null);
      setExcelData(null);
      setPptData(null);
      setZipData(null);
      setRawTextData("");
      setIsEditMode(false);
      setImageAdjustments({
        brightness: 100,
        contrast: 100,
        grayscale: 0,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
        rotation: 0,
        annotations: []
      });
      setMediaBookmarks([]);
      return;
    }

    // Set interactive mock databases from Firebase if they exist, or fallback to beautiful presets
    if (isWordFile(previewSubmission.fileType) || isPdfFile(previewSubmission.fileType)) {
      if (previewSubmission.wordData) {
        setWordData(previewSubmission.wordData);
      } else {
        setWordData({
          title: previewSubmission.title,
          description: previewSubmission.description || "คำอธิบายรายละเอียดเพิ่มเติมของเอกสารฉบับนี้...",
          objective: "1. เพื่อจัดกระบวนการเรียนรู้เชิงรุก (Active Learning) บูรณาการเครื่องมือเทคโนโลยีดิจิทัลในชั้นเรียนอย่างสร้างสรรค์\n2. เพื่อยกระดับคะแนนสัมฤทธิ์ทางการเรียนและการประเมินผลความเข้าใจของนักเรียนรายบุคคล\n3. เพื่อปลูกฝังสมรรถนะสำคัญของผู้เรียนและคุณลักษณะอันพึงประสงค์สอดคล้องกับศตวรรษที่ 21",
          competencies: "ผู้เรียนได้รับการฝึกทักษะการคิดวิเคราะห์เชิงลึก การทำงานร่วมกันเป็นทีม การคิดแก้ปัญหาด้วยหลักการทางวิทยาศาสตร์ และการใช้สื่อเทคโนโลยีสารสนเทศอย่างปลอดภัย",
          materials: "- สื่อวิดีโอแอนิเมชันประกอบบทเรียนอ้างอิงระดับประเทศ\n- ชุดอุปกรณ์ทดลองวิทยาศาสตร์จำลองและการศึกษาเชิงปฏิบัติการ\n- แบบสอบถามตอบป้อนกลับออนไลน์ (Google Forms) และใบงานสรุปหน่วยการเรียนรู้",
          approvedBy: currentUserProfile?.name || "ฝ่ายวิชาการ รร.เทศบาล 4",
          documentNo: "ท.4/วช-" + Math.floor(Math.random() * 900 + 100) + "/2569",
          stampType: "approved",
          signature: ""
        });
      }
    } else if (isExcelFile(previewSubmission.fileType)) {
      if (previewSubmission.excelData) {
        setExcelData(previewSubmission.excelData);
      } else {
        setExcelData({
          sheet1: [
            { no: 1, id: "04121", name: "ด.ช. เกียรติภูมิ มั่นคง", c1: 35, c2: 18, c3: 36 },
            { no: 2, id: "04122", name: "ด.ญ. นพวรรณ รักษ์ดี", c1: 32, c2: 17, c3: 34 },
            { no: 3, id: "04123", name: "ด.ช. พีรพงษ์ วงศ์สว่าง", c1: 34, c2: 15, c3: 30 },
            { no: 4, id: "04124", name: "ด.ญ. ศศิธร สุขใจ", c1: 38, c2: 19, c3: 38 },
            { no: 5, id: "04125", name: "ด.ช. อนันต์ รุ่งเรือง", c1: 28, c2: 14, c3: 25 },
            { no: 6, id: "04126", name: "ด.ญ. ณิชชา พาณิชย์", c1: 33, c2: 16, c3: 31 },
            { no: 7, id: "04127", name: "ด.ช. ปธานินทร์ แสงงาม", c1: 30, c2: 15, c3: 29 },
            { no: 8, id: "04128", name: "ด.ญ. วรรณวิสา มีทรัพย์", c1: 36, c2: 18, c3: 35 }
          ],
          sheet2: [
            { wk: 1, topic: "ปฐมนิเทศ และชี้แจงการวัดประเมินผล", all: 40, att: 39, leave: 1, work: 38 },
            { wk: 2, topic: "หน่วยการเรียนรู้ที่ 1: พื้นฐานทฤษฎีสาระการเรียนรู้", all: 40, att: 40, leave: 0, work: 39 },
            { wk: 3, topic: "ปฏิบัติการทดลองกลุ่มเชิงระบบ Active Learning", all: 40, att: 38, leave: 2, work: 35 },
            { wk: 4, topic: "สรุปบททบทวนย่อย และทดสอบกลางหน่วยการเรียนรู้", all: 40, att: 39, leave: 1, work: 39 }
          ]
        });
      }
    } else if (isPptFile(previewSubmission.fileType)) {
      if (previewSubmission.pptData) {
        setPptData(previewSubmission.pptData);
      } else {
        setPptData({
          theme: "indigo",
          slides: [
            { title: previewSubmission.title, subtitle: `กลุ่มสาระการเรียนรู้: ${previewSubmission.teacherSubjectGroup}`, presenter: `ผู้นำเสนอ: ${previewSubmission.teacherName}` },
            { title: "เป้าหมายและจุดประสงค์การสอน", bullets: [
              "พัฒนากระบวนการเรียนรู้และยกระดับสมรรถนะนักเรียนรายบุคคลอย่างมีประสิทธิภาพ",
              "ส่งเสริมความคิดสร้างสรรค์และทักษะการร่วมมือแบบบูรณาการผ่านกิจกรรมสแกนงาน",
              "ปลูกฝังคุณลักษณะอันพึงประสงค์ มุ่งมั่นในการทำงาน ใฝ่รู้ใฝ่เรียน ตระหนักคุณค่าสื่อเทคโนโลยี"
            ] },
            { title: "การจัดกระบวนการเรียนรู้และวัดผล", bullets: [
              "จัดกิจกรรมเน้น Active Learning, อภิปรายกลุ่ม และประเมินร่วมกันในห้องเรียน",
              "เกณฑ์การวัดผล: ร้อยละ 80 ของนักเรียนห้องเรียนเป้าหมายผ่านเกณฑ์การทดสอบระดับดีขึ้นไป"
            ] }
          ]
        });
      }
    } else if (isZipFile(previewSubmission.fileType) || isRarFile(previewSubmission.fileType)) {
      if (previewSubmission.zipData) {
        setZipData(previewSubmission.zipData);
      } else {
        setZipData([
          { name: "1_แผนการจัดการเรียนรู้บูรณาการ.docx", size: "185 KB", type: "docx", content: "เอกสารแผนการจัดกระบวนการเรียนรู้เชิงลึกที่สอดคล้องกับมาตรฐานการศึกษา" },
          { name: "2_สื่อการสอนสไลด์นำเสนอ.pptx", size: "3.2 MB", type: "pptx", content: "สไลด์สื่อการจัดกิจกรรม Active Learning ของกลุ่มสาระคุณครู" },
          { name: "3_แบบประเมินผลสัมฤทธิ์นร.xlsx", size: "94 KB", type: "xlsx", content: "ตารางสรุปผลคะแนนสัมฤทธิ์ทางการเรียนและการประเมินผลกลางภาคเรียน" },
          { name: "4_ตัวอย่างใบงานแบบฝึกทักษะ.pdf", size: "450 KB", type: "pdf", content: "แบบฝึกทักษะย่อยเพื่อประเมินความก้าวหน้าการเรียนรู้รายหน่วย" },
          { name: "5_รูปบรรยากาศชั้นเรียนเชิงรุก.png", size: "1.8 MB", type: "png", content: "รูปภาพการปฏิบัติกิจกรรมรายกลุ่มของนักเรียนในชั้นเรียนเชิงรุก" }
        ]);
      }
    } else if (isTextFile(previewSubmission.fileType)) {
      setRawTextData(decodeBase64Utf8(previewSubmission.fileUrl));
    }

    if (previewSubmission.imageAdjustments) {
      setImageAdjustments(previewSubmission.imageAdjustments);
    } else {
      setImageAdjustments({
        brightness: 100,
        contrast: 100,
        grayscale: 0,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
        rotation: 0,
        annotations: []
      });
    }

    if (previewSubmission.mediaBookmarks) {
      setMediaBookmarks(previewSubmission.mediaBookmarks);
    } else {
      setMediaBookmarks([]);
    }
  }, [previewSubmission]);

  // Save Online Edits of File back to Firebase Database
  const handleSaveFileEdits = async () => {
    if (!previewSubmission) return;
    setSubmitting(true);
    try {
      const updatedPayload: any = {
        updatedAt: new Date().toISOString()
      };

      if (isWordFile(previewSubmission.fileType) || isPdfFile(previewSubmission.fileType)) {
        updatedPayload.wordData = wordData;
      } else if (isExcelFile(previewSubmission.fileType)) {
        updatedPayload.excelData = excelData;
      } else if (isPptFile(previewSubmission.fileType)) {
        updatedPayload.pptData = pptData;
      } else if (isZipFile(previewSubmission.fileType) || isRarFile(previewSubmission.fileType)) {
        updatedPayload.zipData = zipData;
      } else if (isTextFile(previewSubmission.fileType)) {
        // Encode rawTextData back to Base64 data URL
        const base64Content = btoa(unescape(encodeURIComponent(rawTextData)));
        updatedPayload.fileUrl = `data:text/plain;base64,${base64Content}`;
      } else if (isImageFile(previewSubmission.fileType)) {
        updatedPayload.imageAdjustments = imageAdjustments;
      } else if (isVideoFile(previewSubmission.fileType) || isAudioFile(previewSubmission.fileType)) {
        updatedPayload.mediaBookmarks = mediaBookmarks;
      }

      await updateDoc(doc(db, 'submissions', previewSubmission.id), updatedPayload);
      
      // Update local states so that it displays changes instantly
      setPreviewSubmission(prev => prev ? { ...prev, ...updatedPayload } : null);
      
      await addLog("แก้ไขไฟล์งานออนไลน์", `ผู้ใช้ทำการแก้ไขเนื้อหาระบบไฟล์ "${previewSubmission.fileName}" ผ่านโปรแกรมจำลองอัจฉริยะ`);
      setAlertMsg({ type: 'success', text: 'บันทึกการแก้ไขไฟล์งานจริงเรียบร้อย! คณะครูและฝ่ายวิชาการจะเห็นฉบับอัปเดตทันที' });
      setIsEditMode(false);
    } catch (err) {
      console.error("Failed to save file edits", err);
      setAlertMsg({ type: 'error', text: 'บันทึกข้อมูลแก้ไขล้มเหลว กรุณาลองใหม่อีกครั้ง' });
    }
    setSubmitting(false);
  };

  // Helper: Decode base64 UTF-8 for text preview
  const decodeBase64Utf8 = (base64Str: string) => {
    try {
      const parts = base64Str.split(',');
      const actualBase64 = parts.length > 1 ? parts[1] : parts[0];
      const binary = atob(actualBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
      return "ไม่สามารถอ่านไฟล์ข้อความภาษาไทยได้ หรือไฟล์ได้รับการเข้ารหัสไว้";
    }
  };

  const isImageFile = (type: string) => ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(type.toLowerCase());
  const isPdfFile = (type: string) => type.toLowerCase() === 'pdf';
  const isTextFile = (type: string) => ['txt', 'csv', 'json', 'xml', 'md'].includes(type.toLowerCase());
  const isWordFile = (type: string) => ['doc', 'docx'].includes(type.toLowerCase());
  const isExcelFile = (type: string) => ['xls', 'xlsx'].includes(type.toLowerCase());
  const isPptFile = (type: string) => ['ppt', 'pptx'].includes(type.toLowerCase());
  const isZipFile = (type: string) => type.toLowerCase() === 'zip';
  const isRarFile = (type: string) => type.toLowerCase() === 'rar';
  const isVideoFile = (type: string) => ['mp4', 'webm', 'mov', 'ogg', 'mkv'].includes(type.toLowerCase());
  const isAudioFile = (type: string) => ['mp3', 'wav', 'm4a', 'ogg', 'wma'].includes(type.toLowerCase());

  // Auto-dismiss alerts
  useEffect(() => {
    if (alertMsg) {
      const timer = setTimeout(() => setAlertMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alertMsg]);

  // Log activity helper
  const addLog = async (action: string, details: string, userObj?: any) => {
    const actUser = userObj || currentUserProfile;
    const logData = {
      userId: actUser?.id || 'anonymous',
      userName: actUser?.name || 'Anonymous User',
      userRole: actUser?.role || 'guest',
      action,
      details,
      createdAt: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, 'activityLogs'), logData);
    } catch (e) {
      console.error("Failed to write log", e);
    }
  };

  // Clear all activity logs
  const handleClearLogs = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการล้างประวัติการใช้งาน',
      message: 'คุณต้องการล้างประวัติการใช้งานระบบ (Activity Logs) ทั้งหมดในฐานข้อมูลใช่หรือไม่? รายการบันทึกทั้งหมดจะหายไปและไม่สามารถกู้คืนได้',
      confirmText: 'ล้างประวัติทั้งหมด',
      cancelText: 'ยกเลิก',
      isDanger: true,
      onConfirm: async () => {
        try {
          const q = query(collection(db, 'activityLogs'));
          const snapshot = await getDocs(q);
          const batchPromises = snapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
          await Promise.all(batchPromises);
          await addLog("ล้างประวัติ", "ล้างบันทึกประวัติการใช้งานระบบทั้งหมดเรียบร้อยแล้ว");
          setAlertMsg({ type: 'success', text: 'ล้างประวัติการใช้งานระบบสำเร็จ' });
        } catch (err) {
          console.error("Failed to clear logs", err);
          setAlertMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการล้างประวัติการใช้งาน' });
        }
        setConfirmDialog(null);
      }
    });
  };

  // Seeding default database function if empty
  const checkAndSeedDatabase = async () => {
    try {
      // 1. Seed Config
      const configDocRef = doc(db, 'systemSettings', 'config');
      const configDoc = await getDoc(configDocRef);
      if (!configDoc.exists()) {
        await setDoc(configDocRef, settings);
      } else {
        const data = configDoc.data() as SystemSettings;
        let needsUpdate = false;
        if (data.websiteTitle === 'ระบบส่งไฟล์งานคุณครู') {
          data.websiteTitle = 'ระบบส่งไฟล์งาน';
          needsUpdate = true;
        }
        if (!data.maxFileSize || data.maxFileSize <= 5) {
          data.maxFileSize = 100;
          needsUpdate = true;
        }
        if (!data.deadlines) {
          data.deadlines = ASSIGNMENT_DEADLINES;
          needsUpdate = true;
        }
        if (needsUpdate) {
          await setDoc(configDocRef, data);
        }
        setSettings(data);
      }

      // 2. Ensure default/mock teacher accounts are deleted and not seeded anymore
      const defaultIds = ['academic_admin_default', 'teacher_somchai', 'teacher_somsri', 'teacher_wichai'];
      for (const id of defaultIds) {
        const teacherRef = doc(db, 'teachers', id);
        const snap = await getDoc(teacherRef);
        if (snap.exists()) {
          console.log(`Deleting default teacher account: ${id}`);
          await deleteDoc(teacherRef);
        }
      }

      // Check if we need to seed default submissions
      const submissionsQuery = await getDocs(collection(db, 'submissions'));
      if (submissionsQuery.empty) {
        console.log("Seeding default submissions...");
        const mockSubmissions: Submission[] = [
          {
            id: 'sub_1',
            teacherId: 'teacher_somchai',
            teacherName: 'ครูสมชาย แซ่ปัง',
            teacherProfilePic: 'https://ui-avatars.com/api/?name=Somchai+Pan&background=4f46e5&color=fff',
            teacherSubjectGroup: 'วิทยาศาสตร์และเทคโนโลยี',
            title: 'แผนการจัดการเรียนรู้ รายวิชาคอมพิวเตอร์ ป.4',
            description: 'แผนสำหรับสอนนักเรียนสัปดาห์ที่ 1-10 รายวิชาคอมพิวเตอร์พื้นฐาน',
            type: 'แผนการจัดการเรียนรู้',
            fileName: 'Lesson_Plan_P4.pdf',
            fileType: 'pdf',
            fileSize: 1048576,
            fileUrl: 'data:application/pdf;base64,JVBERi0xLjQKJ...', // mock
            status: 'approved',
            comments: 'แผนการเรียนรู้จัดทำได้สอดคล้องกับมาตรฐานการเรียนรู้ดีมากครับ',
            submittedAt: '2026-06-25T09:42:00.000Z',
            checkedAt: '2026-06-26T14:30:00.000Z',
            createdAt: '2026-06-24T09:42:00.000Z',
            updatedAt: '2026-06-26T14:30:00.000Z'
          },
          {
            id: 'sub_2',
            teacherId: 'teacher_somsri',
            teacherName: 'ครูสมศรี ดีงาม',
            teacherProfilePic: 'https://ui-avatars.com/api/?name=Somsri+Dee&background=ea580c&color=fff',
            teacherSubjectGroup: 'ภาษาต่างประเทศ',
            title: 'รายงานสรุปผลการสอนออนไลน์ ภาษาอังกฤษ ป.5',
            description: 'สรุปการเข้าเรียน ปัญหาอุปสรรค และแนวทางแก้ไขการจัดการเรียนสอนวิชาอังกฤษ',
            type: 'รายงานผลการสอน',
            fileName: 'Report_Week8_English.docx',
            fileType: 'docx',
            fileSize: 204857,
            fileUrl: 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQ...', // mock
            status: 'submitted',
            submittedAt: '2026-07-01T11:20:00.000Z',
            createdAt: '2026-07-01T11:15:00.000Z',
            updatedAt: '2026-07-01T11:20:00.000Z'
          }
        ];

        for (const sub of mockSubmissions) {
          await setDoc(doc(db, 'submissions', sub.id), sub);
        }
      }
    } catch (err) {
      console.error("Seeding failed or database incomplete:", err);
    }
  };

  // Subscribe to updates real-time
  useEffect(() => {
    checkAndSeedDatabase();

    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      const list: Teacher[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as Teacher);
      });
      setTeachers(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'teachers'));

    const unsubSubmissions = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      const list: Submission[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as Submission);
      });
      // Sort by updatedAt desc
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setSubmissions(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'submissions'));

    const unsubLogs = onSnapshot(
      query(collection(db, 'activityLogs'), orderBy('createdAt', 'desc'), limit(100)),
      (snapshot) => {
        const list: ActivityLog[] = [];
        snapshot.forEach(d => {
          list.push({ ...d.data(), id: d.id } as ActivityLog);
        });
        setLogs(list);
      }
    );

    const unsubSettings = onSnapshot(doc(db, 'systemSettings', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as SystemSettings);
      }
    });

    return () => {
      unsubTeachers();
      unsubSubmissions();
      unsubLogs();
      unsubSettings();
    };
  }, []);

  // Sync Auth and populate profiles with localStorage persistence fallback
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setIsAuthLoading(true);
      if (user) {
        setCurrentUser(user);
        // Look up registered user in the 'teachers' collection
        const userDocRef = doc(db, 'teachers', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        let profile: Teacher | null = null;
        if (userDoc.exists()) {
          profile = userDoc.data() as Teacher;
        } else {
          // If not found in DB but matches direct admin emails, or first setup
          const isDevAdmin = user.email === 'kubbket@gmail.com' || user.email === 'academic@school.ac.th';
          profile = {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'ผู้ใช้นิรนาม',
            email: user.email || '',
            position: isDevAdmin ? 'หัวหน้าฝ่ายวิชาการ' : 'ครู',
            subjectGroup: isDevAdmin ? 'บริหารงานวิชาการ' : 'วิทยาศาสตร์และเทคโนโลยี',
            profilePic: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=0284c7&color=fff`,
            role: isDevAdmin ? 'academic' : 'teacher',
            status: 'active'
          };
          await setDoc(userDocRef, profile);
          await addLog("สร้างบัญชีเริ่มต้น", "ลงทะเบียนบัญชีสำเร็จ", profile);
        }

        if (profile.status === 'inactive') {
          await signOut(auth).catch(() => {});
          localStorage.removeItem('tm4_local_user');
          setAlertMsg({ type: 'error', text: 'บัญชีของคุณถูกระงับการใช้งานชั่วคราว กรุณาติดต่อฝ่ายวิชาการ' });
          setCurrentUser(null);
          setCurrentUserProfile(null);
        } else {
          setCurrentUserProfile(profile);
          localStorage.setItem('tm4_local_user', JSON.stringify(profile));
        }
      } else {
        // Check localStorage session for local fallback users
        const savedLocalUser = localStorage.getItem('tm4_local_user');
        if (savedLocalUser) {
          try {
            const parsedProfile = JSON.parse(savedLocalUser) as Teacher;
            if (parsedProfile && parsedProfile.id) {
              setCurrentUserProfile(parsedProfile);
            } else {
              setCurrentUser(null);
              setCurrentUserProfile(null);
            }
          } catch (e) {
            setCurrentUser(null);
            setCurrentUserProfile(null);
          }
        } else {
          setCurrentUser(null);
          setCurrentUserProfile(null);
        }
      }
      setIsAuthLoading(false);
    });

    return () => unsubAuth();
  }, []);

  // Handle Google redirect login results
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("Logged in via redirect successfully", result.user);
          setAlertMsg({ type: 'success', text: 'เข้าสู่ระบบด้วย Gmail สำเร็จ' });
        }
      })
      .catch((err) => {
        console.error("Redirect auth error:", err);
        if (err.code !== 'auth/popup-blocked' && err.code !== 'auth/redirect-cancelled-by-user') {
          setAlertMsg({ type: 'error', text: `เกิดข้อผิดพลาดในการลงทะเบียน/เข้าสู่ระบบด้วย Gmail: ${err.message}` });
        }
      });
  }, []);

  // Fetch alerts & notifications for the logged-in user
  useEffect(() => {
    if (!currentUserProfile) return;
    const q = query(
      collection(db, 'notifications'), 
      where('userId', 'in', [currentUserProfile.id, currentUserProfile.role, 'all']),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubNotif = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      let unread = 0;
      snapshot.forEach(doc => {
        const item = doc.data();
        list.push({ ...item, id: doc.id });
        if (!item.read) unread++;
      });
      setNotifications(list);
      setShowNotificationCount(unread);
    });
    return () => unsubNotif();
  }, [currentUserProfile]);

  // Login handlers
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setAlertMsg({ type: 'error', text: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน' });
      return;
    }
    setSubmitting(true);
    const cleanEmail = loginEmail.trim().toLowerCase();

    // 1. Try standard Firebase Auth first
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, loginPassword);
      if (userCredential.user) {
        setAlertMsg({ type: 'success', text: 'เข้าสู่ระบบสำเร็จ' });
        setSubmitting(false);
        return;
      }
    } catch (authErr: any) {
      console.log("Firebase Auth sign-in failed, checking Firestore teachers database...", authErr?.code);
    }

    // 2. Search Firestore teachers collection for matching account
    try {
      const teachersQuery = query(collection(db, 'teachers'), where('email', '==', cleanEmail));
      const querySnapshot = await getDocs(teachersQuery);

      let matchedTeacher: Teacher | null = null;
      let matchedDocId = '';

      if (!querySnapshot.empty) {
        querySnapshot.forEach(docSnap => {
          const data = docSnap.data() as Teacher;
          if (data.email?.toLowerCase() === cleanEmail) {
            matchedTeacher = { ...data, id: docSnap.id };
            matchedDocId = docSnap.id;
          }
        });
      }

      if (matchedTeacher) {
        const teacher = matchedTeacher as Teacher;
        if (teacher.status === 'inactive') {
          setAlertMsg({ type: 'error', text: 'บัญชีของคุณถูกระงับการใช้งานชั่วคราว กรุณาติดต่อฝ่ายวิชาการ' });
          setSubmitting(false);
          return;
        }

        // Check password match
        const storedPassword = teacher.password || 'password123';
        if (loginPassword !== storedPassword) {
          setAlertMsg({ type: 'error', text: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
          setSubmitting(false);
          return;
        }

        // Password matches! Try creating Firebase Auth user if missing, or log in
        try {
          await createUserWithEmailAndPassword(auth, cleanEmail, loginPassword);
        } catch (authCreateErr) {
          try {
            await signInWithEmailAndPassword(auth, cleanEmail, loginPassword);
          } catch (e) {}
        }

        setCurrentUser({ uid: matchedDocId, email: teacher.email } as any);
        setCurrentUserProfile(teacher);
        localStorage.setItem('tm4_local_user', JSON.stringify(teacher));
        setAlertMsg({ type: 'success', text: `ยินดีต้อนรับ ${teacher.name} เข้าสู่ระบบ` });
        await addLog("เข้าสู่ระบบ", `เข้าสู่ระบบสำเร็จ (${teacher.role === 'academic' ? 'ฝ่ายวิชาการ' : 'ครู'})`, teacher);
        setSubmitting(false);
        return;
      }

      // If account doesn't exist in Firestore, check if it's default school demo login
      if (cleanEmail === 'academic@school.ac.th' || cleanEmail === 'teacher@school.ac.th') {
        const isAcademic = cleanEmail === 'academic@school.ac.th' || loginType === 'academic';
        const demoProfile: Teacher = {
          id: isAcademic ? 'academic_demo_account' : 'teacher_demo_account',
          name: isAcademic ? 'ฝ่ายวิชาการ (ครูสมศักดิ์)' : 'คุณครูสมชาย แซ่ปัง',
          email: cleanEmail,
          password: loginPassword,
          position: isAcademic ? 'หัวหน้าฝ่ายวิชาการ' : 'ครูชำนาญการ',
          subjectGroup: isAcademic ? 'บริหารงานวิชาการ' : 'วิทยาศาสตร์และเทคโนโลยี',
          profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(isAcademic ? 'Academic Admin' : 'Somchai Pan')}&background=${isAcademic ? 'f59e0b' : '0284c7'}&color=fff`,
          role: isAcademic ? 'academic' : 'teacher',
          status: 'active',
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'teachers', demoProfile.id), demoProfile);

        try {
          await createUserWithEmailAndPassword(auth, cleanEmail, loginPassword);
        } catch (e) {}

        setCurrentUser({ uid: demoProfile.id, email: cleanEmail } as any);
        setCurrentUserProfile(demoProfile);
        localStorage.setItem('tm4_local_user', JSON.stringify(demoProfile));
        setAlertMsg({ type: 'success', text: `เข้าสู่ระบบสำเร็จสำหรับ ${demoProfile.name}` });
        await addLog("เข้าสู่ระบบ", "เข้าสู่ระบบบัญชีประจำโรงเรียนสำเร็จ", demoProfile);
        setSubmitting(false);
        return;
      }

      setAlertMsg({ type: 'error', text: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาลงทะเบียนสมัครสมาชิกใหม่' });
    } catch (err: any) {
      console.error("Login process error:", err);
      setAlertMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง' });
    }
    setSubmitting(false);
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, password, position, subjectGroup, role } = registerForm;
    if (!name || !email || !password) {
      setAlertMsg({ type: 'error', text: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง' });
      return;
    }
    if (password.length < 6) {
      setAlertMsg({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
      return;
    }
    setSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      // Check existing in Firestore
      const teachersQuery = query(collection(db, 'teachers'), where('email', '==', cleanEmail));
      const existingSnap = await getDocs(teachersQuery);
      if (!existingSnap.empty) {
        setAlertMsg({ type: 'error', text: 'อีเมลนี้ถูกใช้งานไปแล้วในระบบ' });
        setSubmitting(false);
        return;
      }

      let uid = 'teacher_' + Date.now();
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (userCredential.user) {
          uid = userCredential.user.uid;
        }
      } catch (authErr: any) {
        if (authErr?.code === 'auth/email-already-in-use') {
          setAlertMsg({ type: 'error', text: 'อีเมลนี้ถูกใช้งานไปแล้วในระบบ' });
          setSubmitting(false);
          return;
        }
      }

      const profile: Teacher = {
        id: uid,
        name: name.trim(),
        email: cleanEmail,
        password,
        position,
        subjectGroup,
        profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=${role === 'academic' ? 'f59e0b' : '0284c7'}&color=fff`,
        role,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'teachers', uid), profile);
      setCurrentUser({ uid, email: cleanEmail } as any);
      setCurrentUserProfile(profile);
      localStorage.setItem('tm4_local_user', JSON.stringify(profile));
      await addLog("สร้างบัญชี", `ลงทะเบียนบัญชีใหม่สำเร็จ (${role === 'academic' ? 'ฝ่ายวิชาการ' : 'ครู'})`, profile);

      setAlertMsg({ type: 'success', text: 'ลงทะเบียนสมัครสมาชิกและเข้าสู่ระบบสำเร็จ' });
      setIsRegistering(false);
      setRegisterForm({
        name: '',
        email: '',
        password: '',
        position: 'ครู',
        subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี',
        role: 'teacher'
      });
    } catch (err: any) {
      console.error("Register error:", err);
      setAlertMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง' });
    }
    setSubmitting(false);
  };

  const handleLogout = async () => {
    if (currentUserProfile) {
      await addLog("ออกจากระบบ", "ผู้ใช้ออกจากระบบ");
    }
    localStorage.removeItem('tm4_local_user');
    await signOut(auth).catch(() => {});
    // Hard reset local mock profile
    setCurrentUser(null);
    setCurrentUserProfile(null);
    setAlertMsg({ type: 'success', text: 'ออกจากระบบเรียบร้อยแล้ว' });
  };

  // Helper to trigger alert notifications in DB
  const triggerNotification = async (targetUserId: string, title: string, message: string) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: targetUserId,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to post notification", err);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      const promises = unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }));
      await Promise.all(promises);
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const handleOpenProfileModal = () => {
    if (!currentUserProfile) return;
    setProfileForm({
      name: currentUserProfile.name || '',
      position: currentUserProfile.position || '',
      subjectGroup: currentUserProfile.subjectGroup || '',
      profilePic: currentUserProfile.profilePic || '',
      password: currentUserProfile.password || ''
    });
    setShowProfileModal(true);
  };

  const handleProfilePicFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setAlertMsg({ type: 'error', text: 'ขนาดไฟล์ภาพต้องไม่เกิน 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileForm(prev => ({
        ...prev,
        profilePic: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUserProfile) return;
    setProfileSaving(true);
    try {
      const teacherRef = doc(db, 'teachers', currentUserProfile.id);
      const updatedData: Partial<Teacher> = {
        name: profileForm.name.trim(),
        position: profileForm.position,
        subjectGroup: profileForm.subjectGroup,
        profilePic: profileForm.profilePic.trim(),
        password: profileForm.password || ''
      };

      await updateDoc(teacherRef, updatedData);

      // Log activity
      await addLog(
        "แก้ไขข้อมูลส่วนตัว", 
        `แก้ไขโปรไฟล์และข้อมูลส่วนตัว (${profileForm.name})`, 
        { ...currentUserProfile, ...updatedData }
      );

      // Trigger notification for updates
      await triggerNotification(
        currentUserProfile.id,
        'อัปเดตข้อมูลส่วนตัว',
        `ข้อมูลส่วนตัวของคุณได้รับการอัปเดตเรียบร้อยแล้ว`
      );

      // Update local state
      setCurrentUserProfile(prev => prev ? { ...prev, ...updatedData } : null);
      
      setAlertMsg({ type: 'success', text: 'บันทึกข้อมูลส่วนตัวสำเร็จ' });
      setShowProfileModal(false);
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setAlertMsg({ type: 'error', text: `บันทึกข้อมูลส่วนตัวล้มเหลว: ${err.message}` });
    } finally {
      setProfileSaving(false);
    }
  };

  // CRUD Teacher
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name || !teacherForm.email) {
      setAlertMsg({ type: 'error', text: 'กรุณากรอกข้อมูลหลักให้ครบถ้วน' });
      return;
    }
    try {
      const emailLower = teacherForm.email.toLowerCase();
      const payload = {
        name: teacherForm.name,
        email: emailLower,
        password: teacherForm.password || 'password123',
        position: teacherForm.position,
        subjectGroup: teacherForm.subjectGroup,
        profilePic: teacherForm.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherForm.name)}&background=0284c7&color=fff`,
        role: teacherForm.role,
        status: teacherForm.status,
        updatedAt: new Date().toISOString()
      };

      if (editingTeacher) {
        await updateDoc(doc(db, 'teachers', editingTeacher.id), payload);
        await addLog("แก้ไขข้อมูลครู", `แก้ไขข้อมูลของครู ${teacherForm.name}`);
        setAlertMsg({ type: 'success', text: 'แก้ไขข้อมูลครูสำเร็จแล้ว' });
      } else {
        const newId = 'teacher_' + Date.now();
        await setDoc(doc(db, 'teachers', newId), {
          ...payload,
          id: newId,
          createdAt: new Date().toISOString()
        });
        await addLog("เพิ่มครูใหม่", `เพิ่มข้อมูลและสร้างบัญชีให้ครู ${teacherForm.name}`);
        setAlertMsg({ type: 'success', text: 'เพิ่มครูใหม่เรียบร้อยแล้ว (ระบบสร้างหน้าแดชบอร์ดอัตโนมัติ)' });
      }
      setShowTeacherModal(false);
      setEditingTeacher(null);
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'ทำรายการล้มเหลว กรุณาลองใหม่อีกครั้ง' });
    }
  };

  const handleDeleteTeacher = (teacher: Teacher) => {
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการลบรายชื่อคุณครู',
      message: `คุณต้องการลบคุณครู "${teacher.name}" ออกจากระบบใช่หรือไม่? ข้อมูลทั้งหมดและไฟล์ประวัติของครูรายนี้จะหายไปจากระบบทันทีและไม่สามารถกู้คืนได้`,
      confirmText: 'ลบข้อมูลคุณครู',
      cancelText: 'ยกเลิก',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'teachers', teacher.id));
          await addLog("ลบรายชื่อครู", `ลบครู ${teacher.name} ออกจากระบบ`);
          setAlertMsg({ type: 'success', text: 'ลบข้อมูลคุณครูเสร็จสมบูรณ์' });
        } catch (err) {
          setAlertMsg({ type: 'error', text: 'การลบล้มเหลว' });
        }
        setConfirmDialog(null);
      }
    });
  };

  // Submit Work File Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    if (!settings.allowedFileTypes.includes(fileExt)) {
      setAlertMsg({ type: 'error', text: `ไม่อนุญาตให้อัปโหลดไฟล์นามสกุล .${fileExt}` });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > settings.maxFileSize) {
      setAlertMsg({ type: 'error', text: `ขนาดไฟล์เกินขีดจำกัดที่อนุญาต (${settings.maxFileSize} MB)` });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      let resultStr = reader.result as string;

      setSubmissionForm(prev => ({
        ...prev,
        fileName: file.name,
        fileType: fileExt,
        fileSize: file.size,
        fileUrl: resultStr
      }));
    };
    reader.readAsDataURL(file);
  };

  const triggerAddSubmissionConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionForm.title || !submissionForm.fileName) {
      setAlertMsg({ type: 'error', text: 'กรุณากรอกชื่องานและเลือกไฟล์เอกสาร' });
      return;
    }
    setShowSubmitConfirmModal(true);
  };

  const handleAddSubmission = async () => {
    if (!submissionForm.title || !submissionForm.fileName) {
      setAlertMsg({ type: 'error', text: 'กรุณากรอกชื่องานและเลือกไฟล์เอกสาร' });
      return;
    }
    if (!currentUserProfile) return;

    setSubmitting(true);
    try {
      const subId = 'sub_' + Date.now();
      const isChunked = submissionForm.fileUrl.length > 800000;
      let finalFileUrl = submissionForm.fileUrl;
      let totalChunks = 0;

      if (isChunked) {
        totalChunks = Math.ceil(submissionForm.fileUrl.length / 800000);
        finalFileUrl = ""; // Keep main document small
      }

      const payload: Submission = {
        id: subId,
        teacherId: currentUserProfile.id,
        teacherName: currentUserProfile.name,
        teacherProfilePic: currentUserProfile.profilePic,
        teacherSubjectGroup: currentUserProfile.subjectGroup,
        title: submissionForm.title,
        description: submissionForm.description,
        type: submissionForm.type,
        fileName: submissionForm.fileName,
        fileType: submissionForm.fileType,
        fileSize: submissionForm.fileSize,
        fileUrl: finalFileUrl,
        isChunked,
        chunksCount: totalChunks,
        status: 'submitted', // Auto-set status to "ส่งแล้ว"
        submittedAt: new Date().toISOString(),
        deadline: activeDeadlines[submissionForm.type]?.date || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'submissions', subId), payload);

      if (isChunked) {
        await saveFileChunks(subId, submissionForm.fileUrl);
      }

      await addLog("ส่งไฟล์งาน", `ส่งงานหัวข้อ "${submissionForm.title}" สำเร็จ`);
      
      // Notify academic staff
      await triggerNotification('academic', 'งานใหม่ถูกส่ง', `คุณครู ${currentUserProfile.name} ได้ส่งไฟล์งานใหม่: ${submissionForm.title}`);

      setAlertMsg({ type: 'success', text: 'ส่งงานสำเร็จ วันเวลาถูกบันทึกเรียบร้อย' });
      setSubmissionForm({
        title: '',
        description: '',
        type: 'แผนการจัดการเรียนรู้',
        fileName: '',
        fileType: '',
        fileSize: 0,
        fileUrl: ''
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowSubmitConfirmModal(false);
      setCurrentTab('history');
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'การบันทึกเอกสารล้มเหลว' });
    }
    setSubmitting(false);
  };

  // Academic Action: Update Submission Status, Feedback & Grade
  const handleReviewSubmission = async (status: 'checking' | 'needs_edit' | 'approved') => {
    if (!selectedSubmission) return;
    try {
      const payload: any = {
        status,
        comments: feedbackText,
        updatedAt: new Date().toISOString()
      };

      if (status === 'approved') {
        payload.checkedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, 'submissions', selectedSubmission.id), payload);
      
      let statusThai = '';
      if (status === 'checking') {
        statusThai = 'กำลังตรวจ';
      } else if (status === 'needs_edit') {
        statusThai = 'ส่งกลับแก้ไข';
      } else if (status === 'approved') {
        statusThai = 'ตรวจแล้ว';
      }

      await addLog("ตรวจงานคุณครู", `เปลี่ยนสถานะงาน "${selectedSubmission.title}" เป็น "${statusThai}"`);
      
      // Notify teacher
      const notifMsg = status === 'needs_edit' 
        ? `ฝ่ายวิชาการส่งคืนไฟล์ "${selectedSubmission.title}" ให้แก้ไขเพิ่มเติม: ${feedbackText}` 
        : `งานไฟล์ "${selectedSubmission.title}" ของคุณได้รับการตรวจประเมินเสร็จเรียบร้อยแล้ว`;
      
      await triggerNotification(selectedSubmission.teacherId, `สถานะงานอัปเดต: ${statusThai}`, notifMsg);

      setAlertMsg({ type: 'success', text: `บันทึกสถานะงานเป็น "${statusThai}" เรียบร้อยแล้ว` });
      setShowSubmissionModal(false);
      setSelectedSubmission(null);
      setFeedbackText('');
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'ทำรายการตรวจสอบล้มเหลว' });
    }
  };

  // Teacher action: Cancel/Unsubmit submission
  const handleCancelSubmission = async (sub: Submission) => {
    try {
      await deleteDoc(doc(db, 'submissions', sub.id));
      await addLog("ยกเลิกส่งงาน", `ยกเลิกการส่งไฟล์งาน "${sub.title}" (${sub.fileName})`);
      setAlertMsg({ type: 'success', text: 'ยกเลิกการส่งงานสำเร็จแล้ว ข้อมูลถูกลบออกจากระบบประเมิน' });
      setSubmissionToCancel(null);
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'ไม่สามารถยกเลิกการส่งงานได้ในขณะนี้' });
    }
  };

  // System Settings Branding Form
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'systemSettings', 'config'), settings);
      await addLog("อัปเดตตั้งค่าระบบ", "แก้ไขการกำหนดค่าแบรนด์โรงเรียนและสิทธิ์ระบบ");
      setAlertMsg({ type: 'success', text: 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว' });
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'บันทึกค่าล้มเหลว' });
    }
  };

  // Filter Submissions
  const filteredSubmissions = submissions.filter(sub => {
    // Search filter
    const matchesSearch = sub.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          sub.teacherName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'pending_submission') return matchesSearch && sub.status === 'pending_submission';
    if (statusFilter === 'submitted') return matchesSearch && sub.status === 'submitted';
    if (statusFilter === 'checking') return matchesSearch && sub.status === 'checking';
    if (statusFilter === 'needs_edit') return matchesSearch && sub.status === 'needs_edit';
    if (statusFilter === 'approved') return matchesSearch && sub.status === 'approved';
    return matchesSearch;
  });

  // Calculate statistics for the Academic dashboard
  const totalTeachers = teachers.filter(t => t.role === 'teacher').length;
  const totalSubmissions = submissions.length;
  const statSubmitted = submissions.filter(s => s.status === 'submitted').length;
  const statChecking = submissions.filter(s => s.status === 'checking').length;
  const statApproved = submissions.filter(s => s.status === 'approved').length;
  const statNeedsEdit = submissions.filter(s => s.status === 'needs_edit').length;

  // Let's compute teachers who haven't submitted anything yet
  const teachersWhoSubmittedIds = new Set(submissions.map(s => s.teacherId));
  const totalNotSubmitted = teachers.filter(t => t.role === 'teacher' && !teachersWhoSubmittedIds.has(t.id)).length;

  // For chart visualizations
  const statusData = [
    { name: 'ส่งแล้ว', value: statSubmitted, color: '#3b82f6' },
    { name: 'กำลังตรวจ', value: statChecking, color: '#f97316' },
    { name: 'แก้ไข', value: statNeedsEdit, color: '#ef4444' },
    { name: 'ตรวจแล้ว', value: statApproved, color: '#22c55e' }
  ].filter(d => d.value > 0);

  // Group stats by Subject Groups
  const subjectGroupStats = SUBJECT_GROUPS.map(group => {
    const totalGroupSubmissions = submissions.filter(s => s.teacherSubjectGroup === group).length;
    return { name: group, 'ส่งไฟล์แล้ว': totalGroupSubmissions };
  }).filter(g => g['ส่งไฟล์แล้ว'] > 0);

  // Pagination maths
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSubmissions = filteredSubmissions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage) || 1;

  // CSV Report Generator
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Include BOM for Thai characters
    csvContent += "ชื่อคุณครู,กลุ่มสาระ,ตำแหน่ง,ชื่องาน,หมวดหมู่,วันที่ส่ง,สถานะ,หมายเหตุจากฝ่ายวิชาการ\n";
    
    submissions.forEach(sub => {
      const statusThai = sub.status === 'submitted' ? 'ส่งแล้ว' : 
                        sub.status === 'checking' ? 'กำลังตรวจ' : 
                        sub.status === 'needs_edit' ? 'ส่งกลับแก้ไข' : 
                        sub.status === 'approved' ? 'ตรวจแล้ว' : 'ยังไม่ได้ส่ง';
      
      const row = [
        `"${sub.teacherName}"`,
        `"${sub.teacherSubjectGroup}"`,
        `"${sub.teacherId}"`,
        `"${sub.title}"`,
        `"${sub.type}"`,
        `"${sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('th-TH') : ''}"`,
        `"${statusThai}"`,
        `"${sub.comments || ''}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `รายงานการส่งงาน_โรงเรียนเทศบาล4_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog("ส่งออกรายงาน CSV", "ดาวน์โหลดรายงานการส่งไฟล์งานรวมในรูปแบบ Excel CSV");
  };

  // Full Database Backup Export
  const handleBackupDB = () => {
    const backupData = {
      teachers,
      submissions,
      settings,
      logs,
      backupDate: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `สำรองระบบส่งงาน_T4_${Date.now()}.json`);
    dlAnchorElem.click();
    addLog("สำรองข้อมูลระบบ", "ดาวน์โหลดไฟล์สำรองโครงสร้างข้อมูล JSON สำเร็จ");
  };

  // Full Database Restore Import
  const handleRestoreDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.teachers && parsed.submissions) {
            // Restore settings
            if (parsed.settings) {
              await setDoc(doc(db, 'systemSettings', 'config'), parsed.settings);
            }
            // Restore teachers
            for (const t of parsed.teachers) {
              await setDoc(doc(db, 'teachers', t.id), t);
            }
            // Restore submissions
            for (const s of parsed.submissions) {
              await setDoc(doc(db, 'submissions', s.id), s);
            }
            setAlertMsg({ type: 'success', text: 'กู้คืนฐานข้อมูลจากไฟล์สำรองเรียบร้อยแล้ว ระบบทำการโหลดข้อมูลใหม่' });
            addLog("กู้คืนข้อมูลระบบ", "ทำการกู้คืนข้อมูลโครงสร้างทั้งระบบผ่านไฟล์สำรอง JSON");
          } else {
            setAlertMsg({ type: 'error', text: 'โครงสร้างไฟล์สำรองไม่ถูกต้อง' });
          }
        } catch (err) {
          setAlertMsg({ type: 'error', text: 'อ่านไฟล์สำรองล้มเหลว กรุณาตรวจสอบไฟล์อีกครั้ง' });
        }
      };
    }
  };

  // Helper: Split and save file into chunks in a subcollection under submissions/{subId}/fileChunks
  const saveFileChunks = async (submissionId: string, fullBase64: string) => {
    const chunkSize = 800000; // 800KB chunk size
    const totalLength = fullBase64.length;
    let chunkIndex = 0;
    let start = 0;

    while (start < totalLength) {
      const end = Math.min(start + chunkSize, totalLength);
      const chunkStr = fullBase64.substring(start, end);
      await setDoc(doc(db, 'submissions', submissionId, 'fileChunks', String(chunkIndex)), {
        index: chunkIndex,
        content: chunkStr,
        createdAt: new Date().toISOString()
      });
      chunkIndex++;
      start = end;
    }
    return chunkIndex;
  };

  // Helper: Retrieve all chunks and reassemble them into a single full base64 string
  const getFullFileUrl = async (sub: Submission): Promise<string> => {
    if (!sub.isChunked) {
      return sub.fileUrl;
    }
    const chunksSnap = await getDocs(collection(db, 'submissions', sub.id, 'fileChunks'));
    const chunksData: { index: number; content: string }[] = [];
    chunksSnap.forEach((doc) => {
      const data = doc.data();
      chunksData.push({
        index: Number(data.index),
        content: String(data.content)
      });
    });
    chunksData.sort((a, b) => a.index - b.index);
    return chunksData.map(c => c.content).join('');
  };

  // Helper: Open File View / Download
  const handleDownloadFile = async (sub: Submission) => {
    try {
      let fileUrl = sub.fileUrl;
      if (sub.isChunked) {
        setAlertMsg({ type: 'info', text: 'กำลังเชื่อมโยงและรวบรวมไฟล์ขนาดใหญ่...' });
        fileUrl = await getFullFileUrl(sub);
      }
      if (!fileUrl) {
        setAlertMsg({ type: 'error', text: 'ไม่พบเนื้อหาไฟล์แนบ' });
        return;
      }

      let downloadUrl = fileUrl;
      let isBlobUrl = false;

      if (fileUrl.startsWith('data:')) {
        try {
          const parts = fileUrl.split(',');
          let mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
          if (isPdfFile(sub.fileType)) {
            mime = 'application/pdf';
          }
          const actualBase64 = parts.length > 1 ? parts[1] : parts[0];
          
          const binary = atob(actualBase64);
          const len = binary.length;
          const buffer = new ArrayBuffer(len);
          const view = new Uint8Array(buffer);
          for (let i = 0; i < len; i++) {
            view[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([view], { type: mime });
          downloadUrl = URL.createObjectURL(blob);
          isBlobUrl = true;
        } catch (e) {
          console.log("Failed to convert data URL to blob, falling back to data URL", e);
        }
      }

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = sub.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (isBlobUrl) {
        // Delay revoking the object URL to allow the browser to complete the download safely
        setTimeout(() => {
          try {
            URL.revokeObjectURL(downloadUrl);
          } catch (e) {
            console.error("Failed to revoke object URL after delay", e);
          }
        }, 3000);
      }

      addLog("ดาวน์โหลดไฟล์แนบ", `ดาวน์โหลดไฟล์ "${sub.fileName}" ของ ${sub.teacherName}`);
      setAlertMsg(null);
    } catch (err) {
      console.error(err);
      setAlertMsg({ type: 'error', text: 'ดาวน์โหลดไฟล์แนบไม่สำเร็จ' });
    }
  };

  // Helper: Open File Preview in Interactive Office Simulator
  const handleOpenPreview = async (sub: Submission) => {
    try {
      setAlertMsg({ type: 'info', text: 'กำลังดาวน์โหลดและจัดทำระบบพรีวิวไฟล์ออนไลน์...' });
      let fileUrl = sub.fileUrl;
      if (sub.isChunked) {
        fileUrl = await getFullFileUrl(sub);
      }
      if (!fileUrl) {
        setAlertMsg({ type: 'error', text: 'ไม่พบเนื้อหาไฟล์พรีวิว' });
        return;
      }

      let previewUrl = fileUrl;
      if (fileUrl.startsWith('data:')) {
        try {
          const parts = fileUrl.split(',');
          let mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
          if (isPdfFile(sub.fileType)) {
            mime = 'application/pdf';
          }
          const actualBase64 = parts.length > 1 ? parts[1] : parts[0];
          
          const binary = atob(actualBase64);
          const len = binary.length;
          const buffer = new ArrayBuffer(len);
          const view = new Uint8Array(buffer);
          for (let i = 0; i < len; i++) {
            view[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([view], { type: mime });
          if (previewBlobUrlRef.current) {
            URL.revokeObjectURL(previewBlobUrlRef.current);
          }
          previewUrl = URL.createObjectURL(blob);
          previewBlobUrlRef.current = previewUrl;
        } catch (e) {
          console.error("Failed to convert data URL to blob for preview", e);
        }
      }

      const fullSub = { ...sub, fileUrl: previewUrl };
      setPreviewSubmission(fullSub);
      setShowPreviewModal(true);
      setAlertMsg(null);
    } catch (err) {
      console.error(err);
      setAlertMsg({ type: 'error', text: 'เปิดพรีวิวไฟล์ออนไลน์ล้มเหลว' });
    }
  };

  // Filter specific teacher dashboard metrics
  const teacherSubmissions = submissions.filter(s => s.teacherId === currentUserProfile?.id);
  const teacherStatSubmitted = teacherSubmissions.filter(s => s.status === 'submitted').length;
  const teacherStatChecking = teacherSubmissions.filter(s => s.status === 'checking').length;
  const teacherStatApproved = teacherSubmissions.filter(s => s.status === 'approved').length;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <RefreshCw className="absolute w-6 h-6 text-blue-600 animate-pulse" />
        </div>
        <p className="mt-4 text-slate-600 text-sm font-semibold tracking-wider">กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p>
      </div>
    );
  }

  // LOGIN PAGE VIEW
  if (!currentUserProfile) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center transition-all duration-500"
        style={{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.9)), url(${settings.backgroundImage})` }}
      >
        {/* Floating alerts */}
        {alertMsg && (
          <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl border flex items-center gap-3 shadow-2xl transition-all duration-300 ${
            alertMsg.type === 'success' 
              ? 'bg-emerald-500/90 border-emerald-400 text-white' 
              : 'bg-rose-500/90 border-rose-400 text-white'
          }`}>
            {alertMsg.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            <div>
              <p className="font-bold text-sm">ข้อความแจ้งเตือน</p>
              <p className="text-xs text-white/90">{alertMsg.text}</p>
            </div>
          </div>
        )}

        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl text-white">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-white/20 hover:scale-105 transition-all duration-300 p-2 rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-white/20 overflow-hidden mb-3">
              <img src={settings.schoolLogo} alt="School Logo" className="object-contain max-h-full max-w-full" />
            </div>
            <h1 className="text-xl font-black tracking-tight">{settings.websiteTitle}</h1>
            <p className="text-xs opacity-80 mt-1 font-medium">{settings.schoolName}</p>
            <div className="h-[2px] w-12 bg-indigo-400 mx-auto mt-3 rounded-full"></div>
          </div>

          {!isRegistering ? (
            <>
              <p className="text-xs text-center text-slate-300 mb-5 bg-white/5 p-3 rounded-xl border border-white/5">
                {settings.loginMessage}
              </p>

              {/* DUAL LOGIN TABS */}
              <div className="flex bg-white/15 p-1 rounded-2xl mb-6 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setLoginType('teacher');
                    setLoginEmail('');
                    setLoginPassword('');
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    loginType === 'teacher' 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <User className="w-4 h-4" />
                  สำหรับคุณครู
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginType('academic');
                    setLoginEmail('');
                    setLoginPassword('');
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    loginType === 'academic' 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  สำหรับฝ่ายวิชาการ
                </button>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-200">
                    อีเมลลงทะเบียน {loginType === 'academic' ? '(ฝ่ายวิชาการ)' : '(คุณครู)'}
                  </label>
                  <input 
                    type="email" 
                    placeholder={loginType === 'academic' ? "academic@school.ac.th" : "teacher@school.ac.th"} 
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className={`w-full px-4 py-3 bg-white text-slate-900 border border-white/20 outline-none rounded-xl text-sm transition-all placeholder:text-slate-400 focus:ring-2 ${
                      loginType === 'academic' 
                        ? 'focus:border-amber-500 focus:ring-amber-500/25' 
                        : 'focus:border-indigo-500 focus:ring-indigo-500/25'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-200">รหัสผ่าน</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className={`w-full px-4 py-3 bg-white text-slate-900 border border-white/20 outline-none rounded-xl text-sm transition-all placeholder:text-slate-400 focus:ring-2 ${
                        loginType === 'academic' 
                          ? 'focus:border-amber-500 focus:ring-amber-500/25' 
                          : 'focus:border-indigo-500 focus:ring-indigo-500/25'
                      }`}
                    />
                    <Lock className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
                  </div>
                </div>

                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (loginType === 'academic') {
                        setLoginEmail('academic@school.ac.th');
                        setLoginPassword('password123');
                      } else {
                        setLoginEmail('teacher@school.ac.th');
                        setLoginPassword('password123');
                      }
                    }}
                    className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-xs text-slate-200 font-medium transition-all text-center flex items-center justify-center gap-1.5 border border-white/10 shadow-sm"
                  >
                    <span>💡 เติมอีเมลสาธิตอัตโนมัติ:</span>
                    <span className="font-bold text-amber-300 underline">
                      {loginType === 'academic' ? 'academic@school.ac.th' : 'teacher@school.ac.th'}
                    </span>
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className={`w-full py-3 mt-2 text-white font-bold rounded-xl text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                    loginType === 'academic' 
                      ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/25' 
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
                  }`}
                >
                  {submitting ? 'กำลังทำงาน...' : loginType === 'academic' ? 'เข้าสู่ระบบบัญชีฝ่ายวิชาการ' : 'เข้าสู่ระบบบัญชีคุณครู'}
                </button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setIsRegistering(true)} 
                  className="text-xs text-indigo-300 hover:text-white hover:underline transition-colors font-bold flex items-center justify-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  ยังไม่มีบัญชี? ลงทะเบียนสมัครสมาชิกใหม่ที่นี่
                </button>
                <button 
                  type="button"
                  onClick={() => alert('กรณีลืมรหัสผ่าน กรุณาแจ้งฝ่ายวิชาการเพื่อทำเรื่องกู้คืนบัญชีหรือรีเซ็ตรหัสผ่านใหม่')} 
                  className="text-[11px] text-slate-300 hover:text-white hover:underline transition-colors font-semibold"
                >
                  ลืมรหัสผ่านหรือไม่?
                </button>
              </div>
            </>
          ) : (
            // REGISTER FORM
            <form onSubmit={handleEmailRegister} className="space-y-4">
              <p className="text-xs text-center text-slate-300 mb-2 bg-indigo-500/15 p-3 rounded-xl border border-indigo-500/20">
                ลงทะเบียนสร้างบัญชีผู้ใช้ใหม่สำหรับบุคลากรภายในโรงเรียน
              </p>

              {/* DUAL REGISTER ROLE TABS */}
              <div className="flex bg-white/15 p-1 rounded-2xl mb-4 border border-white/10 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterForm(prev => ({ ...prev, role: 'teacher', position: 'ครู', subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี' }));
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    registerForm.role === 'teacher' 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  ครูผู้สอน
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegisterForm(prev => ({ ...prev, role: 'academic', position: 'หัวหน้าฝ่ายวิชาการ', subjectGroup: 'บริหารงานวิชาการ' }));
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    registerForm.role === 'academic' 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  ฝ่ายวิชาการ
                </button>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider mb-1 text-slate-200">ชื่อ-นามสกุล *</label>
                <input 
                  type="text" 
                  placeholder="เช่น ครูสมหมาย รักเรียน" 
                  required
                  value={registerForm.name}
                  onChange={e => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white text-slate-900 border border-white/20 outline-none rounded-xl text-sm transition-all placeholder:text-slate-400 focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/25"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider mb-1 text-slate-200">อีเมลลงทะเบียน *</label>
                <input 
                  type="email" 
                  placeholder="เช่น teacher@school.ac.th" 
                  required
                  value={registerForm.email}
                  onChange={e => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white text-slate-900 border border-white/20 outline-none rounded-xl text-sm transition-all placeholder:text-slate-400 focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/25"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider mb-1 text-slate-200">รหัสผ่าน (อย่างน้อย 6 ตัวอักษร) *</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  required
                  minLength={6}
                  value={registerForm.password}
                  onChange={e => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white text-slate-900 border border-white/20 outline-none rounded-xl text-sm transition-all placeholder:text-slate-400 focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/25"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider mb-1 text-slate-200">ตำแหน่ง</label>
                  <select
                    value={registerForm.position}
                    onChange={e => setRegisterForm(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white text-slate-900 border border-white/20 outline-none rounded-xl text-xs transition-all focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/25 font-bold"
                  >
                    {POSITIONS.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider mb-1 text-slate-200">กลุ่มสาระ</label>
                  <select
                    value={registerForm.subjectGroup}
                    onChange={e => setRegisterForm(prev => ({ ...prev, subjectGroup: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white text-slate-900 border border-white/20 outline-none rounded-xl text-xs transition-all focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/25 font-bold"
                  >
                    {SUBJECT_GROUPS.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className={`w-full py-3 mt-2 text-white font-bold rounded-xl text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                  registerForm.role === 'academic' 
                    ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/25' 
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
                }`}
              >
                {submitting ? 'กำลังสร้างบัญชี...' : 'ลงทะเบียนและเข้าใช้ระบบ'}
              </button>

              <div className="mt-4 text-center font-sans">
                <button 
                  type="button"
                  onClick={() => setIsRegistering(false)} 
                  className="text-xs text-slate-300 hover:text-white hover:underline transition-colors font-bold"
                >
                  ← มีบัญชีอยู่แล้ว? ย้อนกลับไปเข้าสู่ระบบ
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const getNavLinkClass = (tab: string) => {
    const isActive = currentTab === tab;
    if (isActive) {
      return `w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold transition-all bg-indigo-600 text-white shadow-lg shadow-indigo-600/15 scale-[1.02]`;
    }
    return darkMode 
      ? `w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-slate-850 text-slate-400 hover:text-slate-100`
      : `w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-slate-100 text-slate-600 hover:text-slate-900`;
  };

  // MAIN APPLICATION LAYOUT
  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#f8fafc] text-slate-800'
    }`}>
      {/* ALERTS & NOTIFICATIONS POPUP */}
      {alertMsg && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl border flex items-center gap-3 shadow-2xl transition-all duration-300 ${
          alertMsg.type === 'success' 
            ? 'bg-emerald-500/95 border-emerald-400 text-white' 
            : 'bg-rose-500/95 border-rose-400 text-white'
        }`}>
          {alertMsg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <div>
            <p className="font-bold text-sm">การแจ้งเตือน</p>
            <p className="text-xs text-white/90">{alertMsg.text}</p>
          </div>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className={`w-64 border-r flex flex-col shrink-0 h-screen sticky top-0 transition-all duration-300 ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-850 shadow-[2px_0_12px_rgba(0,0,0,0.015)]'
      }`}>
        {/* LOGO & TITLE */}
        <div className={`p-6 flex items-center gap-3 border-b ${
          darkMode ? 'border-white/10' : 'border-slate-100'
        }`}>
          <div className={`w-10 h-10 rounded-xl p-1 flex items-center justify-center shadow-inner overflow-hidden border ${
            darkMode ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-200'
          }`}>
            <img src={settings.schoolLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-[10px] font-black leading-tight uppercase tracking-wider ${
              darkMode ? 'text-slate-400' : 'text-slate-400'
            }`}>
              {currentUserProfile.role === 'academic' ? 'ฝ่ายวิชาการ' : 'คุณครูผู้สอน'}
            </h1>
            <p className={`text-xs font-black truncate ${
              darkMode ? 'text-white' : 'text-slate-800'
            }`}>{settings.schoolName}</p>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 py-6 space-y-1.5 overflow-y-auto px-3">
          <div className="px-3 text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">เมนูหลัก</div>
          
          {/* SHARED HOME LINK */}
          <button 
            onClick={() => setCurrentTab('home')}
            className={getNavLinkClass('home')}
          >
            <Activity className="w-5 h-5" />
            <span>แดชบอร์ดสรุปผล</span>
          </button>

          {/* TEACHER EXCLUSIVE MENU */}
          {currentUserProfile.role === 'teacher' && (
            <>
              <button 
                onClick={() => setCurrentTab('submitWork')}
                className={getNavLinkClass('submitWork')}
              >
                <Upload className="w-5 h-5" />
                <span>ส่งไฟล์งาน</span>
              </button>

              <button 
                onClick={() => setCurrentTab('history')}
                className={getNavLinkClass('history')}
              >
                <FileText className="w-5 h-5" />
                <span>ประวัติส่งงาน</span>
              </button>
            </>
          )}

          {/* ACADEMIC EXCLUSIVE MENUS */}
          {currentUserProfile.role === 'academic' && (
            <>
              <button 
                onClick={() => setCurrentTab('submissions')}
                className={getNavLinkClass('submissions')}
              >
                <FileText className="w-5 h-5" />
                <span>รายการส่งไฟล์งาน</span>
              </button>

              <button 
                onClick={() => setCurrentTab('teachers')}
                className={getNavLinkClass('teachers')}
              >
                <Users className="w-5 h-5" />
                <span>จัดการข้อมูลครู</span>
              </button>

              <button 
                onClick={() => setCurrentTab('settings')}
                className={getNavLinkClass('settings')}
              >
                <Settings className="w-5 h-5" />
                <span>ตั้งค่าแบรนด์ & ระบบ</span>
              </button>

              <button 
                onClick={() => setCurrentTab('logs')}
                className={getNavLinkClass('logs')}
              >
                <Activity className="w-5 h-5" />
                <span>บันทึกการใช้งาน (Log)</span>
              </button>
            </>
          )}
        </nav>

        {/* LOGGED USER PROFILE BOTTOM SECTION */}
        <div className={`p-4 border-t transition-colors ${
          darkMode ? 'border-white/10 bg-slate-950/40' : 'border-slate-100 bg-slate-50/70'
        }`}>
          <div className="flex items-center gap-3">
            <div 
              onClick={handleOpenProfileModal}
              className={`flex items-center gap-3 flex-1 min-w-0 cursor-pointer p-1.5 rounded-xl transition-all group ${
                darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-200/50'
              }`}
              title="แก้ไขข้อมูลส่วนตัว"
            >
              <div className="relative">
                {renderAvatar(currentUserProfile.profilePic, currentUserProfile.name, "w-10 h-10 text-xs", "rounded-xl")}
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-black truncate transition-colors ${
                  darkMode ? 'text-white group-hover:text-sky-400' : 'text-slate-800 group-hover:text-indigo-600'
                }`}>{currentUserProfile.name}</p>
                <p className={`text-[10px] truncate font-mono ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>{currentUserProfile.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className={`p-2 rounded-xl transition-colors shrink-0 ${
                darkMode ? 'text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10' : 'text-slate-500 hover:text-red-600 bg-slate-150 hover:bg-slate-200'
              }`}
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        {/* HEADER */}
        <header className={`h-16 flex items-center justify-between px-8 border-b sticky top-0 z-40 backdrop-blur-md transition-colors duration-300 ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/70 border-slate-200'
        }`}>
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-black tracking-tight">{settings.websiteTitle}</h2>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-[10px] font-black rounded-md uppercase tracking-wider">
              {currentUserProfile.role === 'academic' ? 'ACADEMIC ADMIN' : 'TEACHER AREA'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* DARK MODE TOGGLE */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition-colors ${
                darkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* NOTIFICATIONS BOX */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className={`p-2 rounded-xl border relative transition-colors ${
                  darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700/80' : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
                title="การแจ้งเตือน"
              >
                <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                {showNotificationCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
                    {showNotificationCount}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <div className={`absolute right-0 mt-3 w-80 md:w-96 rounded-2xl shadow-xl border z-50 overflow-hidden ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <div className={`p-4 flex items-center justify-between border-b ${
                    darkMode ? 'border-slate-800/80 bg-slate-950/20' : 'border-slate-100 bg-slate-50/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-sky-500" />
                      <span className="font-bold text-sm">การแจ้งเตือน</span>
                      {showNotificationCount > 0 && (
                        <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[9px] font-bold">
                          ใหม่ {showNotificationCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {showNotificationCount > 0 && (
                        <button 
                          onClick={markAllNotificationsAsRead}
                          className="text-[11px] text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 font-bold transition-colors mr-2"
                        >
                          อ่านทั้งหมด
                        </button>
                      )}
                      <button 
                        onClick={() => setShowNotificationDropdown(false)}
                        className={`p-1 rounded-lg transition-colors ${
                          darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className={`max-h-80 overflow-y-auto divide-y ${
                    darkMode ? 'divide-slate-800' : 'divide-slate-100'
                  }`}>
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                        <div className={`p-3 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                          <Bell className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-xs text-slate-400">ไม่มีการแจ้งเตือนในขณะนี้</p>
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => markNotificationAsRead(item.id)}
                          className={`p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors relative ${
                            !item.read ? (darkMode ? 'bg-sky-500/5' : 'bg-sky-50/30') : ''
                          }`}
                        >
                          {!item.read && (
                            <span className="absolute left-2.5 top-5 w-2 h-2 rounded-full bg-sky-500"></span>
                          )}
                          <div className="flex-1 min-w-0 pl-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <p className={`text-xs font-bold leading-snug truncate ${
                                !item.read ? 'text-sky-600 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'
                              }`}>
                                {item.title}
                              </p>
                              <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                {formatTimeAgo(item.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {item.message}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(item.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all self-center shrink-0"
                            title="ลบแจ้งเตือน"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* EXPORT BUTTON EXCLUSIVE FOR ACADEMIC */}
            {currentUserProfile.role === 'academic' && (
              <button 
                onClick={handleExportCSV}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-500/20 flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                ส่งออก CSV (Excel)
              </button>
            )}
          </div>
        </header>

        {/* INNER CONTENT AREA */}
        <div className="p-8 flex-1 flex flex-col gap-8 max-w-7xl w-full mx-auto">
          
          {/* TAB: HOME / DASHBOARD */}
          {currentTab === 'home' && (
            <div className="space-y-8 animate-fade-in">
              {/* BRANDING INTRO BANNER */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-600/10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3"></div>
                <div className="relative z-10 flex items-center gap-6">
                  <div className="w-16 h-16 bg-white p-2 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                    <img src={settings.schoolLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold tracking-tight">ยินดีต้อนรับสู่ระบบส่งไฟล์งาน</h3>
                    <p className="text-sm text-white/90 font-medium mt-1">
                      {settings.schoolName} — เข้าสู่ระบบเป็น: <span onClick={handleOpenProfileModal} className="font-bold underline cursor-pointer hover:text-indigo-200 transition-colors" title="คลิกเพื่อแก้ไขข้อมูลส่วนตัว">{currentUserProfile.name}</span> ({currentUserProfile.position})
                    </p>
                  </div>
                </div>
              </div>

              {/* OVERVIEW METRICS: ACADEMIC VERSION */}
              {currentUserProfile.role === 'academic' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className={`p-6 rounded-2xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">จำนวนคุณครูทั้งหมด</p>
                        <h4 className="text-3xl font-black mt-2">{totalTeachers} คน</h4>
                      </div>
                      <Users className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">งานที่ส่งแล้ว</p>
                        <h4 className="text-3xl font-black mt-2 text-indigo-600 dark:text-indigo-400">{totalSubmissions} งาน</h4>
                      </div>
                      <FileText className="w-8 h-8 text-indigo-500" />
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">กำลังรอตรวจ</p>
                        <h4 className="text-3xl font-black mt-2 text-amber-500">{statSubmitted + statChecking} งาน</h4>
                      </div>
                      <Clock className="w-8 h-8 text-amber-500" />
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ตรวจเสร็จสิ้น</p>
                        <h4 className="text-3xl font-black mt-2 text-emerald-500">{statApproved} งาน</h4>
                      </div>
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                  </div>
                </div>
              )}

              {/* OVERVIEW METRICS: TEACHER VERSION */}
              {currentUserProfile.role === 'teacher' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Profile Summary Card */}
                  <div 
                    onClick={handleOpenProfileModal}
                    className={`p-6 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] duration-200 group ${
                      darkMode ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-100 hover:border-indigo-500/50 shadow-sm hover:shadow-md'
                    }`}
                    title="แก้ไขข้อมูลส่วนตัว"
                  >
                    <div className="relative">
                      {renderAvatar(currentUserProfile.profilePic, currentUserProfile.name, "w-14 h-14 text-sm", "rounded-full")}
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{currentUserProfile.name}</h4>
                      <p className="text-xs text-slate-400 font-medium">{currentUserProfile.position} • {currentUserProfile.subjectGroup}</p>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">จำนวนงานของฉัน</p>
                        <h4 className="text-3xl font-black mt-2 text-indigo-600 dark:text-indigo-400">{teacherSubmissions.length} งาน</h4>
                      </div>
                      <FileText className="w-8 h-8 text-indigo-500" />
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">กำลังตรวจสอบ</p>
                        <h4 className="text-3xl font-black mt-2 text-amber-500">{teacherStatSubmitted + teacherStatChecking} งาน</h4>
                      </div>
                      <Clock className="w-8 h-8 text-amber-500" />
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ผ่านการตรวจแล้ว</p>
                        <h4 className="text-3xl font-black mt-2 text-emerald-500">{teacherStatApproved} งาน</h4>
                      </div>
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                  </div>
                </div>
              )}

              {/* GRAPHS AND CHARTS: DYNAMIC DATA */}
              {currentUserProfile.role === 'academic' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Graph 1: Status Distribution */}
                  <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/50 shadow-sm'}`}>
                    <h4 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider mb-6">ความคืบหน้าการตรวจงานรวม</h4>
                    <div className="h-64 flex items-center justify-center">
                      {statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-8">
                          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">ยังไม่มีข้อมูลการส่งไฟล์งานในระบบ</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Graph 2: Subject Groups Stats */}
                  <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/50 shadow-sm'}`}>
                    <h4 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider mb-6">จำนวนไฟล์งานแยกตามกลุ่มสาระการเรียนรู้</h4>
                    <div className="h-64">
                      {subjectGroupStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={subjectGroupStats}>
                            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="ส่งไฟล์แล้ว" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-8 flex flex-col justify-center h-full">
                          <p className="text-sm text-slate-400">ไม่มีสถิติกลุ่มสาระ</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* LIST OF ALL TEACHERS FOR BOTH ROLES TO COMPLY WITH: "สามารถเห็นได้เพียงรายชื่อครูทั้งหมด" */}
              <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/50 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="font-black text-base text-slate-700 dark:text-white">ทำเนียบคุณครูโรงเรียนเทศบาล 4</h4>
                    <p className="text-xs text-slate-400 mt-1">รายชื่อคณะครูผู้ใช้งานระบบส่งไฟล์วิชาการทั้งหมด</p>
                  </div>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-500">
                    ครูทั้งหมด {teachers.length} คน
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teachers.map(teacher => (
                    <div 
                      key={teacher.id}
                      className={`p-4 rounded-2xl border flex items-center gap-4 transition-all hover:scale-[1.02] ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                        <img src={teacher.profilePic} alt={teacher.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-sm font-bold truncate">{teacher.name}</h5>
                        <p className="text-xs text-slate-400 truncate">{teacher.position}</p>
                        <p className="text-[10px] text-sky-500 mt-0.5 truncate">{teacher.subjectGroup}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUBMISSIONS TABLE FOR ACADEMIC */}
          {currentTab === 'submissions' && currentUserProfile.role === 'academic' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black">รายการตรวจสอบไฟล์งานเอกสาร</h3>
                  <p className="text-xs text-slate-400 mt-1">ฝ่ายวิชาการสามารถเปิดตรวจไฟล์ ดาวน์โหลด แสดงความคิดเห็น และปรับปรุงสถานะได้ที่นี่</p>
                </div>
              </div>

              {/* SEARCH & FILTERS */}
              <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <div className="relative flex-1 min-w-[280px]">
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่อครู หรือหัวข้อเอกสาร..." 
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 transition-all outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-300"
                  />
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">สถานะ:</span>
                  <select 
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none text-slate-900 dark:text-white"
                  >
                    <option value="all">ทั้งหมด ({submissions.length})</option>
                    <option value="submitted">ส่งแล้ว ({submissions.filter(s => s.status === 'submitted').length})</option>
                    <option value="checking">กำลังตรวจ ({submissions.filter(s => s.status === 'checking').length})</option>
                    <option value="needs_edit">ส่งกลับแก้ไข ({submissions.filter(s => s.status === 'needs_edit').length})</option>
                    <option value="approved">ตรวจแล้ว ({submissions.filter(s => s.status === 'approved').length})</option>
                  </select>
                </div>
              </div>

              {/* DATA TABLE */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">คุณครูผู้ส่ง</th>
                        <th className="px-6 py-4">รายละเอียดงาน & ไฟล์เอกสาร</th>
                        <th className="px-6 py-4 text-center">วัน-เวลาที่ส่ง</th>
                        <th className="px-6 py-4 text-center">สถานะ</th>
                        <th className="px-6 py-4 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {currentSubmissions.map((sub) => {
                        const isApproved = sub.status === 'approved';
                        const isSubmitted = sub.status === 'submitted';
                        const isChecking = sub.status === 'checking';
                        const isNeedsEdit = sub.status === 'needs_edit';

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full border overflow-hidden bg-slate-100">
                                  <img src={sub.teacherProfilePic} alt={sub.teacherName} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-700 dark:text-white">{sub.teacherName}</p>
                                  <p className="text-[10px] text-slate-400">{sub.teacherSubjectGroup}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-slate-800 dark:text-slate-100">{sub.title}</p>
                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] rounded-md font-bold shrink-0">
                                  {sub.type}
                                </span>
                                {sub.deadline && (
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] rounded-md font-bold flex items-center gap-1 shrink-0">
                                    <Calendar className="w-2.5 h-2.5 text-slate-400" />
                                    กำหนดส่ง: {(() => {
                                      const match = (Object.values(activeDeadlines) as { date: string; label: string }[]).find(d => d.date === sub.deadline);
                                      return match ? match.label : sub.deadline;
                                    })()}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{sub.description}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] rounded-md font-bold uppercase">
                                  .{sub.fileType}
                                </span>
                                <button 
                                  onClick={() => handleDownloadFile(sub)}
                                  className="text-xs text-sky-500 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                  title="ดาวน์โหลดไฟล์เอกสาร"
                                >
                                  <Download className="w-3 h-3" />
                                  {sub.fileName}
                                </button>
                                <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>
                                <button 
                                  onClick={() => handleDownloadFile(sub)}
                                  className="text-xs text-indigo-500 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                  title="ดาวน์โหลดและเปิดไฟล์โดยตรง"
                                >
                                  <Eye className="w-3 h-3" />
                                  เปิดไฟล์โดยตรง
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <p className="font-medium text-slate-600 dark:text-slate-300">
                                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''} น.
                              </p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isSubmitted && (
                                <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-xs font-bold rounded-full inline-flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> ส่งแล้ว
                                </span>
                              )}
                              {isChecking && (
                                <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full inline-flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> กำลังตรวจ
                                </span>
                              )}
                              {isNeedsEdit && (
                                <span className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-full inline-flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> แก้ไข
                                </span>
                              )}
                              {isApproved && (
                                <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full inline-flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ตรวจแล้ว
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => {
                                  setSelectedSubmission(sub);
                                  setFeedbackText(sub.comments || '');
                                  setShowSubmissionModal(true);
                                  // Auto progress status to "กำลังตรวจ" if status is "ส่งแล้ว"
                                  if (sub.status === 'submitted') {
                                    updateDoc(doc(db, 'submissions', sub.id), { status: 'checking' });
                                  }
                                }}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 ml-auto"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                เปิดตรวจงาน
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {currentSubmissions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            ไม่พบข้อมูลผลการส่งเอกสารตามเงื่อนไขที่กำหนด
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION PANEL */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    แสดงรายการที่ {filteredSubmissions.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredSubmissions.length)} จากทั้งหมด {filteredSubmissions.length} รายการ
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs disabled:opacity-40"
                    >
                      ก่อนหน้า
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold ${
                          currentPage === i + 1 
                            ? 'bg-sky-500 text-white shadow-md' 
                            : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs disabled:opacity-40"
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUBMIT WORK FORM FOR TEACHER */}
          {currentTab === 'submitWork' && currentUserProfile.role === 'teacher' && (
            <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-black">แบบฟอร์มส่งไฟล์งานวิชาการ</h3>
                <p className="text-xs text-slate-400 mt-1">กรอกข้อมูลงานวิชาการและเลือกไฟล์ที่ต้องการส่งเพื่อขออนุมัติจากฝ่ายวิชาการ</p>
              </div>

              <form onSubmit={triggerAddSubmissionConfirm} className={`p-8 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/50 shadow-sm'} space-y-6`}>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ชื่องานวิชาการ *</label>
                  <input 
                    type="text" 
                    placeholder="เช่น แผนการสอนคอมพิวเตอร์ ภาคเรียนที่ 1/2569" 
                    value={submissionForm.title}
                    onChange={e => setSubmissionForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none rounded-xl text-sm transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">รายละเอียดเพิ่มเติม</label>
                  <textarea 
                    placeholder="ระบุวัตถุประสงค์ หรือหมายเหตุชี้แจงเพิ่มเติม..." 
                    value={submissionForm.description}
                    onChange={e => setSubmissionForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none rounded-xl text-sm transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ประเภทงานวิชาการ</label>
                  <select 
                    value={submissionForm.type}
                    onChange={e => setSubmissionForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none rounded-xl text-sm transition-all text-slate-900 dark:text-white"
                  >
                    <option value="แผนการจัดการเรียนรู้">แผนการจัดการเรียนรู้ (Lesson Plan)</option>
                    <option value="รายงานผลการสอน">รายงานผลการสอนออนไลน์ / ออนไซต์</option>
                    <option value="โครงการวิชาการ">สรุปงานโครงการพัฒนากิจกรรมโรงเรียน</option>
                    <option value="บันทึกการประชุม">บันทึกการประชุมกลุ่มสาระสารสนเทศ</option>
                    <option value="อื่นๆ">อื่นๆ (ผลงานทางวิชาการ / วิจัยชั้นเรียน)</option>
                  </select>
                  <div className="mt-2.5 flex items-center gap-2.5 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl text-xs">
                    <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">วันครบกำหนดส่ง:</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
                        {activeDeadlines[submissionForm.type]?.label || 'ไม่ระบุ'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* FILE ATTACHMENT BOX */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">อัปโหลดไฟล์เอกสาร *</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/10 rounded-2xl p-6 text-center cursor-pointer transition-all duration-300"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden" 
                    />
                    <FileUp className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    {submissionForm.fileName ? (
                      <div>
                        <p className="text-sm font-bold text-indigo-500">{submissionForm.fileName}</p>
                        <p className="text-xs text-slate-400 mt-1">{(submissionForm.fileSize / 1024).toFixed(1)} KB (พร้อมส่งไฟล์)</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold">คลิกที่นี่เพื่อแนบไฟล์เอกสารงาน</p>
                        <p className="text-xs text-slate-400 mt-1">
                          รองรับ PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, ZIP ขนาดไม่เกิน {settings.maxFileSize} MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {submitting ? 'กำลังส่งเอกสาร...' : 'ส่งงานไฟล์งานวิชาการ'}
                </button>
              </form>
            </div>
          )}

          {/* TAB: HISTORY OF SUBMISSIONS FOR TEACHER */}
          {currentTab === 'history' && currentUserProfile.role === 'teacher' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-black">ประวัติการจัดส่งเอกสารวิชาการของฉัน</h3>
                <p className="text-xs text-slate-400 mt-1">ตรวจสอบสถานะ ความคิดเห็น และข้อเสนอแนะที่ส่งกลับมาจากหัวหน้าฝ่ายวิชาการ</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">หมวดหมู่ & ชื่องาน</th>
                        <th className="px-6 py-4">ไฟล์เอกสารแนบ</th>
                        <th className="px-6 py-4 text-center">กำหนดส่ง</th>
                        <th className="px-6 py-4 text-center">วันที่จัดส่ง</th>
                        <th className="px-6 py-4 text-center">สถานะการตรวจ</th>
                        <th className="px-6 py-4 text-center">การจัดการ</th>
                        <th className="px-6 py-4 text-right">ความคิดเห็น/หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {teacherSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800 dark:text-slate-100">{sub.title}</p>
                            <p className="text-xs text-slate-400">{sub.type}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 text-left">
                              <button 
                                onClick={() => handleDownloadFile(sub)}
                                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-1.5 cursor-pointer text-left"
                                title="คลิกเพื่อดาวน์โหลดและเปิดไฟล์โดยตรง"
                              >
                                <span className="text-sm select-none">📄</span>
                                {sub.fileName}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {sub.deadline ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                  {(() => {
                                    const match = (Object.values(activeDeadlines) as { date: string; label: string }[]).find(d => d.date === sub.deadline);
                                    if (match) return match.label;
                                    try {
                                      return new Date(sub.deadline).toLocaleDateString('th-TH');
                                    } catch {
                                      return sub.deadline;
                                    }
                                  })()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">ไม่ระบุ</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <p className="font-medium text-slate-600 dark:text-slate-300">
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('th-TH') : '-'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''} น.
                            </p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {sub.status === 'submitted' && (
                              <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-xs font-bold rounded-full">
                                ส่งแล้ว
                              </span>
                            )}
                            {sub.status === 'checking' && (
                              <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full">
                                กำลังตรวจ
                              </span>
                            )}
                            {sub.status === 'needs_edit' && (
                              <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-full">
                                แก้ไข
                              </span>
                            )}
                            {sub.status === 'approved' && (
                              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full">
                                ตรวจแล้ว
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setSubmissionToCancel(sub)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold rounded-xl inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:shadow"
                              title="ยกเลิกการส่งไฟล์งานชิ้นนี้"
                            >
                              <Trash className="w-3 h-3 text-rose-500" />
                              ยกเลิกส่งงาน
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right max-w-xs truncate">
                            <span className="text-xs text-slate-500 italic">
                              {sub.comments || 'รอข้อเสนอแนะจากฝ่ายวิชาการ'}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {teacherSubmissions.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            ยังไม่มีบันทึกประวัติการส่งไฟล์งานของคุณ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MANAGE TEACHERS FOR ACADEMIC */}
          {currentTab === 'teachers' && currentUserProfile.role === 'academic' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black">จัดการข้อมูลคณะครูผู้สอน</h3>
                  <p className="text-xs text-slate-400 mt-1">ฝ่ายวิชาการสามารถสร้างบัญชี รีเซ็ตรหัสผ่าน และเปิดหรือปิดการเข้าใช้ระบบของคณะครูรายคน</p>
                </div>
                <button 
                  onClick={() => {
                    setTeacherForm({
                      name: '',
                      email: '',
                      password: 'password123',
                      position: 'ครู',
                      subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี',
                      profilePic: '',
                      role: 'teacher',
                      status: 'active'
                    });
                    setEditingTeacher(null);
                    setShowTeacherModal(true);
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/10 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มครูคนใหม่
                </button>
              </div>

              {/* TEACHERS DATA GRID */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">รูปโปรไฟล์ & ชื่อคุณครู</th>
                        <th className="px-6 py-4">กลุ่มสาระการสอน</th>
                        <th className="px-6 py-4">ตำแหน่ง</th>
                        <th className="px-6 py-4">ข้อมูลอีเมล & รหัสผ่าน</th>
                        <th className="px-6 py-4 text-center">สถานะบัญชี</th>
                        <th className="px-6 py-4 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {teachers.map((teacher) => (
                        <tr key={teacher.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full border overflow-hidden bg-slate-100">
                                <img src={teacher.profilePic} alt={teacher.name} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-700 dark:text-white">{teacher.name}</p>
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-bold rounded">
                                  ID: {teacher.id}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg">
                              {teacher.subjectGroup}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-600 dark:text-slate-300">{teacher.position}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5 text-left">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{teacher.email}</p>
                              <p className="text-[11px] text-slate-400 font-mono">รหัส: {teacher.password || 'password123'}</p>
                              <button 
                                onClick={() => handleDeleteTeacher(teacher)}
                                className="mt-1 text-[11px] text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-bold flex items-center gap-1 transition-colors self-start cursor-pointer border border-rose-200/50 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 px-2 py-1 rounded-lg"
                                title="คลิกเพื่อลบรายชื่อและข้อมูลคุณครูคนนี้ออกจากระบบ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                ลบรายชื่อครู
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={async () => {
                                const newStatus = teacher.status === 'active' ? 'inactive' : 'active';
                                await updateDoc(doc(db, 'teachers', teacher.id), { status: newStatus });
                                addLog("เปลี่ยนสถานะสิทธิ์", `ปรับบัญชีของ ${teacher.name} เป็น ${newStatus === 'active' ? 'พร้อมใช้งาน' : 'ปิดใช้งาน'}`);
                                setAlertMsg({ type: 'success', text: 'สลับสิทธิ์การเข้าใช้งานเสร็จสิ้น' });
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                teacher.status === 'active' 
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' 
                                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {teacher.status === 'active' ? '● ใช้งานอยู่' : '● ปิดใช้งาน'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button 
                                onClick={() => {
                                  setTeacherForm({
                                    name: teacher.name,
                                    email: teacher.email,
                                    password: teacher.password || 'password123',
                                    position: teacher.position,
                                    subjectGroup: teacher.subjectGroup,
                                    profilePic: teacher.profilePic,
                                    role: teacher.role,
                                    status: teacher.status
                                  });
                                  setEditingTeacher(teacher);
                                  setShowTeacherModal(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-sky-500 bg-slate-100 hover:bg-sky-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg"
                                title="แก้ไขข้อมูลครู"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteTeacher(teacher)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg"
                                title="ลบชื่อครู"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SYSTEM BRANDING & RULES FOR ACADEMIC */}
          {currentTab === 'settings' && currentUserProfile.role === 'academic' && (
            <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-black">ตั้งค่าแบรนด์โรงเรียนและขอบเขตระบบ</h3>
                <p className="text-xs text-slate-400 mt-1">ตั้งค่าชื่อสถาบัน สีธีมเว็บไซต์ รูปโลโก้โรงเรียน ข้อมูลขนาดและนามสกุลไฟล์ที่กำหนด</p>
              </div>

              <form onSubmit={handleSaveSettings} className={`p-8 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/50 shadow-sm'} space-y-6`}>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ชื่อสถานศึกษา / โรงเรียน</label>
                  <input 
                    type="text" 
                    value={settings.schoolName}
                    onChange={e => setSettings(prev => ({ ...prev, schoolName: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none rounded-xl text-sm transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">หัวเรื่องบนเว็บไซต์ (Website Title)</label>
                  <input 
                    type="text" 
                    value={settings.websiteTitle}
                    onChange={e => setSettings(prev => ({ ...prev, websiteTitle: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none rounded-xl text-sm transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">คำชี้แจงหน้าแรก (Login Welcome Message)</label>
                  <textarea 
                    value={settings.loginMessage}
                    onChange={e => setSettings(prev => ({ ...prev, loginMessage: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none rounded-xl text-sm transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">จำกัดขนาดไฟล์สูงสุด (MB)</label>
                    <input 
                      type="number" 
                      value={settings.maxFileSize}
                      onChange={e => setSettings(prev => ({ ...prev, maxFileSize: Number(e.target.value) }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none rounded-xl text-sm transition-all text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">โลโก้โรงเรียน (URL รูปภาพ)</label>
                    <input 
                      type="text" 
                      value={settings.schoolLogo}
                      onChange={e => setSettings(prev => ({ ...prev, schoolLogo: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none rounded-xl text-sm transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                    <h4 className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">กำหนดวันครบกำหนดส่งงานตามประเภทเอกสาร</h4>
                  </div>
                  
                  <div className="space-y-3.5">
                    {Object.keys(activeDeadlines).map((category) => {
                      const item = activeDeadlines[category] || { date: '', label: '' };
                      return (
                        <div key={category} className="p-4 sm:p-5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center gap-3 shrink-0 min-w-[200px]">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-inner">
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-sm font-black text-slate-800 dark:text-slate-100">{category}</span>
                              <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5 font-bold uppercase tracking-wider">วันครบกำหนดส่งงาน</p>
                            </div>
                          </div>
                          
                          <div className="flex-1 grid grid-cols-2 gap-4 max-w-md">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">วันที่ครบกำหนด</label>
                              <input
                                type="date"
                                value={item.date}
                                onChange={(e) => {
                                  const newDate = e.target.value;
                                  const newLabel = formatDateToThaiLabel(newDate);
                                  setSettings((prev) => ({
                                    ...prev,
                                    deadlines: {
                                      ...(prev.deadlines || ASSIGNMENT_DEADLINES),
                                      [category]: { date: newDate, label: newLabel }
                                    }
                                  }));
                                }}
                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 outline-none rounded-xl text-xs font-semibold transition-all text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">แสดงผลภาษาไทย</label>
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) => {
                                  const newLabel = e.target.value;
                                  setSettings((prev) => ({
                                    ...prev,
                                    deadlines: {
                                      ...(prev.deadlines || ASSIGNMENT_DEADLINES),
                                      [category]: { ...item, label: newLabel }
                                    }
                                  }));
                                }}
                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 outline-none rounded-xl text-xs font-semibold transition-all text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-extrabold tracking-widest text-slate-400 uppercase">จัดการระบบฐานข้อมูลสำรอง (Backup & Restore)</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={handleBackupDB}
                      className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <DownloadCloud className="w-4 h-4" />
                      ส่งออกสำรองระบบ
                    </button>

                    <label className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
                      <UploadCloud className="w-4 h-4" />
                      กู้คืนจากไฟล์สำรอง
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleRestoreDB} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  บันทึกความเปลี่ยนแปลงระบบ
                </button>
              </form>
            </div>
          )}

          {/* TAB: ACTIVITY SYSTEM LOGS FOR ACADEMIC */}
          {currentTab === 'logs' && currentUserProfile.role === 'academic' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-black">ประวัติการใช้งานระบบ (Activity Logs)</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">บันทึกประวัติการกระทำและดำเนินงานทางวิชาการของครูทุกท่านแบบเรียลไทม์</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">บันทึกล่าสุด 100 รายการ</span>
                  <button 
                    onClick={handleClearLogs}
                    className="text-xs text-rose-500 hover:text-rose-600 font-bold hover:underline transition-colors duration-200"
                  >
                    ล้างการแสดงผล
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-3">วัน-เวลาบันทึก</th>
                        <th className="px-6 py-3">ผู้กระทำ</th>
                        <th className="px-6 py-3">ระดับสิทธิ์</th>
                        <th className="px-6 py-3">การกระทำ</th>
                        <th className="px-6 py-3">คำอธิบายรายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors">
                          <td className="px-6 py-3 font-mono">
                            {new Date(log.createdAt).toLocaleString('th-TH')}
                          </td>
                          <td className="px-6 py-3 text-slate-900 dark:text-white font-bold">
                            {log.userName}
                          </td>
                          <td className="px-6 py-3 uppercase">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.userRole === 'academic' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {log.userRole === 'academic' ? 'วิชาการ' : 'คุณครู'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sky-600 dark:text-sky-400 font-bold">
                            {log.action}
                          </td>
                          <td className="px-6 py-3 text-slate-500 italic max-w-sm truncate">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL: EDIT PERSONAL PROFILE */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-scale-up text-slate-800 dark:text-slate-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-sky-500" />
                <h4 className="font-extrabold text-base">แก้ไขข้อมูลส่วนตัว</h4>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {/* Profile Image Section */}
              <div className="flex flex-col items-center justify-center gap-3 bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="relative group">
                  {renderAvatar(profileForm.profilePic, profileForm.name, "w-20 h-20 text-xl", "rounded-full")}
                  <label className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
                    <Camera className="w-5 h-5 text-white mb-1" />
                    <span className="text-[9px] text-white font-bold">อัปโหลดภาพ</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleProfilePicFileChange} 
                      className="hidden" 
                    />
                  </label>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 font-medium block">คลิกที่รูปภาพเพื่ออัปโหลดไฟล์ หรือกรอก URL ด้านล่าง</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">ลิ้งก์รูปภาพโปรไฟล์ (Image URL)</label>
                <input 
                  type="text" 
                  value={profileForm.profilePic}
                  onChange={e => setProfileForm(prev => ({ ...prev, profilePic: e.target.value }))}
                  placeholder="https://example.com/profile.jpg"
                  className="w-full text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">ชื่อ-นามสกุล *</label>
                <input 
                  type="text" 
                  required
                  value={profileForm.name}
                  onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition-all font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">ตำแหน่ง</label>
                  <select 
                    value={profileForm.position}
                    onChange={e => setProfileForm(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:border-sky-500 transition-all"
                  >
                    {POSITIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">กลุ่มสาระการเรียนรู้</label>
                  <select 
                    value={profileForm.subjectGroup}
                    disabled={currentUserProfile?.role === 'academic'}
                    onChange={e => setProfileForm(prev => ({ ...prev, subjectGroup: e.target.value }))}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:border-sky-500 transition-all disabled:opacity-60"
                  >
                    {SUBJECT_GROUPS.map(sg => (
                      <option key={sg} value={sg}>{sg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">รหัสผ่านสำหรับเข้าใช้งานระบบ</label>
                <input 
                  type="password" 
                  value={profileForm.password}
                  onChange={e => setProfileForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="ปล่อยว่างหากไม่ต้องการเปลี่ยน"
                  className="w-full text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition-all font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={profileSaving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {profileSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT TEACHER */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-scale-up text-slate-800 dark:text-slate-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <h4 className="font-extrabold text-base">
                {editingTeacher ? 'แก้ไขข้อมูลคุณครู' : 'เพิ่มรายชื่อครูและสร้างบัญชีใหม่'}
              </h4>
              <button 
                onClick={() => { setShowTeacherModal(false); setEditingTeacher(null); }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">ชื่อ-นามสกุล *</label>
                <input 
                  type="text" 
                  value={teacherForm.name}
                  onChange={e => setTeacherForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="เช่น ครูวิมล สมใจ"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 outline-none rounded-xl text-sm transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">อีเมลผู้ใช้งาน (Email) *</label>
                <input 
                  type="email" 
                  value={teacherForm.email}
                  onChange={e => setTeacherForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="wimon@school.ac.th"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 outline-none rounded-xl text-sm transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">รหัสผ่านของระบบ (Password)</label>
                <input 
                  type="text" 
                  value={teacherForm.password}
                  onChange={e => setTeacherForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="password123"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 outline-none rounded-xl text-sm transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">ตำแหน่ง</label>
                  <select 
                    value={teacherForm.position}
                    onChange={e => setTeacherForm(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none text-slate-900 dark:text-white"
                  >
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">กลุ่มสาระการเรียนรู้</label>
                  <select 
                    value={teacherForm.subjectGroup}
                    onChange={e => setTeacherForm(prev => ({ ...prev, subjectGroup: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none text-slate-900 dark:text-white"
                  >
                    {SUBJECT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">สิทธิ์เข้าใช้งาน</label>
                  <select 
                    value={teacherForm.role}
                    onChange={e => setTeacherForm(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none text-slate-900 dark:text-white"
                  >
                    <option value="teacher">คุณครูผู้สอน (Teacher)</option>
                    <option value="academic">ฝ่ายวิชาการ (Academic)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">สถานะเริ่มต้น</label>
                  <select 
                    value={teacherForm.status}
                    onChange={e => setTeacherForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none text-slate-900 dark:text-white"
                  >
                    <option value="active">เปิดใช้งาน (Active)</option>
                    <option value="inactive">ปิดใช้งาน (Inactive)</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-sm shadow-lg shadow-sky-500/20 active:scale-95 transition-all mt-4"
              >
                บันทึกบัญชีคุณครู
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBMISSION REVIEW DETAILS FOR ACADEMIC */}
      {showSubmissionModal && selectedSubmission && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-scale-up text-slate-800 dark:text-slate-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <div>
                <h4 className="font-extrabold text-base">ตรวจประเมินผลงานเอกสารคุณครู</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">ผลงานของ: {selectedSubmission.teacherName} ({selectedSubmission.teacherSubjectGroup})</p>
              </div>
              <button 
                onClick={() => { setShowSubmissionModal(false); setSelectedSubmission(null); }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">หมวดหมู่ผลงาน</span>
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{selectedSubmission.type}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">วันครบกำหนดส่ง</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {selectedSubmission.deadline ? (
                      (() => {
                        const match = (Object.values(activeDeadlines) as { date: string; label: string }[]).find(d => d.date === selectedSubmission.deadline);
                        return match ? match.label : selectedSubmission.deadline;
                      })()
                    ) : 'ไม่ระบุ'}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">ชื่อเรื่องวิชาการ</span>
                <p className="text-base font-bold text-slate-900 dark:text-white">{selectedSubmission.title}</p>
              </div>

              {selectedSubmission.description && (
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">คำอธิบาย/ชี้แจง</span>
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800 mt-1">
                    {selectedSubmission.description}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-sky-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">{selectedSubmission.fileName}</p>
                    <p className="text-[10px] text-slate-400">{(selectedSubmission.fileSize / 1024).toFixed(1)} KB • สิทธิ์เข้าถึงแบบอ่านอย่างเดียว</p>
                  </div>
                </div>
                <div className="mt-1">
                  <button 
                    onClick={() => handleDownloadFile(selectedSubmission)}
                    className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
                    title="ดาวน์โหลดและเปิดไฟล์โดยตรง"
                  >
                    <Download className="w-4 h-4" />
                    ดาวน์โหลดและเปิดไฟล์โดยตรง
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  เพิ่มความคิดเห็น / ข้อเสนอแนะส่งกลับแก้ไข
                </label>
                <textarea 
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="เขียนคำแนะนำ คำชี้ชม หรือเหตุผลที่ส่งกลับแก้ไขที่นี่..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 outline-none rounded-xl text-xs transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400"
                />
              </div>

              {/* ACTION BUTTONS FOR EACH GRADE STATUS */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  onClick={() => handleReviewSubmission('needs_edit')}
                  className="py-3 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-rose-500/10 active:scale-95"
                >
                  <AlertCircle className="w-4 h-4" />
                  ส่งกลับแก้ไข (Needs Edit)
                </button>

                <button 
                  onClick={() => handleReviewSubmission('approved')}
                  className="py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
                >
                  <CheckCircle className="w-4 h-4" />
                  ตรวจผ่านแล้ว (Approved)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SECURE READ-ONLY FILE PREVIEW FOR ACADEMIC */}
      {showPreviewModal && previewSubmission && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl h-[90vh] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl flex flex-col text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-500">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base flex items-center gap-2">
                    ตัวอย่างเอกสารส่งตรวจ
                    {isEditMode ? (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[9px] font-black rounded uppercase tracking-wider animate-pulse">
                        โหมดแก้ไขออนไลน์จริง
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 text-[9px] font-black rounded uppercase tracking-wider">
                        โหมดพรีวิวข้อมูล
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    ไฟล์: <span className="font-bold text-slate-700 dark:text-slate-300">{previewSubmission.fileName}</span> (.{previewSubmission.fileType}) • ส่งโดย: {previewSubmission.teacherName} ({previewSubmission.teacherSubjectGroup})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveFileEdits}
                      disabled={submitting}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขในระบบ'}
                    </button>
                    <button
                      onClick={() => setIsEditMode(false)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    แก้ไขไฟล์เอกสารนี้
                  </button>
                )}

                <button 
                  onClick={() => { setShowPreviewModal(false); setPreviewSubmission(null); }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-bold transition-colors"
                >
                  ✕ ปิดหน้าต่างนี้
                </button>
              </div>
            </div>

            {/* Viewer Content Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-100/50 dark:bg-slate-950/40 flex flex-col gap-4">
              {/* Alert Status Banner */}
              {isEditMode ? (
                <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2.5 shrink-0 animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>โหมดแก้ไขไฟล์เอกสารแบบเรียลไทม์: คุณสามารถกรอกข้อความ ปรับระดับสถิติ และแก้ไขเนื้อหาในฟิลด์จำลองด้านล่างนี้ได้โดยตรง เมื่อกดบันทึกแล้ว ระบบจะอัปเดตไฟล์จริงทันที</span>
                </div>
              ) : (
                <div className="px-4 py-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-2.5 shrink-0">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>คุณกำลังเปิดดูไฟล์ต้นฉบับส่งตรวจจากคุณครู สามารถคลิกปุ่ม "แก้ไขไฟล์เอกสารนี้" ที่ด้านบนเพื่อเข้าสู่การแก้ไขเนื้อหาและบันทึกข้อมูลแบบเรียลไทม์</span>
                </div>
              )}

              {/* Render based on file types */}
              <div className="flex-1 flex flex-col justify-stretch min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                {isPdfFile(previewSubmission.fileType) && wordData && (
                  <div className="w-full h-full bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 flex flex-col md:flex-row gap-4 overflow-hidden">
                    {/* Left Frame: Live PDF View */}
                    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm relative">
                      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          📄 เอกสารต้นฉบับพรีวิว .PDF (สิทธิ์ปลอดภัยพิเศษ)
                        </span>
                      </div>
                      
                      <iframe 
                        src={previewSubmission.fileUrl} 
                        className="flex-1 w-full h-full border-none" 
                        title={previewSubmission.fileName}
                      />
                    </div>

                    {/* Right Panel: Appraisal & Dynamic Stamp Hub */}
                    <div className="w-full md:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto text-left">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-600">Appraisal Hub</span>
                        <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mt-1">แผงพิจารณาลงนาม & ออกตราประทับทางวิชาการ</h5>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1">
                          ฝ่ายวิชาการสามารถประทับตรารับรองเอกสารและเซ็นอนุมัติบนหน้าระบบจำลองแบบเรียลไทม์เพื่อเห็นความเปลี่ยนแปลงจริงบนใบงานของครู
                        </p>
                      </div>

                      {/* Display Current State Stamp */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-1.5 text-[9px] font-bold text-indigo-500 bg-indigo-500/10 rounded-bl-xl font-mono uppercase">OFFICIAL SEAL</div>
                        
                        {wordData.stampType === 'approved' && (
                          <div className="w-24 h-24 rounded-full border-4 border-emerald-600/35 flex flex-col items-center justify-center text-emerald-600 font-bold p-1 select-none">
                            <span className="text-[10px] tracking-wider uppercase">APPROVED</span>
                            <CheckCircle className="w-7 h-7 my-1" />
                            <span className="text-[9px] truncate">ผ่านการอนุมัติ</span>
                          </div>
                        )}

                        {wordData.stampType === 'needs_edit' && (
                          <div className="w-24 h-24 rounded-full border-4 border-rose-500/35 flex flex-col items-center justify-center text-rose-500 font-bold p-1 select-none">
                            <span className="text-[10px] tracking-wider uppercase">REJECTED</span>
                            <AlertCircle className="w-7 h-7 my-1 text-rose-500" />
                            <span className="text-[9px] truncate">ส่งกลับแก้ไข</span>
                          </div>
                        )}

                        {wordData.stampType === 'certified' && (
                          <div className="w-24 h-24 rounded-full border-4 border-sky-500/35 flex flex-col items-center justify-center text-sky-500 font-bold p-1 select-none">
                            <span className="text-[10px] tracking-wider uppercase">CERTIFIED</span>
                            <FileCheck className="w-7 h-7 my-1" />
                            <span className="text-[9px] truncate">รับรองความถูกต้อง</span>
                          </div>
                        )}

                        <div className="mt-3 space-y-1 w-full text-center text-slate-800 dark:text-slate-100">
                          <p className="text-xs font-bold">{wordData.title}</p>
                          <p className="text-[10px] text-slate-400">เลขคลังเอกสาร: <span className="font-mono">{wordData.documentNo || 'ท.4/วช-041/2569'}</span></p>
                          <p className="text-[10px] text-slate-500">ลงนามพิจารณา: {wordData.approvedBy || 'ฝ่ายวิชาการ'}</p>
                          
                          {wordData.signature && (
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
                              <span className="text-[9px] text-slate-400 block mb-1 font-mono">ลายมือชื่อประเมินระบบ</span>
                              <img src={wordData.signature} alt="Signature" className="h-8 max-w-[120px] object-contain select-none dark:invert" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Editing Forms for PDF metadata / Stamp in Edit Mode */}
                      {isEditMode ? (
                        <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">เลขคุมเอกสารตรวจ (Document ID)</label>
                            <input 
                              type="text" 
                              value={wordData.documentNo || ''} 
                              onChange={e => setWordData(prev => ({ ...prev, documentNo: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">ชื่อผู้ลงนามพิจารณา (Signed By)</label>
                            <input 
                              type="text" 
                              value={wordData.approvedBy || ''} 
                              onChange={e => setWordData(prev => ({ ...prev, approvedBy: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">เลือกประเภทตราประทับอนุมัติ</label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { type: 'approved', label: 'APPROVED', color: 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
                                { type: 'needs_edit', label: 'REJECTED', color: 'border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/20' },
                                { type: 'certified', label: 'CERTIFIED', color: 'border-sky-500 text-sky-600 bg-sky-50 dark:bg-sky-950/20' }
                              ].map(st => (
                                <button
                                  key={st.type}
                                  onClick={() => setWordData(prev => ({ ...prev, stampType: st.type }))}
                                  className={`p-1.5 text-[9px] font-black border rounded-lg cursor-pointer text-center transition-all ${
                                    wordData.stampType === st.type 
                                      ? st.color 
                                      : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  {st.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Quick Signature Pad */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">เซ็นลายเซ็นอิเล็กทรอนิกส์จำลอง</label>
                            <div className="relative">
                              <canvas 
                                id="signature-canvas"
                                onMouseDown={(e) => {
                                  const canvas = e.currentTarget;
                                  const ctx = canvas.getContext('2d');
                                  if (!ctx) return;
                                  ctx.beginPath();
                                  ctx.lineWidth = 2.5;
                                  ctx.lineCap = 'round';
                                  ctx.strokeStyle = '#4f46e5';
                                  
                                  const rect = canvas.getBoundingClientRect();
                                  const x = e.clientX - rect.left;
                                  const y = e.clientY - rect.top;
                                  ctx.moveTo(x, y);
                                  
                                  const draw = (me: MouseEvent) => {
                                    const rect2 = canvas.getBoundingClientRect();
                                    ctx.lineTo(me.clientX - rect2.left, me.clientY - rect2.top);
                                    ctx.stroke();
                                  };
                                  
                                  const stopDraw = () => {
                                    canvas.removeEventListener('mousemove', draw);
                                    canvas.removeEventListener('mouseup', stopDraw);
                                    canvas.removeEventListener('mouseleave', stopDraw);
                                    const dataUrl = canvas.toDataURL();
                                    setWordData(prev => ({ ...prev, signature: dataUrl }));
                                  };
                                  
                                  canvas.addEventListener('mousemove', draw);
                                  canvas.addEventListener('mouseup', stopDraw);
                                  canvas.addEventListener('mouseleave', stopDraw);
                                }}
                                className="w-full h-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-crosshair"
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement;
                                  if (canvas) {
                                    const ctx = canvas.getContext('2d');
                                    ctx?.clearRect(0, 0, canvas.width, canvas.height);
                                    setWordData(prev => ({ ...prev, signature: '' }));
                                  }
                                }}
                                className="absolute right-2 bottom-2 text-[9px] font-black text-rose-500 hover:underline bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded shadow-sm"
                              >
                                ล้างลายเซ็น
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl text-[10px] text-slate-400 border border-slate-100 dark:border-slate-850">
                          สิทธิ์การแก้ไขถูกล็อกในโหมดพรีวิวพจนานุกรม คลิกปุ่มแก้ไขด้านบนเพื่อเลือกตราประทับและเซ็นลายเซ็นระบบอนุมัติเอกสารนี้
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isImageFile(previewSubmission.fileType) && (
                  <div className="w-full h-full bg-slate-50 dark:bg-slate-950/40 rounded-xl overflow-hidden flex flex-col md:flex-row gap-4 p-4 text-left">
                    {/* Left Frame: Image display with Dynamic CSS Filters */}
                    <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-auto p-4 border border-slate-200 dark:border-slate-800 min-h-[300px]">
                      <img 
                        src={previewSubmission.fileUrl} 
                        alt={previewSubmission.fileName} 
                        style={{
                          filter: `brightness(${imageAdjustments.brightness}%) contrast(${imageAdjustments.contrast}%) grayscale(${imageAdjustments.grayscale}%) sepia(${imageAdjustments.sepia}%) blur(${imageAdjustments.blur}px) hue-rotate(${imageAdjustments.hueRotate || 0}deg)`,
                          transform: `rotate(${imageAdjustments.rotation || 0}deg)`,
                          transition: 'filter 0.2s ease, transform 0.2s ease'
                        }}
                        className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-lg border border-white dark:border-slate-800"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Right Control Panel */}
                    <div className="w-full md:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 overflow-y-auto shrink-0 text-slate-800 dark:text-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-600">Image Editor</span>
                        <h5 className="font-extrabold text-sm mt-1">ปรับแต่งแสงและฟิลเตอร์รูปภาพ</h5>
                        <p className="text-[10px] text-slate-400 mt-1">
                          คุณสามารถปรับแต่งคอนทราสต์, ความสว่าง หรือสีของภาพประกอบเพื่อช่วยวิเคราะห์รายละเอียดการสะกดคำบนใบงานได้อย่างชัดเจน
                        </p>
                      </div>

                      {/* Display Settings Sliders if isEditMode is true */}
                      {isEditMode ? (
                        <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          {/* Brightness */}
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="font-bold text-slate-500">ความสว่าง (Brightness)</span>
                              <span className="font-mono text-indigo-500 font-bold">{imageAdjustments.brightness}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="50" 
                              max="150" 
                              value={imageAdjustments.brightness} 
                              onChange={e => setImageAdjustments(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                              className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          {/* Contrast */}
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="font-bold text-slate-500">คอนทราสต์ (Contrast)</span>
                              <span className="font-mono text-indigo-500 font-bold">{imageAdjustments.contrast}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="50" 
                              max="150" 
                              value={imageAdjustments.contrast} 
                              onChange={e => setImageAdjustments(prev => ({ ...prev, contrast: Number(e.target.value) }))}
                              className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          {/* Grayscale */}
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="font-bold text-slate-500">สีขาวดำ (Grayscale)</span>
                              <span className="font-mono text-indigo-500 font-bold">{imageAdjustments.grayscale}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={imageAdjustments.grayscale} 
                              onChange={e => setImageAdjustments(prev => ({ ...prev, grayscale: Number(e.target.value) }))}
                              className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          {/* Sepia */}
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="font-bold text-slate-500">สีซีเปียย้อนยุค (Sepia)</span>
                              <span className="font-mono text-indigo-500 font-bold">{imageAdjustments.sepia}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={imageAdjustments.sepia} 
                              onChange={e => setImageAdjustments(prev => ({ ...prev, sepia: Number(e.target.value) }))}
                              className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          {/* Blur */}
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="font-bold text-slate-500">ความเบลอ (Blur)</span>
                              <span className="font-mono text-indigo-500 font-bold">{imageAdjustments.blur}px</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="10" 
                              value={imageAdjustments.blur} 
                              onChange={e => setImageAdjustments(prev => ({ ...prev, blur: Number(e.target.value) }))}
                              className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          {/* Rotation */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">การหมุนรูปภาพ (Rotate)</label>
                            <div className="grid grid-cols-4 gap-2">
                              {[0, 90, 180, 270].map(rot => (
                                <button
                                  key={rot}
                                  type="button"
                                  onClick={() => setImageAdjustments(prev => ({ ...prev, rotation: rot }))}
                                  className={`p-1.5 rounded-lg border text-xs font-mono font-bold cursor-pointer text-center ${
                                    imageAdjustments.rotation === rot 
                                      ? 'bg-indigo-600 border-indigo-600 text-white' 
                                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                                  }`}
                                >
                                  {rot}°
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setImageAdjustments({
                              brightness: 100,
                              contrast: 100,
                              grayscale: 0,
                              sepia: 0,
                              blur: 0,
                              hueRotate: 0,
                              rotation: 0,
                              annotations: []
                            })}
                            className="w-full p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all mt-4"
                          >
                            <RotateCcw className="w-3 h-3" /> คืนค่าเริ่มต้นตัวปรับแสง
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">ฟิลเตอร์รูปภาพที่ใช้งาน:</p>
                          <ul className="space-y-1.5 text-xs text-slate-500 font-mono">
                            <li>ความสว่าง: {imageAdjustments.brightness}%</li>
                            <li>คอนทราสต์: {imageAdjustments.contrast}%</li>
                            <li>ระดับขาวดำ: {imageAdjustments.grayscale}%</li>
                            <li>ระดับซีเปีย: {imageAdjustments.sepia}%</li>
                            <li>ความเบลอ: {imageAdjustments.blur}px</li>
                            <li>การหมุนภาพ: {imageAdjustments.rotation || 0}°</li>
                          </ul>
                          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] leading-relaxed">
                            ต้องการปรับสี ปรับแสง หรือแก้ไขรูปภาพนี้ของครู? ให้คลิกปุ่ม <strong>"แก้ไขไฟล์เอกสารนี้"</strong> ที่เมน้านขวาบน
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isWordFile(previewSubmission.fileType) && wordData && (
                  <div className="w-full h-full bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 flex flex-col lg:flex-row gap-4 overflow-hidden">
                    {/* Left Frame: Live A4 Document Sheet */}
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm overflow-y-auto leading-relaxed text-left min-h-[400px]">
                      <div className="max-w-2xl mx-auto space-y-6 text-slate-800 dark:text-slate-100 font-sans">
                        <div className="text-center pb-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                          <div className="inline-flex p-3 bg-blue-50 dark:bg-blue-950/40 rounded-full mb-3 text-blue-600">
                            <BookOpen className="w-8 h-8" />
                          </div>
                          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-normal">
                            {wordData.title || "ไม่มีชื่อเรื่อง"}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1.5">
                            โรงเรียนเทศบาล 4 (บ้านเชียงราย) • ฝ่ายบริหารวิชาการกลุ่มสาระการเรียนรู้
                          </p>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-850">
                          <p className="font-bold text-slate-950 dark:text-white text-xs mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            ข้อมูลส่วนหัวเอกสาร (Metadata)
                          </p>
                          <ul className="space-y-1 text-xs text-slate-500 font-mono">
                            <li><span className="text-slate-400">เลขเอกสาร:</span> <span className="font-bold text-slate-700 dark:text-slate-300">{wordData.documentNo || 'ไม่ได้ระบุ'}</span></li>
                            <li><span className="text-slate-400">ผู้ลงประเมิน:</span> {wordData.approvedBy || 'ฝ่ายวิชาการ'}</li>
                            <li><span className="text-slate-400">ผู้จัดทำต้นฉบับ:</span> {previewSubmission.teacherName}</li>
                          </ul>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h5 className="font-bold text-slate-950 dark:text-white text-sm border-b pb-1 border-slate-100 dark:border-slate-800 mb-2">1. รายละเอียดสรุปและคำอธิบาย</h5>
                            <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">{wordData.description || 'ไม่มีคำอธิบาย'}</p>
                          </div>

                          <div>
                            <h5 className="font-bold text-slate-950 dark:text-white text-sm border-b pb-1 border-slate-100 dark:border-slate-800 mb-2">2. วัตถุประสงค์เชิงพฤติกรรม</h5>
                            <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">{wordData.objective || 'ไม่มีเป้าหมายเพิ่มเติม'}</p>
                          </div>

                          <div>
                            <h5 className="font-bold text-slate-950 dark:text-white text-sm border-b pb-1 border-slate-100 dark:border-slate-800 mb-2">3. สมรรถนะและคุณลักษณะอันพึงประสงค์</h5>
                            <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">{wordData.competencies || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                          </div>

                          <div>
                            <h5 className="font-bold text-slate-950 dark:text-white text-sm border-b pb-1 border-slate-100 dark:border-slate-800 mb-2">4. สื่อ อุปกรณ์ และแหล่งเรียนรู้</h5>
                            <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">{wordData.materials || 'ไม่มีรายการระบุ'}</p>
                          </div>
                        </div>

                        {wordData.signature && (
                          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-end">
                            <div className="text-center w-48 space-y-1">
                              <span className="text-[10px] text-slate-400 block mb-1">ลงลายมือชื่อประเมินออนไลน์</span>
                              <img src={wordData.signature} alt="Sign" className="h-10 mx-auto object-contain select-none dark:invert" />
                              <div className="border-t border-slate-200 dark:border-slate-700 pt-1">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{wordData.approvedBy}</p>
                                <p className="text-[9px] text-slate-400">ผู้อนุมัติฝ่ายวิชาการ</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Panel: Interactive Text Inputs for isEditMode */}
                    <div className="w-full lg:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto shrink-0 text-left text-slate-800 dark:text-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-blue-600">Word Processor</span>
                        <h5 className="font-extrabold text-sm mt-1">โปรแกรมตรวจและแต่งสารสารสนเทศ</h5>
                        <p className="text-[10px] text-slate-400 mt-1">
                          คุณสามารถกรอกข้อคิดเห็น ปรับเป้าหมาย หรือลงรายละเอียดบทเรียนลงไปในฟิลด์จำลองนี้เพื่อแต่งหน้าเอกสารโดยตรง
                        </p>
                      </div>

                      {isEditMode ? (
                        <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">หัวข้อเอกสาร (Title)</label>
                            <input 
                              type="text"
                              value={wordData.title}
                              onChange={e => setWordData(prev => ({ ...prev, title: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">บทคัดย่อ / คำอธิบาย (Description)</label>
                            <textarea 
                              rows={3}
                              value={wordData.description}
                              onChange={e => setWordData(prev => ({ ...prev, description: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs leading-relaxed resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">วัตถุประสงค์บทเรียน (Objective)</label>
                            <textarea 
                              rows={3}
                              value={wordData.objective}
                              onChange={e => setWordData(prev => ({ ...prev, objective: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs leading-relaxed resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">สมรรถนะสำคัญ (Competencies)</label>
                            <textarea 
                              rows={3}
                              value={wordData.competencies}
                              onChange={e => setWordData(prev => ({ ...prev, competencies: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs leading-relaxed resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">สื่ออุปกรณ์การเรียนรู้ (Materials)</label>
                            <textarea 
                              rows={3}
                              value={wordData.materials}
                              onChange={e => setWordData(prev => ({ ...prev, materials: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs leading-relaxed resize-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl text-[10px] text-slate-400 border border-slate-100 dark:border-slate-850 text-center">
                          เอกสารล็อกอยู่ภายใต้สิทธิ์พรีวิว กรุณาเลือกเปิดโหมดแก้ไขที่มุมขวาบนเพื่อทำการพิมพ์ข้อความจำลอง
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isPptFile(previewSubmission.fileType) && pptData && (
                  <div className="w-full h-full bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 flex flex-col lg:flex-row gap-4 overflow-hidden">
                    {/* Left Panel: Slides List Navigator */}
                    <div className="w-full lg:w-48 flex lg:flex-col gap-2 shrink-0 overflow-auto">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 text-left hidden lg:block mb-1">ภาพนิ่งนำเสนอ (3 สไลด์)</p>
                      {pptData.slides.map((slide: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSlide(idx)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer shrink-0 w-32 lg:w-full ${
                            activeSlide === idx 
                              ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400' 
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <p className="text-xs font-black">สไลด์ที่ {idx + 1}</p>
                          <p className="text-[10px] truncate opacity-70 mt-0.5">{slide.title || "ไม่ได้ระบุหัวข้อ"}</p>
                        </button>
                      ))}
                    </div>

                    {/* Middle Panel: Main Presenter Canvas with Dynamic Slide Themes */}
                    <div className="flex-1 flex flex-col justify-between min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm relative">
                      {/* PowerPoint Top Bar */}
                      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 bg-orange-500 rounded-sm"></span>
                          Microsoft PowerPoint Online (ธีม: {pptData.theme || 'indigo'})
                        </span>
                        <span>สไลด์ {activeSlide + 1} จาก {pptData.slides.length}</span>
                      </div>

                      {/* Canvas Container depending on activeSlide */}
                      <div className={`flex-1 p-8 flex flex-col justify-center items-center text-center relative overflow-hidden text-white min-h-[300px] transition-all duration-350 ${
                        pptData.theme === 'sunset' ? 'bg-gradient-to-br from-amber-600 via-rose-600 to-red-800' :
                        pptData.theme === 'midnight' ? 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950' :
                        pptData.theme === 'cosmic' ? 'bg-gradient-to-br from-purple-900 via-slate-900 to-indigo-950' :
                        pptData.theme === 'emerald' ? 'bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-950' :
                        'bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950'
                      }`}>
                        {/* Slide Title Background Pattern */}
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>

                        {activeSlide === 0 && (
                          <div className="space-y-4 max-w-lg relative z-10">
                            <span className="px-3 py-1 bg-orange-500 hover:bg-orange-600 rounded-full text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-orange-500/20">
                              {previewSubmission.type}
                            </span>
                            <h3 className="text-2xl font-extrabold tracking-tight leading-tight mt-2 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-200 to-orange-300">
                              {pptData.slides[0].title || previewSubmission.title}
                            </h3>
                            <p className="text-xs text-slate-300">{pptData.slides[0].subtitle || `กลุ่มสาระการเรียนรู้: ${previewSubmission.teacherSubjectGroup}`}</p>
                            <div className="pt-6 border-t border-white/10 flex justify-center items-center gap-3">
                              <span className="text-[11px] text-slate-300 font-mono">{pptData.slides[0].presenter || `ผู้นำเสนอ: ${previewSubmission.teacherName}`}</span>
                              <span className="text-slate-500">•</span>
                              <span className="text-[11px] text-slate-300 font-mono">โรงเรียนเทศบาล 4</span>
                            </div>
                          </div>
                        )}

                        {activeSlide > 0 && pptData.slides[activeSlide] && (
                          <div className="text-left w-full max-w-lg space-y-4 relative z-10">
                            <h4 className="text-lg font-extrabold text-orange-400 border-b border-white/10 pb-2 flex items-center gap-2">
                              <span className="text-xs text-white bg-white/10 px-2 py-0.5 rounded">0{activeSlide + 1}</span>
                              {pptData.slides[activeSlide].title}
                            </h4>
                            {pptData.slides[activeSlide].bullets && pptData.slides[activeSlide].bullets.length > 0 ? (
                              <ul className="space-y-2.5 text-xs text-slate-200 leading-relaxed">
                                {pptData.slides[activeSlide].bullets.map((bullet: string, bIdx: number) => (
                                  <li key={bIdx} className="flex items-start gap-2">
                                    <span className="text-orange-400 mt-0.5">✦</span>
                                    <span>{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs italic text-slate-400">สไลด์นี้ไม่มีรายการหัวข้อย่อย</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* PowerPoint Navigation Footer Controls */}
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <button
                          disabled={activeSlide === 0}
                          onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          ก่อนหน้า
                        </button>
                        <span className="text-xs font-mono text-slate-400">เลื่อนสไลด์เพื่อพรีวิว</span>
                        <button
                          disabled={activeSlide === pptData.slides.length - 1}
                          onClick={() => setActiveSlide(prev => Math.min(pptData.slides.length - 1, prev + 1))}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-40 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          ถัดไป
                        </button>
                      </div>
                    </div>

                    {/* Right Panel: Interactive Theme Switcher and Texts in Edit Mode */}
                    <div className="w-full lg:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto shrink-0 text-left text-slate-800 dark:text-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-orange-600">PowerPoint Studio</span>
                        <h5 className="font-extrabold text-sm mt-1">แต่งสไลด์นำเสนอคุณครู</h5>
                        <p className="text-[10px] text-slate-400 mt-1">
                          คุณสามารถปรับเปลี่ยนสไตล์สไลด์ และปรับปรุงหัวข้อนำเสนอสดของหน้าปัจจุบันได้อย่างแม่นยำ
                        </p>
                      </div>

                      {isEditMode ? (
                        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          {/* Theme Selector */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1.5">เลือกชุดสีสไลด์ (PPT Background Theme)</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { key: 'sunset', label: '🌅 Sunset Orange' },
                                { key: 'midnight', label: '🌑 Midnight Slate' },
                                { key: 'cosmic', label: '🌌 Cosmic Indigo' },
                                { key: 'emerald', label: '🌲 Emerald Forest' }
                              ].map(th => (
                                <button
                                  key={th.key}
                                  onClick={() => setPptData(prev => ({ ...prev, theme: th.key }))}
                                  className={`p-1.5 rounded-lg border text-left text-[10px] font-bold cursor-pointer ${
                                    pptData.theme === th.key 
                                      ? 'bg-orange-500/10 border-orange-500 text-orange-600' 
                                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                                  }`}
                                >
                                  {th.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Slide Fields depending on ActiveSlide */}
                          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] uppercase font-black text-orange-500">แก้ไขเนื้อหาของสไลด์ {activeSlide + 1}</p>
                            
                            {activeSlide === 0 && (
                              <>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 mb-1">หัวข้อหน้าปก (Main Title)</label>
                                  <input 
                                    type="text"
                                    value={pptData.slides[0].title || ''}
                                    onChange={e => {
                                      const updatedSlides = [...pptData.slides];
                                      updatedSlides[0].title = e.target.value;
                                      setPptData(prev => ({ ...prev, slides: updatedSlides }));
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 mb-1">หัวข้อย่อย (Subtitle)</label>
                                  <input 
                                    type="text"
                                    value={pptData.slides[0].subtitle || ''}
                                    onChange={e => {
                                      const updatedSlides = [...pptData.slides];
                                      updatedSlides[0].subtitle = e.target.value;
                                      setPptData(prev => ({ ...prev, slides: updatedSlides }));
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                                  />
                                </div>
                              </>
                            )}

                            {activeSlide > 0 && (
                              <>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 mb-1">หัวข้อหน้าสไลด์ (Slide Heading)</label>
                                  <input 
                                    type="text"
                                    value={pptData.slides[activeSlide].title || ''}
                                    onChange={e => {
                                      const updatedSlides = [...pptData.slides];
                                      updatedSlides[activeSlide].title = e.target.value;
                                      setPptData(prev => ({ ...prev, slides: updatedSlides }));
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 mb-1">หัวข้อย่อยรายการ (Bullets)</label>
                                  <div className="space-y-1.5">
                                    {(pptData.slides[activeSlide].bullets || []).map((bullet: string, bIdx: number) => (
                                      <div key={bIdx} className="flex gap-1">
                                        <input 
                                          type="text"
                                          value={bullet || ''}
                                          onChange={e => {
                                            const updatedSlides = [...pptData.slides];
                                            updatedSlides[activeSlide].bullets[bIdx] = e.target.value;
                                            setPptData(prev => ({ ...prev, slides: updatedSlides }));
                                          }}
                                          className="flex-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px]"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updatedSlides = [...pptData.slides];
                                            updatedSlides[activeSlide].bullets = updatedSlides[activeSlide].bullets.filter((_: any, i: number) => i !== bIdx);
                                            setPptData(prev => ({ ...prev, slides: updatedSlides }));
                                          }}
                                          className="text-rose-500 text-xs px-1 hover:bg-slate-50 rounded"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedSlides = [...pptData.slides];
                                        if (!updatedSlides[activeSlide].bullets) {
                                          updatedSlides[activeSlide].bullets = [];
                                        }
                                        updatedSlides[activeSlide].bullets.push("หัวข้อย่อยใหม่");
                                        setPptData(prev => ({ ...prev, slides: updatedSlides }));
                                      }}
                                      className="text-[10px] text-orange-600 font-bold hover:underline"
                                    >
                                      + เพิ่มรายการใหม่
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl text-[10px] text-slate-400 border border-slate-100 dark:border-slate-850 text-center">
                          สไลด์ล็อกอยู่ภายใต้สิทธิ์พรีวิว กรุณาเลือกเปิดโหมดแก้ไขที่มุมขวาบนเพื่อทำการพิมพ์ข้อความจำลอง
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {(isZipFile(previewSubmission.fileType) || isRarFile(previewSubmission.fileType)) && zipData && (
                  <div className="w-full h-full bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 flex flex-col md:flex-row gap-4 overflow-hidden text-left">
                    {/* Zip Explorer Left Side */}
                    <div className="w-full md:w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2 shrink-0 overflow-y-auto">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 mb-2">
                        <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                        ไฟล์ในคลังสารสนเทศอาร์ไคฟ์ ({zipData.length})
                      </p>

                      <div className="space-y-1">
                        {zipData.map((item: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedArchiveFile(item)}
                            className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center gap-2.5 cursor-pointer border ${
                              selectedArchiveFile?.name === item.name
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold'
                                : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <span className="shrink-0 text-amber-500 text-lg">📄</span>
                            <span className="truncate flex-1">{item.name}</span>
                          </button>
                        ))}
                      </div>

                      {/* Add file in zip in edit mode */}
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const newFilename = "แผนบูรณาการแบบย่อย_" + (zipData.length + 1) + ".docx";
                            const newItem = {
                              name: newFilename,
                              size: "120 KB",
                              type: "docx",
                              content: "บันทึกข้อมูลเนื้อหาหลักของไฟล์ย่อยที่คุณเพิ่งสร้างเพิ่มเข้าไปในคลังไฟล์บีบอัดสำเร็จ!"
                            };
                            setZipData(prev => [...prev, newItem]);
                            setSelectedArchiveFile(newItem);
                          }}
                          className="mt-4 w-full p-2 border border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl hover:bg-indigo-50/50 cursor-pointer flex items-center justify-center gap-1"
                        >
                          + เพิ่มไฟล์ย่อยใหม่
                        </button>
                      )}
                    </div>

                    {/* Zip Explorer Right Side */}
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between overflow-y-auto">
                      {selectedArchiveFile ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">📄</span>
                              <div className="min-w-0">
                                {isEditMode ? (
                                  <input 
                                    type="text" 
                                    value={selectedArchiveFile.name}
                                    onChange={e => {
                                      const newName = e.target.value;
                                      const updated = zipData.map((f: any) => {
                                        if (f.name === selectedArchiveFile.name) {
                                          return { ...f, name: newName };
                                        }
                                        return f;
                                      });
                                      setZipData(updated);
                                      setSelectedArchiveFile(prev => prev ? { ...prev, name: newName } : null);
                                    }}
                                    className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 rounded text-xs font-extrabold max-w-xs"
                                  />
                                ) : (
                                  <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate">{selectedArchiveFile.name}</h5>
                                )}
                                <p className="text-[10px] text-slate-400 mt-1">ขนาดไฟล์จำลอง: {selectedArchiveFile.size} • สิทธิ์เข้าถึงอ่าน/เขียนร่วม</p>
                              </div>
                            </div>

                            {isEditMode && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nameToDel = selectedArchiveFile.name;
                                  const updated = zipData.filter((f: any) => f.name !== nameToDel);
                                  setZipData(updated);
                                  setSelectedArchiveFile(updated.length > 0 ? updated[0] : null);
                                }}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl cursor-pointer"
                                title="ลบไฟล์ออกจากคลัง"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="space-y-3 pt-2">
                            <h6 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">ข้อมูลรายละเอียดในไฟล์ย่อย</h6>
                            {isEditMode ? (
                              <textarea
                                rows={4}
                                value={selectedArchiveFile.content || ''}
                                onChange={e => {
                                  const newContent = e.target.value;
                                  const updated = zipData.map((f: any) => {
                                    if (f.name === selectedArchiveFile.name) {
                                      return { ...f, content: newContent };
                                    }
                                    return f;
                                  });
                                  setZipData(updated);
                                  setSelectedArchiveFile(prev => prev ? { ...prev, content: newContent } : null);
                                }}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl font-mono border border-slate-200 dark:border-slate-800 outline-none resize-none leading-relaxed"
                              />
                            ) : (
                              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-950 p-4 rounded-xl font-mono border border-slate-100 dark:border-slate-850">
                                {selectedArchiveFile.content || "ไฟล์ประเภทไบนารีระบบ ไม่รองรับการแสดงข้อความแบบธรรมดา"}
                              </p>
                            )}
                          </div>

                          <div className="pt-4 flex gap-3">
                            <button
                              onClick={() => {
                                // Simulate sub-file view switch!
                                const tempSub = {
                                  ...previewSubmission,
                                  fileName: selectedArchiveFile.name,
                                  fileType: selectedArchiveFile.type,
                                  fileSize: parseInt(selectedArchiveFile.size) * 1024
                                };
                                setPreviewSubmission(tempSub);
                              }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              จำลองการเปิดพรีวิวไฟล์ย่อยนี้
                            </button>
                            <button
                              onClick={() => handleDownloadFile(previewSubmission)}
                              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              ดาวน์โหลดคลังอาร์ไคฟ์ทั้งหมด
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl mb-4 animate-bounce">
                            📁
                          </div>
                          <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">ระบบสำรวจข้อมูลในคลังอาร์ไคฟ์</h5>
                          <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
                            กรุณาคลิกเลือกไฟล์ย่อยที่คอลัมน์ด้านซ้ายมือ เพื่อดูพรีวิว แก้ไขชื่อ หรือตรวจสอบรายละเอียดได้อย่างสะดวกรวดเร็ว
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isExcelFile(previewSubmission.fileType) && excelData && (
                  <div className="w-full h-full bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 flex flex-col gap-4 overflow-hidden">
                    {/* Excel Sheet Header */}
                    <div className="px-4 py-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-500 shrink-0">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="w-3 h-3 bg-emerald-600 rounded-sm"></span>
                        Microsoft Excel Online (จำลองเพื่อความปลอดภัยแบบอ่านอย่างเดียว)
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">สูตรคำนวณถูกล็อกสิทธิ์</span>
                    </div>

                    {/* Main Excel Sheet Body */}
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-auto text-slate-800 dark:text-slate-100 flex flex-col">
                      <div className="flex-1 overflow-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] text-center sticky top-0">
                              <th className="border border-slate-200 dark:border-slate-700 p-1 w-10"></th>
                              <th className="border border-slate-200 dark:border-slate-700 p-1 w-14">A</th>
                              <th className="border border-slate-200 dark:border-slate-700 p-1 w-24">B</th>
                              <th className="border border-slate-200 dark:border-slate-700 p-1 w-48">C</th>
                              <th className="border border-slate-200 dark:border-slate-700 p-1 w-24">D</th>
                              <th className="border border-slate-200 dark:border-slate-700 p-1 w-24">E</th>
                              <th className="border border-slate-200 dark:border-slate-700 p-1 w-24">F</th>
                              <th className="border border-slate-200 dark:border-slate-700 p-1 w-24">G</th>
                              <th className="border border-slate-200 dark:border-slate-700 p-1 w-20">H</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeSheet === 'sheet1' ? (
                              <>
                                {/* Row 1: Title */}
                                <tr>
                                  <td className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 text-center font-bold text-[9px] text-slate-400">1</td>
                                  <td colSpan={8} className="border border-slate-200 dark:border-slate-700 p-2 font-black text-sm text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-center">
                                    ตารางสรุปคะแนนประเมินผล: {previewSubmission.title}
                                  </td>
                                </tr>
                                {/* Row 2: Sub-info */}
                                <tr>
                                  <td className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 text-center font-bold text-[9px] text-slate-400">2</td>
                                  <td colSpan={8} className="border border-slate-200 dark:border-slate-700 p-1.5 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 text-center font-semibold">
                                    ครูผู้สอน: {previewSubmission.teacherName} ({previewSubmission.teacherSubjectGroup})
                                  </td>
                                </tr>
                                {/* Row 3: Table Header */}
                                <tr className="bg-slate-50 dark:bg-slate-800 font-bold text-center">
                                  <td className="border border-slate-200 dark:border-slate-700 p-1 text-center font-bold text-[9px] text-slate-400">3</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5">ที่</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5">รหัสนักเรียน</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-left">ชื่อ-นามสกุลนักเรียน</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5">คะแนนเก็บ (40)</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5">กลางภาค (20)</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5">ปลายภาค (40)</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-indigo-600">รวม (100)</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-emerald-600">เกรด</td>
                                </tr>
                                {/* Rows 4-11: Data */}
                                {[
                                  { no: 1, id: "04121", name: "ด.ช. เกียรติภูมิ มั่นคง", c1: 35, c2: 18, c3: 36, sum: 89, grade: "A" },
                                  { no: 2, id: "04122", name: "ด.ญ. นพวรรณ รักษ์ดี", c1: 32, c2: 17, c3: 34, sum: 83, grade: "A" },
                                  { no: 3, id: "04123", name: "ด.ช. พีรพงษ์ วงศ์สว่าง", c1: 34, c2: 15, c3: 30, sum: 79, grade: "B+" },
                                  { no: 4, id: "04124", name: "ด.ญ. ศศิธร สุขใจ", c1: 38, c2: 19, c3: 38, sum: 95, grade: "A" },
                                  { no: 5, id: "04125", name: "ด.ช. อนันต์ รุ่งเรือง", c1: 28, c2: 14, c3: 25, sum: 67, grade: "C+" },
                                  { no: 6, id: "04126", name: "ด.ญ. ณิชชา พาณิชย์", c1: 33, c2: 16, c3: 31, sum: 80, grade: "A" },
                                  { no: 7, id: "04127", name: "ด.ช. ปธานินทร์ แสงงาม", c1: 30, c2: 15, c3: 29, sum: 74, grade: "B" },
                                  { no: 8, id: "04128", name: "ด.ญ. วรรณวิสา มีทรัพย์", c1: 36, c2: 18, c3: 35, sum: 89, grade: "A" }
                                ].map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                                    <td className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 text-center font-bold text-[9px] text-slate-400">{idx + 4}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center">{row.no}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center font-mono">{row.id}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 font-semibold text-slate-700 dark:text-slate-350">{row.name}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center">{row.c1}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center">{row.c2}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center">{row.c3}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center font-bold text-indigo-600 bg-indigo-50/20">{row.sum}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center font-black text-emerald-600 bg-emerald-50/20">{row.grade}</td>
                                  </tr>
                                ))}
                                {/* Row 12: Average */}
                                <tr className="bg-slate-50 dark:bg-slate-800 font-bold">
                                  <td className="border border-slate-200 dark:border-slate-700 p-1 text-center font-bold text-[9px] text-slate-400">12</td>
                                  <td colSpan={3} className="border border-slate-200 dark:border-slate-700 p-1.5 text-right">คะแนนเฉลี่ยทั้งชั้นเรียน</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center">33.2</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center">16.5</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center">32.2</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center text-indigo-600 font-black">81.9</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center text-emerald-600 font-black">A</td>
                                </tr>
                              </>
                            ) : (
                              <>
                                {/* Tab 2 Data */}
                                <tr>
                                  <td className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 text-center font-bold text-[9px] text-slate-400">1</td>
                                  <td colSpan={8} className="border border-slate-200 dark:border-slate-700 p-2 font-black text-sm text-teal-600 bg-teal-50/50 dark:bg-teal-950/20 text-center">
                                    สถิติการส่งการบ้านและเช็คชื่อเข้าเรียนประจำเดือนนี้
                                  </td>
                                </tr>
                                <tr className="bg-slate-50 dark:bg-slate-800 font-bold text-center">
                                  <td className="border border-slate-200 dark:border-slate-700 p-1 text-center font-bold text-[9px] text-slate-400">2</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5">สัปดาห์ที่</td>
                                  <td colSpan={2} className="border border-slate-200 dark:border-slate-700 p-1.5 text-left">เนื้อหาหลัก / เรื่องที่สอน</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5">จำนวนนร. ทั้งหมด</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5">เข้าเรียน (คน)</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5">ขาดเรียน (คน)</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5">ส่งใบงานครบ (คน)</td>
                                  <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-teal-600">คิดเป็น %</td>
                                </tr>
                                {[
                                  { wk: 1, topic: "ปฐมนิเทศ และชี้แจงการวัดประเมินผล", all: 40, att: 39, leave: 1, work: 38, percent: "95.0%" },
                                  { wk: 2, topic: "หน่วยการเรียนรู้ที่ 1: พื้นฐานทฤษฎีสาระการเรียนรู้", all: 40, att: 40, leave: 0, work: 39, percent: "97.5%" },
                                  { wk: 3, topic: "ปฏิบัติการทดลองกลุ่มเชิงระบบ Active Learning", all: 40, att: 38, leave: 2, work: 35, percent: "87.5%" },
                                  { wk: 4, topic: "สรุปบททบทวนย่อย และทดสอบกลางหน่วยการเรียนรู้", all: 40, att: 39, leave: 1, work: 39, percent: "97.5%" }
                                ].map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                                    <td className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 text-center font-bold text-[9px] text-slate-400">{idx + 3}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center font-bold">{row.wk}</td>
                                    <td colSpan={2} className="border border-slate-200 dark:border-slate-700 p-1.5 text-slate-700 dark:text-slate-350">{row.topic}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center">{row.all}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center text-emerald-600 font-bold">{row.att}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center text-rose-500">{row.leave}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center">{row.work}</td>
                                    <td className="border border-slate-200 dark:border-slate-700 p-1.5 text-center font-bold text-teal-600 bg-teal-50/20">{row.percent}</td>
                                  </tr>
                                ))}
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Excel Bottom Sheets Bar */}
                      <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-1.5 flex gap-2 shrink-0">
                        <button
                          onClick={() => setActiveSheet('sheet1')}
                          className={`px-4 py-1.5 text-[11px] font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer ${
                            activeSheet === 'sheet1'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          📊 บันทึกคะแนนเก็บ.xlsx
                        </button>
                        <button
                          onClick={() => setActiveSheet('sheet2')}
                          className={`px-4 py-1.5 text-[11px] font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer ${
                            activeSheet === 'sheet2'
                              ? 'bg-teal-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          📈 สถิติส่งงาน.xlsx
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(isZipFile(previewSubmission.fileType) || isRarFile(previewSubmission.fileType)) && (
                  <div className="w-full h-full bg-slate-100 dark:bg-slate-950/40 rounded-xl p-4 flex gap-4 overflow-hidden text-left">
                    {/* Zip Explorer Left Side */}
                    <div className="w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2 shrink-0 overflow-y-auto">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 mb-2">
                        <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                        ไฟล์ในคลังสารสนเทศ
                      </p>

                      {[
                        { name: "1_แผนการจัดการเรียนรู้บูรณาการ.docx", size: "185 KB", type: "docx" },
                        { name: "2_สื่อการสอนสไลด์นำเสนอ.pptx", size: "3.2 MB", type: "pptx" },
                        { name: "3_แบบประเมินผลสัมฤทธิ์นร.xlsx", size: "94 KB", type: "xlsx" },
                        { name: "4_ตัวอย่างใบงานแบบฝึกทักษะ.pdf", size: "450 KB", type: "pdf" },
                        { name: "5_รูปบรรยากาศชั้นเรียนเชิงรุก.png", size: "1.8 MB", type: "png" }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedArchiveFile(item)}
                          className={`p-2 rounded-xl text-left text-xs transition-all flex items-center gap-2.5 cursor-pointer ${
                            selectedArchiveFile?.name === item.name
                              ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <span className="shrink-0 text-amber-500 text-lg">📄</span>
                          <span className="truncate flex-1">{item.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Zip Explorer Right Side */}
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between overflow-y-auto">
                      {selectedArchiveFile ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center gap-4">
                            <span className="text-4xl">📄</span>
                            <div className="min-w-0">
                              <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate">{selectedArchiveFile.name}</h5>
                              <p className="text-[10px] text-slate-400 mt-1">ขนาดไฟล์ดั้งเดิม: {selectedArchiveFile.size} • สิทธิ์เข้าถึงอ่านย่อย</p>
                            </div>
                          </div>

                          <div className="space-y-3 pt-2">
                            <h6 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">ข้อมูลรายละเอียดเชิงระบบแบบอ่านอย่างเดียว</h6>
                            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-950 p-4 rounded-xl font-mono border border-slate-100 dark:border-slate-850">
                              [สถานะ]: ดึงไฟล์ย่อยจาก {previewSubmission.fileType === 'zip' ? 'ZIP' : 'RAR'} อาร์ไคฟ์สำเร็จ<br/>
                              [ประเภทภายใน]: .{selectedArchiveFile.type} ดั้งเดิม<br/>
                              [ความปลอดภัย]: ผ่านการสแกนความปลอดภัย ตรวจสอบแล้วไม่มีมัลแวร์
                            </p>
                          </div>

                          <div className="pt-4 flex gap-3">
                            <button
                              onClick={() => {
                                // Simulate sub-file view switch!
                                const tempSub = {
                                  ...previewSubmission,
                                  fileName: selectedArchiveFile.name,
                                  fileType: selectedArchiveFile.type,
                                  fileSize: parseInt(selectedArchiveFile.size) * 1024
                                };
                                setPreviewSubmission(tempSub);
                              }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              จำลองการเปิดพรีวิวไฟล์ย่อย
                            </button>
                            <button
                              onClick={() => handleDownloadFile(previewSubmission)}
                              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              ดาวน์โหลดคลังอาร์ไคฟ์ทั้งหมด
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl mb-4">
                            📁
                          </div>
                          <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">ระบบสำรวจข้อมูลในคลังอาร์ไคฟ์ ({previewSubmission.fileType === 'zip' ? 'ZIP' : 'RAR'})</h5>
                          <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
                            กรุณาคลิกเลือกไฟล์ย่อยที่คอลัมน์ด้านซ้ายมือ เพื่อดูพรีวิวและตรวจสอบโครงสร้างเนื้อหาอย่างรวดเร็วโดยไม่ต้องแยกไฟล์ลงเครื่องคอมพิวเตอร์ของท่าน
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isVideoFile(previewSubmission.fileType) && (
                  <div className="w-full h-full bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 flex flex-col md:flex-row gap-4 overflow-hidden text-left">
                    <div className="flex-1 bg-black rounded-2xl overflow-hidden flex items-center justify-center relative min-h-[300px]">
                      {previewSubmission.fileUrl ? (
                        <video 
                          src={previewSubmission.fileUrl} 
                          controls 
                          className="w-full h-full max-h-[60vh] object-contain"
                        />
                      ) : (
                        <div className="text-white text-center p-8">
                          <Video className="w-12 h-12 mx-auto text-indigo-400 mb-2 animate-pulse" />
                          <p className="text-sm font-bold">ไม่พบแหล่งข้อมูลวิดีโอ</p>
                          <p className="text-xs text-slate-500 mt-1">ไฟล์วิดีโอนี้ไม่มีเนื้อหาสำหรับการเล่นโดยตรง</p>
                        </div>
                      )}
                    </div>
                    <div className="w-full md:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-600">Video Player</span>
                        <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mt-1">เครื่องเล่นสื่อวิดีโอตรวจประเมิน</h5>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1">
                          รับชมไฟล์บันทึกภาพวิดีโอการเรียนการสอน หรือคลิปวิดีโอผลงานของคุณครูผู้จัดส่งได้ผ่านระบบแบบสอบถามเพื่อความปลอดภัย
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-2">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">รายละเอียดไฟล์มีเดีย</p>
                        <ul className="space-y-1.5 text-[11px] text-slate-500 font-mono">
                          <li className="truncate">ชื่อไฟล์: {previewSubmission.fileName}</li>
                          <li>ประเภท: .{previewSubmission.fileType}</li>
                          <li>ขนาด: {(previewSubmission.fileSize / (1024 * 1024)).toFixed(2)} MB</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {isAudioFile(previewSubmission.fileType) && (
                  <div className="w-full h-full bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 flex flex-col md:flex-row gap-4 overflow-hidden text-left">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-950 rounded-2xl flex flex-col items-center justify-center p-8 border border-slate-200 dark:border-slate-800 min-h-[250px]">
                      <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4 shadow-inner animate-pulse">
                        <Music className="w-10 h-10" />
                      </div>
                      <p className="font-extrabold text-slate-855 dark:text-slate-100 text-center truncate max-w-md">{previewSubmission.fileName}</p>
                      <p className="text-xs text-slate-400 mb-6 font-mono">.{previewSubmission.fileType} Audio File</p>
                      
                      {previewSubmission.fileUrl ? (
                        <audio 
                          src={previewSubmission.fileUrl} 
                          controls 
                          className="w-full max-w-md"
                        />
                      ) : (
                        <p className="text-xs text-slate-400">ไม่มีไฟล์เสียงต้นฉบับสำหรับการประเมินในระบบพรีวิว</p>
                      )}
                    </div>
                    <div className="w-full md:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-600">Audio Player</span>
                        <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mt-1">เครื่องเล่นจำลองเสียงตรวจงานครู</h5>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1">
                          รับฟังไฟล์อธิบาย สื่อประกอบ หรือรายงานสรุปเสียงของคุณครูผ่านระบบรับส่งงานอย่างเป็นระบบ
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isTextFile(previewSubmission.fileType) && (
                  <div className="w-full h-full bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 flex flex-col md:flex-row gap-4 overflow-hidden text-left">
                    <div className="flex-1 bg-slate-950 text-emerald-400 rounded-2xl p-6 overflow-auto font-mono text-xs border border-slate-800 shadow-inner min-h-[300px]">
                      <pre className="whitespace-pre-wrap leading-relaxed">{rawTextData || "ไฟล์เอกสารนี้ว่างเปล่า หรือไม่มีเนื้อหาข้อความจัดเก็บไว้"}</pre>
                    </div>
                    <div className="w-full md:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto">
                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-600">Text Editor</span>
                          <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mt-1">โปรแกรมจำลองอ่าน/แก้ไขไฟล์ข้อความ</h5>
                          <p className="text-[10px] text-slate-400 leading-normal mt-1">
                            ตรวจสอบเนื้อหา รหัสคำสั่ง หรือข้อมูลไฟล์ดิบ (เช่น TXT, JSON, CSV) ที่แนบเข้ามาในระบบ
                          </p>
                        </div>
                        
                        {isEditMode ? (
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-400">แก้ไขเนื้อหาข้อความตรงนี้</label>
                            <textarea 
                              rows={10}
                              value={rawTextData}
                              onChange={e => setRawTextData(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-emerald-600 dark:text-emerald-400 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-400 rounded-xl border border-slate-100 dark:border-slate-850 text-center leading-normal">
                            ไฟล์ข้อความล็อกอยู่ในโหมดอ่านอย่างเดียว คลิกปุ่มแก้ไขด้านบนเพื่อเข้าไปกรอก/แก้ไขเนื้อความจริงในฐานข้อมูล
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!isPdfFile(previewSubmission.fileType) && 
                 !isImageFile(previewSubmission.fileType) && 
                 !isTextFile(previewSubmission.fileType) && 
                 !isVideoFile(previewSubmission.fileType) && 
                 !isAudioFile(previewSubmission.fileType) && 
                 !isWordFile(previewSubmission.fileType) && 
                 !isExcelFile(previewSubmission.fileType) && 
                 !isPptFile(previewSubmission.fileType) && 
                 !isZipFile(previewSubmission.fileType) && 
                 !isRarFile(previewSubmission.fileType) && (
                  <div className="w-full h-full p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-xl flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 text-indigo-500">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                      เปิดไฟล์ในโหมดอ่านอย่างเดียวแบบปลอดภัย (Safe Read-Only)
                    </h5>
                    <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                      ไฟล์ประเภท <span className="font-mono text-indigo-500 font-bold">.{previewSubmission.fileType}</span> เป็นไฟล์ระบบเฉพาะเจาะจง ในการเปิดอ่านอย่างเดียวโดยไม่ให้แก้ไขข้อมูลต้นฉบับในระบบ ท่านสามารถดาวน์โหลดไฟล์เพื่อเปิดอ่านบนซอฟต์แวร์ของท่านได้อย่างเป็นอิสระ
                    </p>
                    <button 
                      onClick={() => handleDownloadFile(previewSubmission)}
                      className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 inline-flex items-center gap-2 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      ดาวน์โหลดเปิดดูแบบปลอดภัย (Download Read-Only)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center shrink-0">
              <span className="text-[11px] text-slate-400 font-medium">
                ขนาดเอกสาร: {(previewSubmission.fileSize / 1024).toFixed(1)} KB • สิทธิ์เข้าถึงแบบจำกัด: อ่านอย่างเดียว
              </span>
              <button 
                onClick={() => { setShowPreviewModal(false); setPreviewSubmission(null); }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors"
              >
                เสร็จสิ้น / ปิดหน้าต่างพรีวิว
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM CANCEL SUBMISSION */}
      {submissionToCancel && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-6 text-slate-800 dark:text-slate-100 text-left">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-full text-rose-500 shrink-0">
                <Trash className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight">
                  ยืนยันการยกเลิกส่งงาน?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  ท่านต้องการยกเลิกการส่งไฟล์งาน <span className="font-bold text-slate-700 dark:text-slate-200">"{submissionToCancel.title}"</span> ใช่หรือไม่? การดำเนินการนี้จะลบข้อมูลไฟล์และการประเมินออกจากระบบอย่างถาวร
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">รายละเอียดงานที่จะยกเลิก</p>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <li className="truncate"><span className="font-semibold">ชื่อไฟล์:</span> {submissionToCancel.fileName}</li>
                <li><span className="font-semibold">ประเภทงาน:</span> {submissionToCancel.type}</li>
                <li><span className="font-semibold">สถานะปัจจุบัน:</span> {
                  submissionToCancel.status === 'submitted' ? 'ส่งแล้ว' :
                  submissionToCancel.status === 'checking' ? 'กำลังตรวจ' :
                  submissionToCancel.status === 'needs_edit' ? 'ส่งกลับแก้ไข' : 'อื่นๆ'
                }</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSubmissionToCancel(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
              >
                ย้อนกลับ / ละเว้น
              </button>
              <button
                onClick={() => handleCancelSubmission(submissionToCancel)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all hover:shadow-lg hover:shadow-rose-600/20 active:scale-95 cursor-pointer text-center"
              >
                ยืนยันยกเลิกส่งงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM FILE SUBMISSION SUMMARY */}
      {showSubmitConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-6 text-slate-800 dark:text-slate-100 text-left">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-full text-sky-500 shrink-0">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight">
                  สรุปรายละเอียดและยืนยันการส่งไฟล์งานวิชาการ
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  กรุณาตรวจสอบความถูกต้องของข้อมูลและเอกสารแนบก่อนกดยืนยันการส่งไปยังฝ่ายวิชาการ
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ชื่องานวิชาการ</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{submissionForm.title}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ประเภทงาน</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{submissionForm.type}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">กลุ่มสาระการเรียนรู้</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{currentUserProfile?.subjectGroup || '-'}</p>
                  </div>
                </div>

                {submissionForm.description && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">รายละเอียดเพิ่มเติม</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{submissionForm.description}</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-sky-50/20 dark:bg-sky-950/20 border border-sky-100/50 dark:border-sky-900/30 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-sky-500 text-white rounded-lg select-none text-sm">📄</div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block">เอกสารแนบที่อัปโหลด</span>
                  <p className="text-xs font-bold text-sky-600 dark:text-sky-400 truncate">{submissionForm.fileName}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{(submissionForm.fileSize / 1024).toFixed(1)} KB • สกุลไฟล์ .{submissionForm.fileType.toUpperCase()}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSubmitConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
              >
                ย้อนกลับไปแก้ไข
              </button>
              <button
                onClick={handleAddSubmission}
                disabled={submitting}
                className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold transition-all hover:shadow-lg hover:shadow-sky-500/20 active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {submitting ? 'กำลังส่งงาน...' : 'ยืนยันและส่งงานทันที'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-scale-up text-slate-800 dark:text-slate-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <h4 className="font-extrabold text-sm flex items-center gap-2">
                {confirmDialog.isDanger ? (
                  <span className="p-1 bg-rose-50 dark:bg-rose-950/50 rounded-lg text-rose-500 text-xs font-black">⚠️</span>
                ) : (
                  <span className="p-1 bg-sky-50 dark:bg-sky-950/50 rounded-lg text-sky-500 text-xs font-black">ℹ️</span>
                )}
                {confirmDialog.title}
              </h4>
              <button 
                onClick={() => setConfirmDialog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                {confirmDialog.message}
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  {confirmDialog.cancelText || 'ยกเลิก'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                  }}
                  className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-all hover:shadow-lg active:scale-95 cursor-pointer text-center ${
                    confirmDialog.isDanger 
                      ? 'bg-rose-500 hover:bg-rose-400 hover:shadow-rose-500/20' 
                      : 'bg-sky-500 hover:bg-sky-400 hover:shadow-sky-500/20'
                  }`}
                >
                  {confirmDialog.confirmText || 'ยืนยัน'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
