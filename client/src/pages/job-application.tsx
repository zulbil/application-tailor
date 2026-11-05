import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Loader2, Wand2, Copy, FileText, FileUser, Download, Palette, Settings2, FileDown, GripVertical, Pencil, Save, X, Check, Eye, EyeOff, Plus, Trash2, BarChart3, Star, AlertTriangle, TrendingUp, CheckCircle, XCircle, Search, Target, Lightbulb, ArrowRight, GraduationCap, Brain, Users, ChevronRight, RotateCcw, CalendarIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { JobApplicationInput, GeneratedResume, GeneratedCoverLetter, Profile, ResumeSettings, ResumeTemplatesResponse, ResumeRanking, GapAnalysis, InterviewSimulation, SimulationDifficulty, AnswerEvaluation } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const defaultSectionLabels: Record<string, string> = {
  summary: "",
  skills: "Skills",
  experience: "Experience",
  education: "Education"
};

const defaultSectionPreferences: Record<string, { title: string; hidden: boolean }> = {
  summary: { title: "", hidden: false },
  skills: { title: "Skills", hidden: false },
  experience: { title: "Experience", hidden: false },
  education: { title: "Education", hidden: false }
};

interface SortableSectionItemProps {
  id: string;
  prefs: Record<string, { title: string; hidden: boolean }>;
  onUpdatePrefs: (key: string, updates: Partial<{ title: string; hidden: boolean }>) => void;
}

function SortableSectionItem({ id, prefs, onUpdatePrefs }: SortableSectionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const pref = prefs[id] || { title: defaultSectionLabels[id] || id, hidden: false };
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(pref.title);

  const saveTitle = () => {
    onUpdatePrefs(id, { title: titleValue });
    setIsEditingTitle(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-lg border ${pref.hidden ? "bg-muted/30 opacity-60" : "bg-muted/50"}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        {isEditingTitle ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border rounded"
              placeholder={id === "summary" ? "Leave empty for no title" : `Section title for ${id}`}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && saveTitle()}
            />
            <Button size="sm" variant="ghost" onClick={saveTitle}>
              <Check className="size-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setTitleValue(pref.title); setIsEditingTitle(false); }}>
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {pref.title || (id === "summary" ? "(no title)" : defaultSectionLabels[id] || id)}
            </span>
            <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => setIsEditingTitle(true)}>
              <Pencil className="size-3" />
            </Button>
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant={pref.hidden ? "default" : "ghost"}
        className="h-8"
        onClick={() => onUpdatePrefs(id, { hidden: !pref.hidden })}
        data-testid={`toggle-section-${id}`}
      >
        {pref.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  );
}

const defaultSettings: ResumeSettings = {
  template: "modern",
  primaryColor: "#059669",
  fontFamily: "Inter",
  fontSize: "medium",
  sectionOrder: ["summary", "experience", "education", "skills"],
  sectionPreferences: defaultSectionPreferences
};

export default function JobApplicationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, params] = useRoute("/application/:slug");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const savedApplicationRef = useRef<string | null>(null);
  const [applicationLoaded, setApplicationLoaded] = useState(false);
  const gapAnalysisRef = useRef<GapAnalysis | null>(null);
  
  const [resume, setResume] = useState<GeneratedResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<GeneratedCoverLetter | null>(null);
  const [unsupportedNumbers, setUnsupportedNumbers] = useState<string[]>([]);
  const [templates, setTemplates] = useState<ResumeTemplatesResponse | null>(null);
  const [settings, setSettings] = useState<ResumeSettings>(defaultSettings);
  const [showCustomize, setShowCustomize] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [isEditingCoverLetter, setIsEditingCoverLetter] = useState(false);
  const [editedLogline, setEditedLogline] = useState<string[]>([]);
  const [editedCoverLetter, setEditedCoverLetter] = useState("");
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [editedSkills, setEditedSkills] = useState("");
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [editedExperiences, setEditedExperiences] = useState<GeneratedResume["experiences"]>([]);
  const [ranking, setRanking] = useState<ResumeRanking | null>(null);
  const [isEvaluatingRanking, setIsEvaluatingRanking] = useState(false);
  const [isApplyingRecommendations, setIsApplyingRecommendations] = useState(false);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [isAnalyzingGap, setIsAnalyzingGap] = useState(false);
  const [showGapWarning, setShowGapWarning] = useState(false);
  
  interface TrainingQuestion {
    question: string;
    answer: string;
    explanation: string;
  }
  
  interface ApplicationTraining {
    id: string;
    applicationId: string;
    category: "technical" | "soft";
    difficulty: "easy" | "medium" | "hard";
    skillFocus: string;
    questions: TrainingQuestion[];
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    readinessScore: number;
  }
  
  const [trainings, setTrainings] = useState<ApplicationTraining[]>([]);
  const [readinessScore, setReadinessScore] = useState(0);
  const [selectedTraining, setSelectedTraining] = useState<ApplicationTraining | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isGeneratingTraining, setIsGeneratingTraining] = useState(false);
  const [trainingCategory, setTrainingCategory] = useState<"technical" | "soft">("technical");
  const [trainingDifficulty, setTrainingDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(undefined);
  const [isUpdatingInterviewDate, setIsUpdatingInterviewDate] = useState(false);
  
  const [simulations, setSimulations] = useState<InterviewSimulation[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<InterviewSimulation | null>(null);
  const [simulationDifficulty, setSimulationDifficulty] = useState<SimulationDifficulty>("mid");
  const [isCreatingSimulation, setIsCreatingSimulation] = useState(false);
  const [simulationAnswer, setSimulationAnswer] = useState("");
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState<{ evaluation: AnswerEvaluation; questionIndex: number } | null>(null);
  const [isCompletingSimulation, setIsCompletingSimulation] = useState(false);

  const form = useForm<JobApplicationInput>({
    defaultValues: {
      jobDescription: "",
      jobTitle: "",
      companyName: "",
      tone: "Professional"
    }
  });

  useEffect(() => {
    api.getProfile().then(setProfile);
    api.getResumeTemplates().then(setTemplates).catch(() => {});
    
    // If we have a slug from the URL, load the application
    if (params?.slug) {
      api.getApplicationBySlug(params.slug).then(app => {
        form.setValue("companyName", app.company);
        form.setValue("jobTitle", app.jobTitle);
        form.setValue("jobDescription", app.jobDescription);
        savedApplicationRef.current = app.id;
        setApplicationLoaded(true);
        
        if (app.generatedResume) {
          setResume(app.generatedResume);
        }
        if (app.generatedCoverLetter) {
          setCoverLetter({ coverLetter: app.generatedCoverLetter });
        }
        if (app.resumeSettings) {
          setSettings({ ...defaultSettings, ...app.resumeSettings });
        }
        if (app.interviewDate) {
          setInterviewDate(new Date(app.interviewDate));
        }
        // Load cached ranking if available
        api.getCachedRanking(app.id).then(cachedRanking => {
          if (cachedRanking) setRanking(cachedRanking);
        }).catch(() => {});
      }).catch(() => {
        toast({
          title: "Application not found",
          description: "The application you're looking for could not be found.",
          variant: "destructive"
        });
      });
      return;
    }
    
    // Fallback to sessionStorage for backwards compatibility
    const prefill = sessionStorage.getItem("prefillApplication");
    if (prefill) {
      try {
        const data = JSON.parse(prefill);
        if (data.company) form.setValue("companyName", data.company);
        if (data.jobTitle) form.setValue("jobTitle", data.jobTitle);
        if (data.jobDescription) form.setValue("jobDescription", data.jobDescription);
        if (data.applicationId) {
          savedApplicationRef.current = data.applicationId;
          setApplicationLoaded(true);
          api.getApplication(data.applicationId).then(app => {
            if (app.generatedResume) {
              setResume(app.generatedResume);
            }
            if (app.generatedCoverLetter) {
              setCoverLetter({ coverLetter: app.generatedCoverLetter });
            }
            if (app.resumeSettings) {
              setSettings({ ...defaultSettings, ...app.resumeSettings });
            }
            if (app.interviewDate) {
              setInterviewDate(new Date(app.interviewDate));
            }
            // Load cached ranking if available
            api.getCachedRanking(data.applicationId).then(cachedRanking => {
              if (cachedRanking) setRanking(cachedRanking);
            }).catch(() => {});
          }).catch(() => {});
        }
        sessionStorage.removeItem("prefillApplication");
      } catch (e) {}
    }
  }, [params?.slug]);

  const updateSettings = async (newSettings: Partial<ResumeSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    setPreviewKey(prev => prev + 1);
    
    if (savedApplicationRef.current) {
      try {
        await api.updateResumeSettings(savedApplicationRef.current, newSettings);
      } catch (e) {
        console.error("Failed to save settings:", e);
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = settings.sectionOrder.indexOf(active.id as string);
      const newIndex = settings.sectionOrder.indexOf(over.id as string);
      const newOrder = arrayMove(settings.sectionOrder, oldIndex, newIndex);
      updateSettings({ sectionOrder: newOrder });
    }
  };

  const handleUpdateSectionPrefs = (key: string, updates: Partial<{ title: string; hidden: boolean }>) => {
    const currentPrefs = settings.sectionPreferences || defaultSectionPreferences;
    const updatedPrefs = {
      ...currentPrefs,
      [key]: { ...currentPrefs[key], ...updates }
    };
    updateSettings({ sectionPreferences: updatedPrefs });
  };

  const startEditingResume = () => {
    if (resume) {
      setEditedLogline([...(resume.logline || [])]);
      setIsEditingResume(true);
    }
  };

  const cancelEditingResume = () => {
    setIsEditingResume(false);
    setEditedLogline([]);
  };

  const saveResumeEdits = async () => {
    if (!savedApplicationRef.current || !resume) return;
    
    try {
      const updatedResume = { ...resume, logline: editedLogline };
      await api.updateResumeContent(savedApplicationRef.current, updatedResume);
      setResume(updatedResume);
      setIsEditingResume(false);
      setPreviewKey(prev => prev + 1);
      toast({ title: "Saved", description: "Resume content updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const startEditingCoverLetter = () => {
    if (coverLetter) {
      setEditedCoverLetter(coverLetter.coverLetter);
      setIsEditingCoverLetter(true);
    }
  };

  const cancelEditingCoverLetter = () => {
    setIsEditingCoverLetter(false);
    setEditedCoverLetter("");
  };

  const saveCoverLetterEdits = async () => {
    if (!savedApplicationRef.current) return;
    
    try {
      await api.updateCoverLetterContent(savedApplicationRef.current, editedCoverLetter);
      setCoverLetter({ coverLetter: editedCoverLetter });
      setIsEditingCoverLetter(false);
      toast({ title: "Saved", description: "Cover letter updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const startEditingSkills = () => {
    if (resume) {
      setEditedSkills(resume.relevantSkills?.join(", ") || resume.technologies || "");
      setIsEditingSkills(true);
    }
  };

  const cancelEditingSkills = () => {
    setIsEditingSkills(false);
    setEditedSkills("");
  };

  const saveSkillsEdits = async () => {
    if (!savedApplicationRef.current || !resume) return;
    
    try {
      const skillsArray = editedSkills.split(",").map(s => s.trim()).filter(Boolean);
      const updatedResume = { ...resume, relevantSkills: skillsArray, technologies: editedSkills };
      await api.updateResumeContent(savedApplicationRef.current, updatedResume);
      setResume(updatedResume);
      setIsEditingSkills(false);
      setPreviewKey(prev => prev + 1);
      toast({ title: "Saved", description: "Skills updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const startEditingExperience = () => {
    if (resume) {
      const deepClone = resume.experiences.map(exp => ({
        ...exp,
        bullets: [...exp.bullets]
      }));
      setEditedExperiences(deepClone);
      setIsEditingExperience(true);
    }
  };

  const cancelEditingExperience = () => {
    setIsEditingExperience(false);
    setEditedExperiences([]);
  };

  const saveExperienceEdits = async () => {
    if (!savedApplicationRef.current || !resume) return;
    
    try {
      const updatedResume = { ...resume, experiences: editedExperiences };
      await api.updateResumeContent(savedApplicationRef.current, updatedResume);
      setResume(updatedResume);
      setIsEditingExperience(false);
      setPreviewKey(prev => prev + 1);
      toast({ title: "Saved", description: "Experience updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const updateExperienceField = (index: number, field: string, value: string) => {
    setEditedExperiences(prev => prev.map((exp, i) => 
      i === index ? { ...exp, [field]: value } : exp
    ));
  };

  const updateExperienceBullet = (expIndex: number, bulletIndex: number, value: string) => {
    setEditedExperiences(prev => prev.map((exp, i) => 
      i === expIndex 
        ? { ...exp, bullets: exp.bullets.map((b, j) => j === bulletIndex ? value : b) }
        : exp
    ));
  };

  const addExperienceBullet = (expIndex: number) => {
    setEditedExperiences(prev => prev.map((exp, i) => 
      i === expIndex 
        ? { ...exp, bullets: [...exp.bullets, ""] }
        : exp
    ));
  };

  const removeExperienceBullet = (expIndex: number, bulletIndex: number) => {
    setEditedExperiences(prev => prev.map((exp, i) => 
      i === expIndex 
        ? { ...exp, bullets: exp.bullets.filter((_, j) => j !== bulletIndex) }
        : exp
    ));
  };

  const removeExperience = (index: number) => {
    setEditedExperiences(prev => prev.filter((_, i) => i !== index));
  };

  const saveApplication = async (data: JobApplicationInput) => {
    if (savedApplicationRef.current) return;
    
    try {
      const app = await api.createApplication({
        company: data.companyName || "Unknown Company",
        jobTitle: data.jobTitle || "Unknown Position",
        jobDescription: data.jobDescription,
        status: "created"
      });
      savedApplicationRef.current = app.id;
      setApplicationLoaded(true);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["challenge"] });
    } catch (e) {
      console.error("Failed to save application:", e);
    }
  };

  const handleAnalyzeGap = async (data: JobApplicationInput) => {
    if (!profile) {
      toast({ title: "Profile Required", description: "Please save your profile first.", variant: "destructive" });
      return;
    }
    
    setIsAnalyzingGap(true);
    try {
      const result = await api.analyzeGap(data);
      // Store in ref synchronously for reliable access in handleGenerateAnyway
      gapAnalysisRef.current = result;
      setGapAnalysis(result);
      
      if (!result.shouldGenerateResume) {
        setShowGapWarning(true);
      } else {
        // Good match, proceed to generate - pass result directly since state update is async
        await handleGenerateBothDirect(data, result);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to analyze job fit.", variant: "destructive" });
    } finally {
      setIsAnalyzingGap(false);
    }
  };

  const handleGenerateBothDirect = async (data: JobApplicationInput, gapResult?: GapAnalysis) => {
    if (!profile) {
      toast({ title: "Profile Required", description: "Please save your profile first.", variant: "destructive" });
      return;
    }
    
    setIsGeneratingResume(true);
    setIsGeneratingCoverLetter(true);
    setShowGapWarning(false);
    
    // Use passed gapResult or fallback to ref (for "Generate Anyway" flow) - ref is synchronous and reliable
    const gapData = gapResult || gapAnalysisRef.current || gapAnalysis;
    
    try {
      let applicationId = savedApplicationRef.current;
      
      if (!applicationId) {
        const app = await api.createApplication({
          company: data.companyName || "Unknown Company",
          jobTitle: data.jobTitle || "Unknown Position",
          jobDescription: data.jobDescription,
          status: "created"
        });
        applicationId = app.id;
        savedApplicationRef.current = applicationId;
        setApplicationLoaded(true);
        queryClient.invalidateQueries({ queryKey: ["applications"] });
        queryClient.invalidateQueries({ queryKey: ["challenge"] });
      }
      
      const gapContextForGeneration = gapData ? {
        jobMatch: gapData.gapAnalysis.jobMatch,
        criticalGaps: gapData.gapAnalysis.criticalGaps,
        strongMatches: gapData.gapAnalysis.strongMatches,
        isLowMatch: !gapData.shouldGenerateResume
      } : undefined;
      
      const result = await api.generateForApplication(applicationId, data.tone, {
        jobDescription: data.jobDescription,
        jobTitle: data.jobTitle,
        company: data.companyName
      }, gapContextForGeneration);
      
      if (!result.resume.logline || !result.resume.experiences) {
        throw new Error("Invalid response from AI. Please try again.");
      }
      
      setResume(result.resume);
      setCoverLetter({ coverLetter: result.coverLetter });
      setUnsupportedNumbers(result.unsupportedNumbers ?? []);
      setRanking(null);
      setGapAnalysis(null);
      gapAnalysisRef.current = null;
      
      toast({ title: "Generated!", description: "Your tailored resume and cover letter are ready and saved." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to generate materials.", variant: "destructive" });
    } finally {
      setIsGeneratingResume(false);
      setIsGeneratingCoverLetter(false);
    }
  };

  const handleGenerateResume = async (data: JobApplicationInput) => {
    await handleAnalyzeGap(data);
  };

  const handleGenerateCoverLetter = async (data: JobApplicationInput) => {
    await handleAnalyzeGap(data);
  };
  
  const handleSkipJob = () => {
    setShowGapWarning(false);
    setGapAnalysis(null);
    gapAnalysisRef.current = null;
    form.reset();
    toast({ title: "Job Skipped", description: "You can try a different job that better matches your skills." });
  };

  const handleGenerateAnyway = async () => {
    const data = form.getValues();
    // gapAnalysis state is already set from the warning flow
    await handleGenerateBothDirect(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Text copied to clipboard." });
  };

  const downloadResume = () => {
    if (!resume || !profile) return;
    
    const companyName = form.getValues("companyName") || "Company";
    const jobTitle = form.getValues("jobTitle") || "Position";
    
    const prefs = settings.sectionPreferences || defaultSectionPreferences;
    const getSectionTitle = (key: string, defaultTitle: string) => {
      const pref = prefs[key];
      if (!pref) return defaultTitle;
      if (pref.title === undefined) return defaultTitle;
      return pref.title;
    };
    const isHidden = (key: string) => prefs[key]?.hidden === true;
    
    let content = `${profile.firstName} ${profile.lastName}\n`;
    content += `${profile.email} | ${profile.phone}${profile.linkedinUrl ? ` | ${profile.linkedinUrl}` : ""}\n\n`;
    
    const sectionGenerators: Record<string, () => string> = {
      summary: () => {
        if (isHidden("summary")) return "";
        const title = getSectionTitle("summary", "");
        let s = title ? `=== ${title.toUpperCase()} ===\n` : "";
        s += (resume.logline || []).map(line => `• ${line}`).join("\n") + "\n\n";
        return s;
      },
      skills: () => {
        if (isHidden("skills")) return "";
        const title = getSectionTitle("skills", "SKILLS");
        let s = `=== ${title.toUpperCase()} ===\n`;
        s += `${resume.technologies || ""}\n`;
        if (resume.relevantSkills && resume.relevantSkills.length > 0) {
          s += `Key Skills: ${resume.relevantSkills.join(", ")}\n`;
        }
        s += "\n";
        return s;
      },
      experience: () => {
        if (isHidden("experience")) return "";
        const title = getSectionTitle("experience", "EXPERIENCE");
        let s = `=== ${title.toUpperCase()} ===\n`;
        (resume.experiences || []).forEach(exp => {
          s += `\n${exp.title}\n`;
          s += `${exp.company} | ${exp.location} | ${exp.start} - ${exp.end}\n`;
          (exp.bullets || []).forEach(bullet => {
            s += `  • ${bullet}\n`;
          });
        });
        s += "\n";
        return s;
      },
      education: () => {
        if (isHidden("education")) return "";
        const title = getSectionTitle("education", "EDUCATION");
        let s = `=== ${title.toUpperCase()} ===\n`;
        (profile.education || []).forEach(edu => {
          s += `${edu.degree} in ${edu.field}\n`;
          s += `${edu.school} | ${edu.startDate} - ${edu.endDate}\n\n`;
        });
        return s;
      }
    };
    
    settings.sectionOrder.forEach(section => {
      const generator = sectionGenerators[section];
      if (generator) {
        content += generator();
      }
    });
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Resume_${companyName.replace(/\s+/g, "_")}_${jobTitle.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Resume saved as text file." });
  };

  const downloadCoverLetter = () => {
    if (!coverLetter) return;
    
    const companyName = form.getValues("companyName") || "Company";
    const jobTitle = form.getValues("jobTitle") || "Position";
    
    const blob = new Blob([coverLetter.coverLetter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CoverLetter_${companyName.replace(/\s+/g, "_")}_${jobTitle.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Cover letter saved as text file." });
  };

  const downloadCoverLetterFile = (format: "pdf" | "docx") => {
    if (!savedApplicationRef.current) {
      toast({ title: "Error", description: "Please generate a cover letter first.", variant: "destructive" });
      return;
    }
    window.open(`/api/applications/${savedApplicationRef.current}/cover-letter.${format}`, "_blank");
    toast({ title: "Downloading!", description: `Cover letter ${format.toUpperCase()} is being generated.` });
  };

  const loadTrainingData = async () => {
    if (!savedApplicationRef.current) return;
    try {
      const response = await fetch(`/api/applications/${savedApplicationRef.current}/training`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setTrainings(data.trainings || []);
        setReadinessScore(data.readinessScore || 0);
      }
      
      const sims = await api.getSimulations(savedApplicationRef.current);
      setSimulations(sims);
    } catch (e) {
      console.error("Failed to load training data:", e);
    }
  };

  const handleStartSimulation = async () => {
    if (!savedApplicationRef.current) {
      toast({ title: "Save application first", description: "Generate a resume before starting mock interviews.", variant: "destructive" });
      return;
    }
    setIsCreatingSimulation(true);
    try {
      const simulation = await api.createSimulation(savedApplicationRef.current, simulationDifficulty);
      setActiveSimulation(simulation);
      setSimulations(prev => [simulation, ...prev]);
      setSimulationAnswer("");
      setLastEvaluation(null);
    } catch (e) {
      toast({ title: "Error", description: "Failed to create mock interview.", variant: "destructive" });
    } finally {
      setIsCreatingSimulation(false);
    }
  };

  const handleSubmitSimulationAnswer = async () => {
    if (!activeSimulation || !simulationAnswer.trim()) return;
    const answeredIndex = activeSimulation.currentQuestionIndex;
    setIsSubmittingAnswer(true);
    try {
      const { simulation, evaluation } = await api.submitAnswer(
        activeSimulation.id, 
        answeredIndex, 
        simulationAnswer
      );
      setActiveSimulation(simulation);
      setLastEvaluation({ evaluation, questionIndex: answeredIndex });
      setSimulationAnswer("");
      setSimulations(prev => prev.map(s => s.id === simulation.id ? simulation : s));
    } catch (e) {
      toast({ title: "Error", description: "Failed to submit answer.", variant: "destructive" });
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleNextSimulationQuestion = () => {
    setLastEvaluation(null);
  };

  const handleCompleteSimulation = async () => {
    if (!activeSimulation) return;
    setIsCompletingSimulation(true);
    try {
      const completed = await api.completeSimulation(activeSimulation.id);
      setActiveSimulation(completed);
      setSimulations(prev => prev.map(s => s.id === completed.id ? completed : s));
    } catch (e) {
      toast({ title: "Error", description: "Failed to complete interview.", variant: "destructive" });
    } finally {
      setIsCompletingSimulation(false);
    }
  };

  const handleExitSimulation = () => {
    setActiveSimulation(null);
    setLastEvaluation(null);
    setSimulationAnswer("");
  };

  const handleResumeSimulation = (simulation: InterviewSimulation) => {
    setActiveSimulation(simulation);
    setSimulationAnswer("");
    setLastEvaluation(null);
  };

  const handleStartTraining = async () => {
    if (!savedApplicationRef.current) {
      toast({ title: "Save application first", description: "Generate a resume before starting interview training.", variant: "destructive" });
      return;
    }
    setIsGeneratingTraining(true);
    try {
      const response = await fetch(`/api/applications/${savedApplicationRef.current}/training`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ category: trainingCategory, difficulty: trainingDifficulty })
      });
      if (!response.ok) throw new Error("Failed to generate training");
      const training = await response.json();
      setSelectedTraining(training);
      setCurrentQuestionIndex(0);
      setShowAnswer(false);
      await loadTrainingData();
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate interview training. Try again.", variant: "destructive" });
    } finally {
      setIsGeneratingTraining(false);
    }
  };

  const handleMarkQuestion = async (isCorrect: boolean) => {
    if (!selectedTraining) return;
    const newAnswered = currentQuestionIndex + 1;
    const newCorrect = selectedTraining.correctAnswers + (isCorrect ? 1 : 0);
    
    try {
      const response = await fetch(`/api/training/${selectedTraining.id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answered: newAnswered, correct: newCorrect })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedTraining(updated);
        if (currentQuestionIndex < selectedTraining.questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setShowAnswer(false);
        } else {
          setSelectedTraining(null);
          await loadTrainingData();
          toast({ title: "Training Complete!", description: `You scored ${newCorrect}/${newAnswered} on this session.` });
        }
      }
    } catch (e) {
      console.error("Failed to update progress:", e);
    }
  };

  const handleUpdateInterviewDate = async (date: Date | undefined) => {
    if (!savedApplicationRef.current) {
      toast({ title: "Error", description: "Please save the application first", variant: "destructive" });
      return;
    }
    
    setIsUpdatingInterviewDate(true);
    try {
      const response = await fetch(`/api/applications/${savedApplicationRef.current}/interview-date`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ interviewDate: date?.toISOString() || null })
      });
      
      if (!response.ok) throw new Error("Failed to update interview date");
      
      setInterviewDate(date);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast({ 
        title: date ? "Interview Scheduled" : "Interview Date Cleared", 
        description: date ? `Interview set for ${format(date, "PPP")}` : "Interview date has been removed" 
      });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update interview date", variant: "destructive" });
    } finally {
      setIsUpdatingInterviewDate(false);
    }
  };

  const handleEvaluateRanking = async () => {
    if (!savedApplicationRef.current || !resume) {
      toast({ title: "Resume Required", description: "Generate a resume first before evaluating.", variant: "destructive" });
      return;
    }
    
    setIsEvaluatingRanking(true);
    try {
      const result = await api.evaluateResumeRanking(savedApplicationRef.current);
      setRanking(result);
      toast({ title: "Evaluation Complete", description: "Your resume has been evaluated from a recruiter's perspective." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to evaluate resume.", variant: "destructive" });
    } finally {
      setIsEvaluatingRanking(false);
    }
  };

  const handleApplyRecommendations = async () => {
    if (!savedApplicationRef.current || !resume || !ranking) {
      toast({ title: "Requirements Missing", description: "Resume and ranking required to apply recommendations.", variant: "destructive" });
      return;
    }

    setIsApplyingRecommendations(true);
    try {
      const response = await fetch(`/api/applications/${savedApplicationRef.current}/apply-recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to apply recommendations");
      }

      const result = await response.json();
      setResume(result.resume);
      setRanking(null);
      setPreviewKey(prev => prev + 1);
      setIsEditingResume(false);
      setIsEditingExperience(false);
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({ 
        title: "Recommendations Applied", 
        description: "Your resume has been improved. Re-evaluate to see the new score." 
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to apply recommendations.", variant: "destructive" });
    } finally {
      setIsApplyingRecommendations(false);
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "STRONG_PASS": return "text-green-600 bg-green-50";
      case "PASS": return "text-emerald-600 bg-emerald-50";
      case "MAYBE": return "text-yellow-600 bg-yellow-50";
      case "WEAK": return "text-orange-600 bg-orange-50";
      case "REJECT": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-emerald-600";
    if (score >= 40) return "text-yellow-600";
    if (score >= 20) return "text-orange-600";
    return "text-red-600";
  };

  if (!profile) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="grid gap-6 lg:gap-8 lg:grid-cols-12 animate-in fade-in duration-500">
      
      {/* Input Section */}
      <div className="lg:col-span-5 space-y-4 sm:space-y-8">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold">New Application</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Paste the job description and let AI tailor your application.</p>
        </div>

        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Job Description</Label>
              <Textarea 
                className="min-h-[200px] text-sm"
                placeholder="Paste the full job description here..."
                {...form.register("jobDescription", { required: true })}
              />
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input placeholder="Senior Frontend Dev" {...form.register("jobTitle")} />
              </div>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input placeholder="Tech Corp" {...form.register("companyName")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tone</Label>
              <Select 
                defaultValue="Professional" 
                onValueChange={(v: any) => form.setValue("tone", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Friendly">Friendly</SelectItem>
                  <SelectItem value="Confident">Confident</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {savedApplicationRef.current && (
              <div className="space-y-2">
                <Label>Interview Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      disabled={isUpdatingInterviewDate}
                      data-testid="button-interview-date"
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {interviewDate ? (
                        <span>
                          {format(interviewDate, "PPP")}
                          {differenceInDays(interviewDate, new Date()) >= 0 && (
                            <span className="ml-2 text-muted-foreground">
                              ({differenceInDays(interviewDate, new Date())} days left)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Set interview date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={interviewDate}
                      onSelect={handleUpdateInterviewDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                    {interviewDate && (
                      <div className="p-2 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-destructive"
                          onClick={() => handleUpdateInterviewDate(undefined)}
                          data-testid="button-clear-interview-date"
                        >
                          Clear Date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button 
                className="flex-1"
                onClick={form.handleSubmit(handleGenerateResume)}
                disabled={isGeneratingResume || isAnalyzingGap}
                data-testid="button-generate-resume"
              >
                {isAnalyzingGap ? (
                  <><Search className="size-4 mr-2 animate-pulse" /> Analyzing...</>
                ) : isGeneratingResume ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><FileText className="size-4 mr-2" /> Generate</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gap Analysis Warning Dialog */}
        <Dialog open={showGapWarning} onOpenChange={setShowGapWarning}>
          <DialogContent className="max-w-md !p-0 overflow-hidden" style={{ maxHeight: '500px' }}>
            <div className="p-4 border-b">
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="size-5" />
                Low Job Match Detected
              </DialogTitle>
            </div>
            {gapAnalysis && (
              <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: '340px' }}>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <div className="text-xs text-muted-foreground">Match</div>
                    <div className="text-2xl font-bold text-orange-600">{gapAnalysis.gapAnalysis.jobMatch}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Interview Odds</div>
                    <div className="text-xl font-semibold text-orange-600">{gapAnalysis.gapAnalysis.interviewProbability}%</div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{gapAnalysis.gapAnalysis.recommendationReason}</p>

                {gapAnalysis.gapAnalysis.criticalGaps.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium flex items-center gap-1 text-red-600">
                      <XCircle className="size-3" /> Critical Gaps ({gapAnalysis.gapAnalysis.criticalGaps.length})
                    </div>
                    <ul className="text-xs space-y-0.5 pl-4">
                      {gapAnalysis.gapAnalysis.criticalGaps.slice(0, 3).map((gap, i) => (
                        <li key={i} className="list-disc text-red-600">{gap}</li>
                      ))}
                      {gapAnalysis.gapAnalysis.criticalGaps.length > 3 && (
                        <li className="list-none text-muted-foreground">+{gapAnalysis.gapAnalysis.criticalGaps.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {gapAnalysis.gapAnalysis.strongMatches.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium flex items-center gap-1 text-green-600">
                      <CheckCircle className="size-3" /> Strengths ({gapAnalysis.gapAnalysis.strongMatches.length})
                    </div>
                    <ul className="text-xs space-y-0.5 pl-4">
                      {gapAnalysis.gapAnalysis.strongMatches.slice(0, 3).map((match, i) => (
                        <li key={i} className="list-disc text-green-600">{match}</li>
                      ))}
                      {gapAnalysis.gapAnalysis.strongMatches.length > 3 && (
                        <li className="list-none text-muted-foreground">+{gapAnalysis.gapAnalysis.strongMatches.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {gapAnalysis.gapAnalysis.suggestedActions.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium flex items-center gap-1 text-blue-600">
                      <Lightbulb className="size-3" /> Actions
                    </div>
                    <ul className="text-xs space-y-0.5 pl-4">
                      {gapAnalysis.gapAnalysis.suggestedActions.slice(0, 2).map((action, i) => (
                        <li key={i} className="list-disc">{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {gapAnalysis.gapAnalysis.betterJobMatches.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium flex items-center gap-1 text-emerald-600">
                      <Target className="size-3" /> Better Matches
                    </div>
                    <p className="text-xs pl-4">{gapAnalysis.gapAnalysis.betterJobMatches.slice(0, 2).join(", ")}</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3 p-4 border-t bg-muted/30">
              <Button variant="outline" className="flex-1" onClick={handleSkipJob} data-testid="button-skip-job">
                <X className="size-4 mr-2" />
                Skip
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleGenerateAnyway}
                disabled={isGeneratingResume}
                data-testid="button-generate-anyway"
              >
                {isGeneratingResume ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><ArrowRight className="size-4 mr-2" /> Generate Anyway</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Results Section */}
      <div className="lg:col-span-7 space-y-4 sm:space-y-8">
        <Tabs defaultValue="resume" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resume" className="text-xs sm:text-sm">Resume</TabsTrigger>
            <TabsTrigger value="cover-letter" className="text-xs sm:text-sm">Cover Letter</TabsTrigger>
            <TabsTrigger value="ranking" className="text-xs sm:text-sm">Score</TabsTrigger>
            <TabsTrigger value="interview" className="text-xs sm:text-sm" onClick={loadTrainingData}>Interview</TabsTrigger>
          </TabsList>

          <TabsContent value="resume" className="space-y-4 mt-4">
            {!resume || !resume.logline ? (
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
                <Wand2 className="size-12 mb-4 opacity-20" />
                <p>Fill out the job details and click Generate Resume</p>
              </div>
            ) : (
              <div className="space-y-6">
                {unsupportedNumbers.length > 0 && (
                  <Alert variant="destructive" data-testid="warning-unsupported-numbers">
                    <AlertTriangle className="size-4" />
                    <AlertTitle>Verify these numbers before applying</AlertTitle>
                    <AlertDescription>
                      These figures are not in your profile or the job description: {unsupportedNumbers.join(", ")}. Replace them with real values or remove them.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-between items-center mb-2">
                  <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-customize-resume">
                        <Settings2 className="size-4 mr-2" />
                        Customize Design
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Customize Resume Design</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-6 py-4">
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Template</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {(templates?.templates || []).map(t => (
                              <div
                                key={t.id}
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${settings.template === t.id ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`}
                                onClick={() => updateSettings({ template: t.id as any })}
                                data-testid={`template-${t.id}`}
                              >
                                <div className="font-medium">{t.name}</div>
                                <div className="text-xs text-muted-foreground">{t.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Accent Color</Label>
                          <div className="flex flex-wrap gap-2">
                            {(templates?.colors || []).map(c => (
                              <button
                                key={c.id}
                                className={`w-10 h-10 rounded-full border-2 transition-all ${settings.primaryColor === c.id ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                                style={{ backgroundColor: c.id }}
                                onClick={() => updateSettings({ primaryColor: c.id })}
                                title={c.name}
                                data-testid={`color-${c.name.toLowerCase()}`}
                              />
                            ))}
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Font Family</Label>
                          <Select value={settings.fontFamily} onValueChange={(v) => updateSettings({ fontFamily: v })}>
                            <SelectTrigger data-testid="select-font">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(templates?.fonts || []).map(f => (
                                <SelectItem key={f.id} value={f.id}>{f.name} ({f.category})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Font Size</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {(templates?.fontSizes || []).map(s => (
                              <button
                                key={s.id}
                                className={`p-3 border-2 rounded-lg text-center transition-all ${settings.fontSize === s.id ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`}
                                onClick={() => updateSettings({ fontSize: s.id as any })}
                                data-testid={`fontsize-${s.id}`}
                              >
                                <div className="font-medium text-sm">{s.name}</div>
                                <div className="text-xs text-muted-foreground">{s.description}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Section Order</Label>
                          <p className="text-sm text-muted-foreground">Drag to reorder sections on your resume</p>
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={settings.sectionOrder} strategy={verticalListSortingStrategy}>
                              <div className="space-y-2">
                                {settings.sectionOrder.map((section) => (
                                  <SortableSectionItem key={section} id={section} prefs={settings.sectionPreferences || defaultSectionPreferences} onUpdatePrefs={handleUpdateSectionPrefs} />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-download-resume">
                        <FileDown className="size-4 mr-2" />
                        Download
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => savedApplicationRef.current && window.open(api.getResumePdfUrl(savedApplicationRef.current), "_blank")}>
                        <FileText className="size-4 mr-2" />
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => savedApplicationRef.current && window.open(api.getResumeDocxUrl(savedApplicationRef.current), "_blank")}>
                        <FileUser className="size-4 mr-2" />
                        Download Word (.docx)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={downloadResume}>
                        <Download className="size-4 mr-2" />
                        Download Text
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {savedApplicationRef.current && (
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Palette className="size-4" />
                        Resume Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <iframe
                        key={previewKey}
                        src={api.getResumePreviewUrl(savedApplicationRef.current)}
                        className="w-full h-[500px] border-t"
                        title="Resume Preview"
                      />
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">Logline & Summary</CardTitle>
                    <div className="flex gap-1">
                      {isEditingResume ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={saveResumeEdits} data-testid="button-save-logline">
                            <Save className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelEditingResume}>
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={startEditingResume} data-testid="button-edit-logline">
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard((resume.logline || []).join("\n"))}>
                            <Copy className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditingResume ? (
                      <div className="space-y-2">
                        {editedLogline.map((line, i) => (
                          <Textarea
                            key={i}
                            value={line}
                            onChange={(e) => {
                              const newLogline = [...editedLogline];
                              newLogline[i] = e.target.value;
                              setEditedLogline(newLogline);
                            }}
                            className="min-h-[60px] text-sm"
                            placeholder={`Bullet point ${i + 1}`}
                          />
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditedLogline([...editedLogline, ""])}
                          className="w-full"
                        >
                          Add bullet point
                        </Button>
                      </div>
                    ) : (
                      <ul className="list-disc list-outside ml-4 space-y-1 text-sm text-foreground/90">
                        {(resume.logline || []).map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">Relevant Skills</CardTitle>
                    <div className="flex gap-1">
                      {isEditingSkills ? (
                        <>
                          <Button variant="outline" size="sm" onClick={saveSkillsEdits}>
                            <Save className="size-4 mr-1" />
                            Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelEditingSkills}>
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={startEditingSkills} data-testid="button-edit-skills">
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(resume.technologies || "")}>
                            <Copy className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditingSkills ? (
                      <Textarea
                        value={editedSkills}
                        onChange={(e) => setEditedSkills(e.target.value)}
                        placeholder="Enter skills separated by commas..."
                        className="text-sm"
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm font-medium">{resume.relevantSkills?.join(", ") || resume.technologies || "No skills found"}</p>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-serif font-semibold">Experience</h3>
                    <div className="flex gap-1">
                      {isEditingExperience ? (
                        <>
                          <Button variant="outline" size="sm" onClick={saveExperienceEdits}>
                            <Save className="size-4 mr-1" />
                            Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelEditingExperience}>
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={startEditingExperience} data-testid="button-edit-experience">
                          <Pencil className="size-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                  {isEditingExperience ? (
                    editedExperiences.map((exp, i) => (
                      <Card key={i} className="relative">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeExperience(i)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <CardContent className="pt-4 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Job Title</Label>
                              <Input
                                value={exp.title}
                                onChange={(e) => updateExperienceField(i, "title", e.target.value)}
                                placeholder="Job Title"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Company</Label>
                              <Input
                                value={exp.company}
                                onChange={(e) => updateExperienceField(i, "company", e.target.value)}
                                placeholder="Company"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs">Location</Label>
                              <Input
                                value={exp.location}
                                onChange={(e) => updateExperienceField(i, "location", e.target.value)}
                                placeholder="Location"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Start</Label>
                              <Input
                                value={exp.start}
                                onChange={(e) => updateExperienceField(i, "start", e.target.value)}
                                placeholder="Start Date"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">End</Label>
                              <Input
                                value={exp.end}
                                onChange={(e) => updateExperienceField(i, "end", e.target.value)}
                                placeholder="End Date"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Accomplishments</Label>
                            <div className="space-y-2 mt-1">
                              {exp.bullets.map((bullet, j) => (
                                <div key={j} className="flex gap-1">
                                  <Input
                                    value={bullet}
                                    onChange={(e) => updateExperienceBullet(i, j, e.target.value)}
                                    placeholder="Accomplishment..."
                                    className="flex-1"
                                  />
                                  <Button variant="ghost" size="sm" onClick={() => removeExperienceBullet(i, j)}>
                                    <X className="size-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button variant="outline" size="sm" onClick={() => addExperienceBullet(i)}>
                                <Plus className="size-4 mr-1" />
                                Add Bullet
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    (resume.experiences || []).map((exp, i) => (
                      <Card key={i}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{exp.title}</CardTitle>
                              <CardDescription>{exp.company} • {exp.location}</CardDescription>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {exp.start} - {exp.end}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-outside ml-4 space-y-1.5 text-sm text-foreground/90">
                            {(exp.bullets || []).map((bullet, j) => (
                              <li key={j}>{bullet}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cover-letter" className="mt-4">
            {!coverLetter ? (
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
                <FileUser className="size-12 mb-4 opacity-20" />
                <p>Click Generate Cover Letter to create a draft</p>
              </div>
            ) : (
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Cover Letter Draft</CardTitle>
                  <div className="flex gap-2">
                    {isEditingCoverLetter ? (
                      <>
                        <Button variant="outline" size="sm" onClick={saveCoverLetterEdits} data-testid="button-save-cover-letter">
                          <Save className="size-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={cancelEditingCoverLetter}>
                          <X className="size-4 mr-2" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={startEditingCoverLetter} data-testid="button-edit-cover-letter">
                          <Pencil className="size-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(coverLetter.coverLetter)}>
                          <Copy className="size-4 mr-2" />
                          Copy
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" data-testid="button-download-cover-letter">
                              <Download className="size-4 mr-2" />
                              Download
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => downloadCoverLetterFile("pdf")} data-testid="button-download-cover-letter-pdf">
                              <FileDown className="size-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadCoverLetterFile("docx")} data-testid="button-download-cover-letter-docx">
                              <FileText className="size-4 mr-2" />
                              Download DOCX
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={downloadCoverLetter} data-testid="button-download-cover-letter-txt">
                              <FileText className="size-4 mr-2" />
                              Download TXT
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditingCoverLetter ? (
                    <Textarea
                      value={editedCoverLetter}
                      onChange={(e) => setEditedCoverLetter(e.target.value)}
                      className="min-h-[400px] font-serif text-sm leading-relaxed"
                      placeholder="Edit your cover letter..."
                    />
                  ) : (
                    <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed p-4 bg-muted/20 rounded-md">
                      {coverLetter.coverLetter}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ranking" className="mt-4">
            {!resume ? (
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
                <BarChart3 className="size-12 mb-4 opacity-20" />
                <p>Generate a resume first to get a recruiter-style evaluation</p>
              </div>
            ) : !ranking ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="size-5" />
                    Resume Ranking System
                  </CardTitle>
                  <CardDescription>
                    Get AI-powered feedback from a recruiter's perspective. See how your resume scores across 6 key categories and get actionable improvement suggestions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-8">
                  <Button 
                    size="lg" 
                    onClick={handleEvaluateRanking}
                    disabled={isEvaluatingRanking}
                    data-testid="button-evaluate-ranking"
                  >
                    {isEvaluatingRanking ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Evaluating...
                      </>
                    ) : (
                      <>
                        <Star className="size-4 mr-2" />
                        Evaluate My Resume
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4 text-center max-w-md">
                    This evaluation simulates how a recruiter would review your resume in the first 6 seconds of screening.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Overall Score Card */}
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">Overall Score</h3>
                        <p className={`text-5xl font-bold ${getScoreColor(ranking.overallScore)}`}>
                          {ranking.overallScore}<span className="text-lg text-muted-foreground">/100</span>
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getRecommendationColor(ranking.recommendation)}`}>
                          {ranking.recommendation.replace("_", " ")}
                        </span>
                        <p className="text-sm text-muted-foreground">
                          Interview probability: <span className="font-semibold">{ranking.interviewProbability}%</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Category Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Category Scores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { key: "atsOptimization", label: "ATS Optimization", weight: "20%" },
                      { key: "humanReadability", label: "Human Readability", weight: "20%" },
                      { key: "jobMatch", label: "Job Match", weight: "25%" },
                      { key: "impactCommunication", label: "Impact Communication", weight: "20%" },
                      { key: "professionalPresentation", label: "Professional Presentation", weight: "10%" },
                      { key: "truthfulness", label: "Truthfulness", weight: "5%" },
                    ].map(({ key, label, weight }) => {
                      const cat = ranking.categories[key as keyof typeof ranking.categories];
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{label} <span className="text-xs text-muted-foreground">({weight})</span></span>
                            <span className={`text-sm font-bold ${getScoreColor(cat.score)}`}>{cat.score}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all bg-primary" 
                              style={{ width: `${cat.score}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{cat.feedback}</p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Strengths & Weaknesses */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-green-600">
                        <CheckCircle className="size-4" />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {ranking.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">+</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                        <XCircle className="size-4" />
                        Weaknesses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {ranking.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">-</span>
                            {w}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Red Flags */}
                {ranking.redFlags.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-red-600">
                        <AlertTriangle className="size-4" />
                        Red Flags
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {ranking.redFlags.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-red-600">
                            <span className="mt-0.5">!</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Improvements */}
                <Card className="border-blue-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2 text-blue-600">
                        <TrendingUp className="size-4" />
                        Recommended Improvements
                      </CardTitle>
                      <Button 
                        size="sm"
                        onClick={handleApplyRecommendations}
                        disabled={isApplyingRecommendations}
                        data-testid="button-apply-recommendations"
                      >
                        {isApplyingRecommendations ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <Wand2 className="size-4 mr-2" />
                            Apply Recommendations
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {ranking.improvements.map((imp, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold">{i + 1}.</span>
                          {imp}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                      This will improve your resume wording based on the feedback above. Your original experience stays the same.
                    </p>
                  </CardContent>
                </Card>

                {/* Re-evaluate Button */}
                <div className="text-center pt-2">
                  <Button 
                    variant="outline"
                    onClick={handleEvaluateRanking}
                    disabled={isEvaluatingRanking}
                    data-testid="button-reevaluate-ranking"
                  >
                    {isEvaluatingRanking ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Re-evaluating...
                      </>
                    ) : (
                      <>
                        <Star className="size-4 mr-2" />
                        Re-evaluate After Edits
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="interview" className="mt-4">
            {!applicationLoaded ? (
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
                <GraduationCap className="size-12 mb-4 opacity-20" />
                <p>Generate a resume first to start interview training</p>
              </div>
            ) : selectedTraining ? (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedTraining.category === "technical" ? <Brain className="size-5" /> : <Users className="size-5" />}
                        {selectedTraining.skillFocus}
                      </CardTitle>
                      <CardDescription>
                        Question {currentQuestionIndex + 1} of {selectedTraining.questions.length} • {selectedTraining.difficulty.toUpperCase()} difficulty
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTraining(null)} data-testid="button-exit-training">
                      <X className="size-4" />
                    </Button>
                  </div>
                  <Progress value={((currentQuestionIndex) / selectedTraining.questions.length) * 100} className="mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="font-medium text-lg">{selectedTraining.questions[currentQuestionIndex]?.question}</p>
                  </div>
                  
                  {!showAnswer ? (
                    <div className="flex justify-center">
                      <Button onClick={() => setShowAnswer(true)} data-testid="button-show-answer">
                        <Eye className="size-4 mr-2" />
                        Show Answer
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Model Answer:</h4>
                        <p className="text-sm">{selectedTraining.questions[currentQuestionIndex]?.answer}</p>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Tips:</h4>
                        <p className="text-sm">{selectedTraining.questions[currentQuestionIndex]?.explanation}</p>
                      </div>
                      <Separator />
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm text-muted-foreground">How did you do?</p>
                        <div className="flex gap-2">
                          <Button variant="outline" className="border-red-300 hover:bg-red-50" onClick={() => handleMarkQuestion(false)} data-testid="button-mark-incorrect">
                            <XCircle className="size-4 mr-2 text-red-500" />
                            Need Practice
                          </Button>
                          <Button variant="outline" className="border-green-300 hover:bg-green-50" onClick={() => handleMarkQuestion(true)} data-testid="button-mark-correct">
                            <CheckCircle className="size-4 mr-2 text-green-500" />
                            Got It
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-center sm:text-left">
                        <h3 className="text-lg font-semibold">Interview Readiness</h3>
                        <p className="text-muted-foreground text-sm">Based on your training progress</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`text-4xl font-bold ${readinessScore >= 70 ? "text-green-600" : readinessScore >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                          {readinessScore}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {readinessScore >= 70 ? "Ready!" : readinessScore >= 40 ? "Building" : "Start Training"}
                        </div>
                      </div>
                    </div>
                    <Progress value={readinessScore} className="mt-4" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="size-5" />
                      Start New Training Session
                    </CardTitle>
                    <CardDescription>
                      Practice interview questions tailored to this job application
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={trainingCategory} onValueChange={(v: "technical" | "soft") => setTrainingCategory(v)}>
                          <SelectTrigger data-testid="select-training-category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technical">
                              <div className="flex items-center gap-2">
                                <Brain className="size-4" />
                                Technical Skills
                              </div>
                            </SelectItem>
                            <SelectItem value="soft">
                              <div className="flex items-center gap-2">
                                <Users className="size-4" />
                                Soft Skills
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Difficulty</Label>
                        <Select value={trainingDifficulty} onValueChange={(v: "easy" | "medium" | "hard") => setTrainingDifficulty(v)}>
                          <SelectTrigger data-testid="select-training-difficulty">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button className="w-full" onClick={handleStartTraining} disabled={isGeneratingTraining} data-testid="button-start-training">
                      {isGeneratingTraining ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Generating Questions...
                        </>
                      ) : (
                        <>
                          <GraduationCap className="size-4 mr-2" />
                          Start Training
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {trainings.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Training History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {trainings.map((t) => (
                          <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => { setSelectedTraining(t); setCurrentQuestionIndex(t.answeredQuestions); setShowAnswer(false); }} data-testid={`training-item-${t.id}`}>
                            <div className="flex items-center gap-3">
                              {t.category === "technical" ? <Brain className="size-4 text-blue-500" /> : <Users className="size-4 text-purple-500" />}
                              <div>
                                <p className="font-medium text-sm">{t.skillFocus}</p>
                                <p className="text-xs text-muted-foreground">{t.difficulty} • {t.answeredQuestions}/{t.totalQuestions} completed</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`text-sm font-semibold ${t.readinessScore >= 70 ? "text-green-600" : t.readinessScore >= 40 ? "text-yellow-600" : "text-muted-foreground"}`}>
                                {t.readinessScore}%
                              </div>
                              <ChevronRight className="size-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Separator className="my-6" />

                {activeSimulation ? (
                  activeSimulation.status === "completed" ? (
                    <Card className="border-2 border-green-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="size-5 text-green-600" />
                            Mock Interview Complete
                          </CardTitle>
                          <Button variant="ghost" size="sm" onClick={handleExitSimulation} data-testid="button-exit-simulation">
                            <X className="size-4" />
                          </Button>
                        </div>
                        <CardDescription>
                          {activeSimulation.difficulty.toUpperCase()} level • {activeSimulation.questions.length} questions
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center py-4">
                          <div className={`text-5xl font-bold ${(activeSimulation.overallScore || 0) >= 70 ? "text-green-600" : (activeSimulation.overallScore || 0) >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                            {activeSimulation.overallScore}%
                          </div>
                          <p className="text-muted-foreground mt-1">Overall Score</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <h4 className="font-semibold mb-2">Interview Feedback</h4>
                          <p className="text-sm whitespace-pre-wrap">{activeSimulation.overallFeedback}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Brain className="size-5" />
                              Mock Interview
                            </CardTitle>
                            <CardDescription>
                              Question {activeSimulation.currentQuestionIndex + 1} of {activeSimulation.questions.length} • {activeSimulation.difficulty.toUpperCase()} level
                            </CardDescription>
                          </div>
                          <Button variant="ghost" size="sm" onClick={handleExitSimulation} data-testid="button-exit-simulation">
                            <X className="size-4" />
                          </Button>
                        </div>
                        <Progress value={(activeSimulation.currentQuestionIndex / activeSimulation.questions.length) * 100} className="mt-2" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {activeSimulation.currentQuestionIndex < activeSimulation.questions.length || lastEvaluation ? (
                          <>
                            {lastEvaluation ? (
                              <div className="space-y-4">
                                <div className="p-4 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      activeSimulation.questions[lastEvaluation.questionIndex]?.type === "behavioral" ? "bg-blue-100 text-blue-700" :
                                      activeSimulation.questions[lastEvaluation.questionIndex]?.type === "technical" ? "bg-purple-100 text-purple-700" :
                                      activeSimulation.questions[lastEvaluation.questionIndex]?.type === "situational" ? "bg-orange-100 text-orange-700" :
                                      "bg-green-100 text-green-700"
                                    }`}>
                                      {activeSimulation.questions[lastEvaluation.questionIndex]?.type}
                                    </span>
                                    <span className="text-xs text-muted-foreground">Question {lastEvaluation.questionIndex + 1}</span>
                                  </div>
                                  <p className="font-medium text-lg">{activeSimulation.questions[lastEvaluation.questionIndex]?.question}</p>
                                </div>

                                <div className="text-center">
                                  <div className={`text-3xl font-bold ${lastEvaluation.evaluation.score >= 70 ? "text-green-600" : lastEvaluation.evaluation.score >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                                    {lastEvaluation.evaluation.score}%
                                  </div>
                                  <p className="text-sm text-muted-foreground">Answer Score</p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                  <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                                      <CheckCircle className="size-4" />
                                      Strengths
                                    </h4>
                                    <ul className="text-sm space-y-1">
                                      {lastEvaluation.evaluation.strengths.map((s: string, i: number) => (
                                        <li key={i}>• {s}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2 flex items-center gap-1">
                                      <Lightbulb className="size-4" />
                                      Improvements
                                    </h4>
                                    <ul className="text-sm space-y-1">
                                      {lastEvaluation.evaluation.improvements.map((s: string, i: number) => (
                                        <li key={i}>• {s}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>

                                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                  <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Sample Strong Answer</h4>
                                  <p className="text-sm">{lastEvaluation.evaluation.sampleAnswer}</p>
                                </div>

                                <div className="flex justify-center gap-2">
                                  {activeSimulation.currentQuestionIndex < activeSimulation.questions.length ? (
                                    <Button onClick={handleNextSimulationQuestion} data-testid="button-next-question">
                                      Next Question
                                      <ArrowRight className="size-4 ml-2" />
                                    </Button>
                                  ) : (
                                    <Button onClick={handleCompleteSimulation} disabled={isCompletingSimulation} data-testid="button-complete-simulation">
                                      {isCompletingSimulation ? (
                                        <>
                                          <Loader2 className="size-4 mr-2 animate-spin" />
                                          Generating Results...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="size-4 mr-2" />
                                          Complete Interview
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ) : activeSimulation.currentQuestionIndex < activeSimulation.questions.length ? (
                              <div className="space-y-4">
                                <div className="p-4 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      activeSimulation.questions[activeSimulation.currentQuestionIndex]?.type === "behavioral" ? "bg-blue-100 text-blue-700" :
                                      activeSimulation.questions[activeSimulation.currentQuestionIndex]?.type === "technical" ? "bg-purple-100 text-purple-700" :
                                      activeSimulation.questions[activeSimulation.currentQuestionIndex]?.type === "situational" ? "bg-orange-100 text-orange-700" :
                                      "bg-green-100 text-green-700"
                                    }`}>
                                      {activeSimulation.questions[activeSimulation.currentQuestionIndex]?.type}
                                    </span>
                                    <span className="text-xs text-muted-foreground">Question {activeSimulation.currentQuestionIndex + 1}</span>
                                  </div>
                                  <p className="font-medium text-lg">{activeSimulation.questions[activeSimulation.currentQuestionIndex]?.question}</p>
                                </div>
                                <Textarea
                                  value={simulationAnswer}
                                  onChange={(e) => setSimulationAnswer(e.target.value)}
                                  placeholder="Type your answer here. Be specific and provide examples from your experience..."
                                  className="min-h-[150px]"
                                  data-testid="input-simulation-answer"
                                />
                                <Button 
                                  className="w-full" 
                                  onClick={handleSubmitSimulationAnswer} 
                                  disabled={isSubmittingAnswer || !simulationAnswer.trim()}
                                  data-testid="button-submit-answer"
                                >
                                  {isSubmittingAnswer ? (
                                    <>
                                      <Loader2 className="size-4 mr-2 animate-spin" />
                                      Evaluating Answer...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="size-4 mr-2" />
                                      Submit Answer
                                    </>
                                  )}
                                </Button>
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </CardContent>
                    </Card>
                  )
                ) : (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Brain className="size-5" />
                          Start Mock Interview
                        </CardTitle>
                        <CardDescription>
                          Practice a full interview simulation with AI feedback on each answer
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Difficulty Level</Label>
                          <Select value={simulationDifficulty} onValueChange={(v: SimulationDifficulty) => setSimulationDifficulty(v)}>
                            <SelectTrigger data-testid="select-simulation-difficulty">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="entry">Entry Level (5 questions)</SelectItem>
                              <SelectItem value="mid">Mid Level (7 questions)</SelectItem>
                              <SelectItem value="senior">Senior Level (8 questions)</SelectItem>
                              <SelectItem value="executive">Executive Level (8 questions)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button className="w-full" onClick={handleStartSimulation} disabled={isCreatingSimulation} data-testid="button-start-simulation">
                          {isCreatingSimulation ? (
                            <>
                              <Loader2 className="size-4 mr-2 animate-spin" />
                              Generating Questions...
                            </>
                          ) : (
                            <>
                              <Brain className="size-4 mr-2" />
                              Start Mock Interview
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {simulations.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Mock Interview History</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {simulations.map((sim) => (
                              <div 
                                key={sim.id} 
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" 
                                onClick={() => handleResumeSimulation(sim)}
                                data-testid={`simulation-item-${sim.id}`}
                              >
                                <div className="flex items-center gap-3">
                                  {sim.status === "completed" ? (
                                    <CheckCircle className="size-4 text-green-500" />
                                  ) : (
                                    <Brain className="size-4 text-blue-500" />
                                  )}
                                  <div>
                                    <p className="font-medium text-sm">{sim.difficulty.toUpperCase()} Level Interview</p>
                                    <p className="text-xs text-muted-foreground">
                                      {sim.status === "completed" 
                                        ? `Score: ${sim.overallScore}%` 
                                        : `${sim.currentQuestionIndex}/${sim.questions.length} answered`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {sim.status === "completed" ? (
                                    <div className={`text-sm font-semibold ${(sim.overallScore || 0) >= 70 ? "text-green-600" : (sim.overallScore || 0) >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                                      {sim.overallScore}%
                                    </div>
                                  ) : (
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">In Progress</span>
                                  )}
                                  <ChevronRight className="size-4 text-muted-foreground" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
