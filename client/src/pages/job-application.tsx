import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Wand2, Copy, FileText, FileUser, Download, Palette, Settings2, FileDown, GripVertical, Pencil, Save, X, Check, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { JobApplicationInput, GeneratedResume, GeneratedCoverLetter, Profile, ResumeSettings, ResumeTemplatesResponse } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
        {id === "summary" ? (
          <span className="text-sm text-muted-foreground italic">Career Highlights (no title)</span>
        ) : isEditingTitle ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border rounded"
              placeholder={`Section title for ${id}`}
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
            <span className="text-sm font-medium">{pref.title || defaultSectionLabels[id] || id}</span>
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
  primaryColor: "#0f766e",
  fontFamily: "Inter",
  fontSize: "medium",
  sectionOrder: ["summary", "skills", "experience", "education"],
  sectionPreferences: defaultSectionPreferences
};

export default function JobApplicationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const savedApplicationRef = useRef<string | null>(null);
  
  const [resume, setResume] = useState<GeneratedResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<GeneratedCoverLetter | null>(null);
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
    
    const prefill = sessionStorage.getItem("prefillApplication");
    if (prefill) {
      try {
        const data = JSON.parse(prefill);
        if (data.company) form.setValue("companyName", data.company);
        if (data.jobTitle) form.setValue("jobTitle", data.jobTitle);
        if (data.jobDescription) form.setValue("jobDescription", data.jobDescription);
        if (data.applicationId) {
          savedApplicationRef.current = data.applicationId;
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
          }).catch(() => {});
        }
        sessionStorage.removeItem("prefillApplication");
      } catch (e) {}
    }
  }, []);

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
      setEditedExperiences([...resume.experiences]);
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
    const updated = [...editedExperiences];
    (updated[index] as any)[field] = value;
    setEditedExperiences(updated);
  };

  const updateExperienceBullet = (expIndex: number, bulletIndex: number, value: string) => {
    const updated = [...editedExperiences];
    updated[expIndex].bullets[bulletIndex] = value;
    setEditedExperiences(updated);
  };

  const addExperienceBullet = (expIndex: number) => {
    const updated = [...editedExperiences];
    updated[expIndex].bullets.push("");
    setEditedExperiences(updated);
  };

  const removeExperienceBullet = (expIndex: number, bulletIndex: number) => {
    const updated = [...editedExperiences];
    updated[expIndex].bullets.splice(bulletIndex, 1);
    setEditedExperiences(updated);
  };

  const removeExperience = (index: number) => {
    const updated = [...editedExperiences];
    updated.splice(index, 1);
    setEditedExperiences(updated);
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
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["challenge"] });
    } catch (e) {
      console.error("Failed to save application:", e);
    }
  };

  const handleGenerateBoth = async (data: JobApplicationInput) => {
    if (!profile) {
      toast({ title: "Profile Required", description: "Please save your profile first.", variant: "destructive" });
      return;
    }
    
    setIsGeneratingResume(true);
    setIsGeneratingCoverLetter(true);
    
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
        queryClient.invalidateQueries({ queryKey: ["applications"] });
        queryClient.invalidateQueries({ queryKey: ["challenge"] });
      }
      
      const result = await api.generateForApplication(applicationId, data.tone, {
        jobDescription: data.jobDescription,
        jobTitle: data.jobTitle,
        company: data.companyName
      });
      
      if (!result.resume.logline || !result.resume.experiences) {
        throw new Error("Invalid response from AI. Please try again.");
      }
      
      setResume(result.resume);
      setCoverLetter({ coverLetter: result.coverLetter });
      
      toast({ title: "Generated!", description: "Your tailored resume and cover letter are ready and saved." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to generate materials.", variant: "destructive" });
    } finally {
      setIsGeneratingResume(false);
      setIsGeneratingCoverLetter(false);
    }
  };

  const handleGenerateResume = async (data: JobApplicationInput) => {
    await handleGenerateBoth(data);
  };

  const handleGenerateCoverLetter = async (data: JobApplicationInput) => {
    await handleGenerateBoth(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Text copied to clipboard." });
  };

  const downloadResume = () => {
    if (!resume || !profile) return;
    
    const companyName = form.getValues("companyName") || "Company";
    const jobTitle = form.getValues("jobTitle") || "Position";
    
    let content = `${profile.firstName} ${profile.lastName}\n`;
    content += `${profile.email} | ${profile.phone} | ${profile.location}\n\n`;
    content += `=== SUMMARY ===\n`;
    content += (resume.logline || []).map(line => `• ${line}`).join("\n") + "\n\n";
    content += `=== SKILLS ===\n`;
    content += `${resume.technologies || ""}\n\n`;
    if (resume.relevantSkills && resume.relevantSkills.length > 0) {
      content += `Key Skills: ${resume.relevantSkills.join(", ")}\n\n`;
    }
    content += `=== EXPERIENCE ===\n`;
    (resume.experiences || []).forEach(exp => {
      content += `\n${exp.title}\n`;
      content += `${exp.company} | ${exp.location} | ${exp.start} - ${exp.end}\n`;
      (exp.bullets || []).forEach(bullet => {
        content += `  • ${bullet}\n`;
      });
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

  if (!profile) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="grid gap-8 lg:grid-cols-12 animate-in fade-in duration-500">
      
      {/* Input Section */}
      <div className="lg:col-span-5 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif font-bold">New Application</h1>
          <p className="text-muted-foreground">Paste the job description and let AI tailor your application.</p>
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
            
            <div className="grid grid-cols-2 gap-4">
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

            <div className="flex gap-3 pt-2">
              <Button 
                className="flex-1"
                onClick={form.handleSubmit(handleGenerateResume)}
                disabled={isGeneratingResume}
              >
                {isGeneratingResume ? <Loader2 className="size-4 mr-2 animate-spin" /> : <FileText className="size-4 mr-2" />}
                Resume
              </Button>
              <Button 
                className="flex-1" 
                variant="secondary"
                onClick={form.handleSubmit(handleGenerateCoverLetter)}
                disabled={isGeneratingCoverLetter}
              >
                {isGeneratingCoverLetter ? <Loader2 className="size-4 mr-2 animate-spin" /> : <FileUser className="size-4 mr-2" />}
                Cover Letter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      <div className="lg:col-span-7 space-y-8">
        <Tabs defaultValue="resume" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resume">Tailored Resume</TabsTrigger>
            <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
          </TabsList>

          <TabsContent value="resume" className="space-y-4 mt-4">
            {!resume || !resume.logline ? (
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
                <Wand2 className="size-12 mb-4 opacity-20" />
                <p>Fill out the job details and click Generate Resume</p>
              </div>
            ) : (
              <div className="space-y-6">
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
                        <Button variant="outline" size="sm" onClick={downloadCoverLetter} data-testid="button-download-cover-letter">
                          <Download className="size-4 mr-2" />
                          Download
                        </Button>
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
        </Tabs>
      </div>
    </div>
  );
}
