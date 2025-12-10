import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronRight, Target, Trophy, Sparkles, FileText, ArrowRight, Clock, Check, X } from "lucide-react";

const statusConfig: Record<ApplicationStatus, { label: string; color: string; bgColor: string }> = {
  created: { label: "Created", color: "text-slate-600", bgColor: "bg-slate-100" },
  applied: { label: "Applied", color: "text-blue-600", bgColor: "bg-blue-100" },
  interviewing: { label: "Interviewing", color: "text-amber-600", bgColor: "bg-amber-100" },
  rejected: { label: "Rejected", color: "text-red-600", bgColor: "bg-red-100" },
  offered: { label: "Offered", color: "text-emerald-600", bgColor: "bg-emerald-100" },
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
  const currentIndex = statusOrder.indexOf(application.status as ApplicationStatus);
  
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate" data-testid={`text-job-title-${application.id}`}>
              {application.jobTitle}
            </h3>
            <p className="text-xs text-muted-foreground truncate" data-testid={`text-company-${application.id}`}>
              {application.company}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
            onClick={onDelete}
            data-testid={`button-delete-${application.id}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        
        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-3 ${config.bgColor} ${config.color}`}>
          {config.label}
        </div>
        
        <div className="flex items-center gap-2">
          <Select 
            value={application.status} 
            onValueChange={(value) => onStatusChange(value as ApplicationStatus)}
          >
            <SelectTrigger className="h-8 text-xs flex-1" data-testid={`select-status-${application.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOrder.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusConfig[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs"
            onClick={onGenerateResume}
            data-testid={`button-generate-resume-${application.id}`}
          >
            <FileText className="size-3 mr-1" />
            Resume
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Clock className="size-3" />
          {new Date(application.createdAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}

function WeeklyChallengeWidget({ 
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
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="size-5 text-primary" />
          Weekly Challenge
        </CardTitle>
      </CardHeader>
      <CardContent>
        {challengeData?.shouldRemind && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
              <Sparkles className="size-4" />
              <span className="text-sm font-medium">New week started! Ready to crush your goals?</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onAcknowledge} data-testid="button-acknowledge-reminder">
              <X className="size-4" />
            </Button>
          </div>
        )}
        
        {!challengeData || showSetGoal ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Set your weekly application goal
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold font-serif">
                {progress} <span className="text-muted-foreground text-lg font-normal">/ {goal}</span>
              </span>
              {isComplete && (
                <div className="flex items-center gap-1 text-emerald-600">
                  <Trophy className="size-5" />
                  <span className="text-sm font-medium">Complete!</span>
                </div>
              )}
            </div>
            <Progress value={percentage} className="h-3" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Applications submitted this week
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={() => setShowSetGoal(true)}
                data-testid="button-change-goal"
              >
                Change Goal
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newApp, setNewApp] = useState({ company: "", jobTitle: "", jobDescription: "" });

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
    }));
    setLocation("/application");
  };

  const groupedApplications = statusOrder.reduce((acc, status) => {
    acc[status] = applications.filter((app) => app.status === status);
    return acc;
  }, {} as Record<ApplicationStatus, TrackedApplication[]>);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your job applications and weekly progress
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-application">
                <Plus className="size-4 mr-2" />
                Add Application
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Application</DialogTitle>
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
                    rows={5}
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
            <FileText className="size-4 mr-2" />
            Generate Resume
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <WeeklyChallengeWidget 
            challengeData={challengeData || null}
            onSetGoal={(goal) => setChallengeMutation.mutate(goal)}
            onAcknowledge={() => acknowledgeMutation.mutate()}
          />
          
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Applications</span>
                <span className="font-semibold" data-testid="text-total-applications">{applications.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Interviewing</span>
                <span className="font-semibold text-amber-600" data-testid="text-interviewing-count">
                  {groupedApplications.interviewing?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Offers</span>
                <span className="font-semibold text-emerald-600" data-testid="text-offers-count">
                  {groupedApplications.offered?.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statusOrder.map((status) => (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium text-sm ${statusConfig[status].color}`}>
                    {statusConfig[status].label}
                  </h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {groupedApplications[status]?.length || 0}
                  </span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {groupedApplications[status]?.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      onStatusChange={(newStatus) => 
                        updateStatusMutation.mutate({ id: app.id, status: newStatus })
                      }
                      onDelete={() => deleteMutation.mutate(app.id)}
                      onGenerateResume={() => handleGenerateResume(app)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
