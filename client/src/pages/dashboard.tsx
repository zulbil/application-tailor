import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { TrackedApplication, ApplicationStatus, ChallengeData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Trash2, Target, Trophy, Sparkles, FileText, Clock, X, 
  Briefcase, Building2, TrendingUp, Calendar, MoreHorizontal, GripVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig: Record<ApplicationStatus, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  created: { label: "Draft", color: "text-slate-700", bgColor: "bg-slate-50", borderColor: "border-slate-200", icon: <FileText className="size-3.5" /> },
  applied: { label: "Applied", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200", icon: <Briefcase className="size-3.5" /> },
  interviewing: { label: "Interviewing", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200", icon: <Calendar className="size-3.5" /> },
  rejected: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200", icon: <X className="size-3.5" /> },
  offered: { label: "Offered", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", icon: <Trophy className="size-3.5" /> },
};

const statusOrder: ApplicationStatus[] = ["created", "applied", "interviewing", "rejected", "offered"];

function ApplicationCard({ 
  application, 
  onStatusChange, 
  onDelete,
  onGenerateResume
}: { 
  application: TrackedApplication; 
  onStatusChange: (status: ApplicationStatus) => void;
  onDelete: () => void;
  onGenerateResume: () => void;
}) {
  const config = statusConfig[application.status as ApplicationStatus] || statusConfig.created;
  
  return (
    <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 border-l-4" style={{ borderLeftColor: `var(--${application.status === 'offered' ? 'emerald' : application.status === 'interviewing' ? 'amber' : application.status === 'applied' ? 'blue' : application.status === 'rejected' ? 'red' : 'slate'}-500)` }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground truncate" data-testid={`text-company-${application.id}`}>
                {application.company}
              </p>
            </div>
            <h3 className="font-semibold text-base leading-tight line-clamp-2" data-testid={`text-job-title-${application.id}`}>
              {application.jobTitle}
            </h3>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="size-8 shrink-0"
                data-testid={`button-menu-${application.id}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onGenerateResume}>
                <FileText className="size-4 mr-2" />
                Generate Resume
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {statusOrder.map((status) => (
                <DropdownMenuItem 
                  key={status} 
                  onClick={() => onStatusChange(status)}
                  className={application.status === status ? "bg-accent" : ""}
                >
                  {statusConfig[status].icon}
                  <span className="ml-2">Move to {statusConfig[status].label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete} 
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <Badge variant="secondary" className={`${config.bgColor} ${config.color} border ${config.borderColor} gap-1`}>
            {config.icon}
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            {new Date(application.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyChallengeCard({ 
  challengeData, 
  onSetGoal,
  onAcknowledge
}: { 
  challengeData: ChallengeData | null;
  onSetGoal: (goal: number) => void;
  onAcknowledge: () => void;
}) {
  const [goalInput, setGoalInput] = useState("");
  const [showSetGoal, setShowSetGoal] = useState(false);
  
  const progress = challengeData?.progress || 0;
  const goal = challengeData?.challenge?.goalCount || 0;
  const percentage = goal > 0 ? Math.min((progress / goal) * 100, 100) : 0;
  const isComplete = progress >= goal && goal > 0;

  const handleSetGoal = () => {
    const numGoal = parseInt(goalInput);
    if (numGoal > 0 && numGoal <= 100) {
      onSetGoal(numGoal);
      setShowSetGoal(false);
      setGoalInput("");
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="size-4 text-primary" />
          </div>
          Weekly Challenge
        </CardTitle>
      </CardHeader>
      <CardContent>
        {challengeData?.shouldRemind && (
          <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
              <Sparkles className="size-4" />
              <span className="text-sm font-medium">New week! Ready to apply?</span>
            </div>
            <Button variant="ghost" size="icon" className="size-7" onClick={onAcknowledge} data-testid="button-acknowledge-reminder">
              <X className="size-4" />
            </Button>
          </div>
        )}
        
        {!challengeData?.challenge || showSetGoal ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              How many applications this week?
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="e.g., 10"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="flex-1"
                min="1"
                max="100"
                data-testid="input-goal-count"
              />
              <Button onClick={handleSetGoal} data-testid="button-set-goal">
                Set Goal
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-bold font-serif text-primary">{progress}</span>
                <span className="text-lg text-muted-foreground ml-1">/ {goal}</span>
              </div>
              {isComplete && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
                  <Trophy className="size-4" />
                  <span className="text-sm font-semibold">Done!</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Progress value={percentage} className="h-2.5" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{Math.round(percentage)}% complete</span>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-xs h-auto p-0"
                  onClick={() => setShowSetGoal(true)}
                  data-testid="button-change-goal"
                >
                  Change goal
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatsCard({ title, value, icon, trend }: { title: string; value: number; icon: React.ReactNode; trend?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          {trend && (
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <TrendingUp className="size-3 mr-1" />
              {trend}
            </Badge>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold font-serif">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({ 
  status, 
  applications, 
  onStatusChange, 
  onDelete, 
  onGenerateResume 
}: { 
  status: ApplicationStatus;
  applications: TrackedApplication[];
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
  onGenerateResume: (app: TrackedApplication) => void;
}) {
  const config = statusConfig[status];
  
  return (
    <div className="flex-1 min-w-0">
      <div className={`rounded-xl ${config.bgColor} border ${config.borderColor} p-2 sm:p-3 h-full`}>
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5">
            <span className={`${config.color} hidden sm:block`}>{config.icon}</span>
            <h3 className={`font-semibold text-xs sm:text-sm ${config.color} truncate`}>
              {config.label}
            </h3>
          </div>
          <Badge variant="outline" className={`${config.color} border-current/30 text-xs h-5 px-1.5`}>
            {applications.length}
          </Badge>
        </div>
        <div className="space-y-2 sm:space-y-3 min-h-[100px] max-h-[400px] overflow-y-auto">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onStatusChange={(newStatus) => onStatusChange(app.id, newStatus)}
              onDelete={() => onDelete(app.id)}
              onGenerateResume={() => onGenerateResume(app)}
            />
          ))}
          {applications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className={`size-8 rounded-full ${config.bgColor} border ${config.borderColor} flex items-center justify-center mb-1.5`}>
                {config.icon}
              </div>
              <p className="text-xs text-muted-foreground">Empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newApp, setNewApp] = useState({ company: "", jobTitle: "", jobDescription: "" });
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: api.getApplications,
  });

  const { data: challengeData } = useQuery({
    queryKey: ["challenge"],
    queryFn: api.getChallenge,
  });

  const createMutation = useMutation({
    mutationFn: api.createApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["challenge"] });
      setIsAddOpen(false);
      setNewApp({ company: "", jobTitle: "", jobDescription: "" });
      toast({ title: "Application added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) => 
      api.updateApplicationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["challenge"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["challenge"] });
      toast({ title: "Application deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const setChallengeMutation = useMutation({
    mutationFn: api.createChallenge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge"] });
      toast({ title: "Weekly goal set!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: () => api.acknowledgeReminder(challengeData!.challenge.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge"] });
    },
  });

  const handleAddApplication = () => {
    if (!newApp.company.trim() || !newApp.jobTitle.trim()) {
      toast({ title: "Please fill in company and job title", variant: "destructive" });
      return;
    }
    createMutation.mutate(newApp);
  };

  const handleGenerateResume = (app: TrackedApplication) => {
    sessionStorage.setItem("prefillApplication", JSON.stringify({
      company: app.company,
      jobTitle: app.jobTitle,
      jobDescription: app.jobDescription,
      applicationId: app.id,
    }));
    setLocation("/application");
  };

  const groupedApplications = statusOrder.reduce((acc, status) => {
    acc[status] = applications.filter((app) => app.status === status);
    return acc;
  }, {} as Record<ApplicationStatus, TrackedApplication[]>);

  const filteredApplications = activeTab === "all" 
    ? applications 
    : applications.filter(app => app.status === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage your job applications
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-initial" data-testid="button-add-application">
                <Plus className="size-4 mr-2" />
                Add Application
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif">New Application</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={newApp.company}
                    onChange={(e) => setNewApp({ ...newApp, company: e.target.value })}
                    placeholder="e.g., Google"
                    data-testid="input-new-company"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={newApp.jobTitle}
                    onChange={(e) => setNewApp({ ...newApp, jobTitle: e.target.value })}
                    placeholder="e.g., Senior Frontend Developer"
                    data-testid="input-new-job-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobDescription">Job Description (optional)</Label>
                  <Textarea
                    id="jobDescription"
                    value={newApp.jobDescription}
                    onChange={(e) => setNewApp({ ...newApp, jobDescription: e.target.value })}
                    placeholder="Paste the job description here..."
                    rows={4}
                    data-testid="input-new-job-description"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAddApplication}
                  disabled={createMutation.isPending}
                  data-testid="button-submit-application"
                >
                  {createMutation.isPending ? "Adding..." : "Add Application"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={() => setLocation("/application")} data-testid="button-generate-resume">
            <Sparkles className="size-4 mr-2" />
            <span className="hidden sm:inline">Generate</span> Resume
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard 
          title="Total Applications" 
          value={applications.length} 
          icon={<Briefcase className="size-5" />}
        />
        <StatsCard 
          title="Applied" 
          value={groupedApplications.applied?.length || 0} 
          icon={<FileText className="size-5" />}
        />
        <StatsCard 
          title="Interviewing" 
          value={groupedApplications.interviewing?.length || 0} 
          icon={<Calendar className="size-5" />}
        />
        <StatsCard 
          title="Offers" 
          value={groupedApplications.offered?.length || 0} 
          icon={<Trophy className="size-5" />}
          trend={groupedApplications.offered?.length ? "+1" : undefined}
        />
      </div>

      {/* Weekly Challenge Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <WeeklyChallengeCard 
          challengeData={challengeData || null}
          onSetGoal={(goal) => setChallengeMutation.mutate(goal)}
          onAcknowledge={() => acknowledgeMutation.mutate()}
        />
      </div>

      {/* Kanban Board - Full Width */}
      <div>
        {/* Mobile: Tabbed View */}
        <div className="block md:hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <ScrollArea className="w-full">
              <TabsList className="w-full justify-start mb-4">
                <TabsTrigger value="all" className="text-xs">
                  All ({applications.length})
                </TabsTrigger>
                {statusOrder.map((status) => (
                  <TabsTrigger key={status} value={status} className="text-xs">
                    {statusConfig[status].label} ({groupedApplications[status]?.length || 0})
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            
            <TabsContent value="all" className="mt-0 space-y-3">
              {applications.length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="size-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">No applications yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Add your first job application to get started</p>
                  <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="size-4 mr-2" />
                    Add Application
                  </Button>
                </Card>
              ) : (
                applications.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    onStatusChange={(newStatus) => updateStatusMutation.mutate({ id: app.id, status: newStatus })}
                    onDelete={() => deleteMutation.mutate(app.id)}
                    onGenerateResume={() => handleGenerateResume(app)}
                  />
                ))
              )}
            </TabsContent>
            
            {statusOrder.map((status) => (
              <TabsContent key={status} value={status} className="mt-0 space-y-3">
                {groupedApplications[status]?.length === 0 ? (
                  <Card className="p-8 text-center">
                    <div className={`size-12 rounded-full ${statusConfig[status].bgColor} flex items-center justify-center mx-auto mb-3`}>
                      {statusConfig[status].icon}
                    </div>
                    <p className="text-sm text-muted-foreground">No {statusConfig[status].label.toLowerCase()} applications</p>
                  </Card>
                ) : (
                  groupedApplications[status]?.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      onStatusChange={(newStatus) => updateStatusMutation.mutate({ id: app.id, status: newStatus })}
                      onDelete={() => deleteMutation.mutate(app.id)}
                      onGenerateResume={() => handleGenerateResume(app)}
                    />
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Desktop: Kanban Columns - All 5 in One Row */}
        <div className="hidden md:block">
          <div className="grid grid-cols-5 gap-3">
            {statusOrder.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                applications={groupedApplications[status] || []}
                onStatusChange={(id, newStatus) => updateStatusMutation.mutate({ id, status: newStatus })}
                onDelete={(id) => deleteMutation.mutate(id)}
                onGenerateResume={handleGenerateResume}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
