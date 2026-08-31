import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { TrackedApplication, ApplicationStatus, ChallengeData } from "@/lib/types";
import { OnboardingDialog } from "@/components/onboarding-dialog";
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
  Briefcase, Building2, TrendingUp, Calendar, MoreHorizontal, BarChart3, GraduationCap, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, Filter, Search
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, differenceInDays, startOfDay } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
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
  onGenerateResume,
  readinessScore
}: { 
  application: TrackedApplication; 
  onStatusChange: (status: ApplicationStatus) => void;
  onDelete: () => void;
  onGenerateResume: () => void;
  readinessScore?: number;
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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`${config.bgColor} ${config.color} border ${config.borderColor} gap-1`}>
              {config.icon}
              {config.label}
            </Badge>
            {readinessScore !== undefined && readinessScore > 0 && (
              <Badge variant="outline" className={`gap-1 ${readinessScore >= 70 ? "border-green-300 text-green-700 bg-green-50" : readinessScore >= 40 ? "border-yellow-300 text-yellow-700 bg-yellow-50" : "border-gray-300 text-gray-700"}`} data-testid={`badge-readiness-${application.id}`}>
                <GraduationCap className="size-3" />
                {readinessScore}%
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            {new Date(application.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function InterviewAlertsCard({ 
  applications,
  readinessScores,
  onOpenApplication
}: { 
  applications: TrackedApplication[];
  readinessScores: Record<string, number>;
  onOpenApplication: (app: TrackedApplication) => void;
}) {
  const today = startOfDay(new Date());
  const upcomingInterviews = applications
    .filter(app => app.interviewDate)
    .map(app => {
      const interviewDay = startOfDay(new Date(app.interviewDate!));
      return {
        ...app,
        date: interviewDay,
        daysLeft: differenceInDays(interviewDay, today),
        readiness: readinessScores[app.id] || 0
      };
    })
    .filter(app => app.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  if (upcomingInterviews.length === 0) return null;

  const getReadinessStatus = (readiness: number, daysLeft: number) => {
    if (readiness >= 70) return { label: "Ready", color: "text-green-600", bgColor: "bg-green-50", icon: <CheckCircle2 className="size-4" /> };
    if (readiness >= 40) return { label: "Preparing", color: "text-yellow-600", bgColor: "bg-yellow-50", icon: <AlertCircle className="size-4" /> };
    if (daysLeft <= 3) return { label: "Needs Training", color: "text-red-600", bgColor: "bg-red-50", icon: <AlertCircle className="size-4" /> };
    return { label: "Not Started", color: "text-gray-600", bgColor: "bg-gray-50", icon: <AlertCircle className="size-4" /> };
  };

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Calendar className="size-4 text-amber-600" />
          </div>
          Upcoming Interviews
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingInterviews.map(app => {
          const status = getReadinessStatus(app.readiness, app.daysLeft);
          return (
            <div 
              key={app.id} 
              className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onOpenApplication(app)}
              data-testid={`interview-alert-${app.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{app.jobTitle}</p>
                  <p className="text-xs text-muted-foreground truncate">{app.company}</p>
                </div>
                <Badge 
                  variant="outline" 
                  className={`shrink-0 ${app.daysLeft <= 2 ? "border-red-300 bg-red-50 text-red-700" : app.daysLeft <= 7 ? "border-amber-300 bg-amber-50 text-amber-700" : "border-blue-300 bg-blue-50 text-blue-700"}`}
                >
                  {app.daysLeft === 0 ? "Today!" : app.daysLeft === 1 ? "Tomorrow" : `${app.daysLeft} days`}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
                <div className="flex items-center gap-1.5">
                  <span className={status.color}>{status.icon}</span>
                  <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                  {app.readiness > 0 && (
                    <span className="text-xs text-muted-foreground">({app.readiness}%)</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(app.date, "MMM d, yyyy")}
                </span>
              </div>
            </div>
          );
        })}
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

const rangeOptions = [
  { value: "last_7_days", label: "7 Days" },
  { value: "last_2_weeks", label: "2 Weeks" },
  { value: "last_month", label: "Month" },
  { value: "last_year", label: "Year" },
];

function ApplicationsChartCard() {
  const [range, setRange] = useState("last_7_days");
  
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics", range],
    queryFn: () => api.getApplicationAnalytics(range),
  });

  const chartData = analytics?.labels.map((label, i) => ({
    name: label,
    applications: analytics.counts[i],
  })) || [];

  return (
    <Card className="md:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="size-4 text-primary" />
            </div>
            Applications Over Time
          </CardTitle>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[100px] h-8 text-xs" data-testid="select-chart-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Loading...
          </div>
        ) : chartData.length === 0 || analytics?.total === 0 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-center">
            <BarChart3 className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No applications in this period</p>
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  interval={range === 'last_year' ? 1 : range === 'last_month' ? 4 : 'preserveStartEnd'}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="applications" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#colorApplications)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {analytics && analytics.total > 0 && (
          <div className="mt-2 pt-2 border-t text-center">
            <span className="text-2xl font-bold font-serif text-primary">{analytics.total}</span>
            <span className="text-sm text-muted-foreground ml-2">applications in this period</span>
          </div>
        )}
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
  
  // Table filters and pagination state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: api.getApplications,
  });

  const [readinessScores, setReadinessScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchReadinessScores = async () => {
      const scores: Record<string, number> = {};
      for (const app of applications) {
        try {
          const response = await fetch(`/api/applications/${app.id}/readiness`, { credentials: "include" });
          if (response.ok) {
            const data = await response.json();
            if (data.readinessScore > 0) {
              scores[app.id] = data.readinessScore;
            }
          }
        } catch (e) {}
      }
      setReadinessScores(scores);
    };
    if (applications.length > 0) fetchReadinessScores();
  }, [applications]);

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
    if (app.slug) {
      setLocation(`/application/${app.slug}`);
    } else {
      // Fallback for applications without slugs
      sessionStorage.setItem("prefillApplication", JSON.stringify({
        company: app.company,
        jobTitle: app.jobTitle,
        jobDescription: app.jobDescription,
        applicationId: app.id,
      }));
      setLocation("/application");
    }
  };

  const groupedApplications = statusOrder.reduce((acc, status) => {
    acc[status] = applications.filter((app) => app.status === status);
    return acc;
  }, {} as Record<ApplicationStatus, TrackedApplication[]>);

  // Get unique companies and specialties for filter dropdowns
  const uniqueCompanies = Array.from(new Set(applications.map(app => app.company).filter(Boolean))).sort();
  const uniqueSpecialties = Array.from(new Set(applications.map(app => app.jobTitle).filter(Boolean))).sort();

  // Apply filters
  const tableFilteredApplications = applications.filter(app => {
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    const matchesCompany = companyFilter === "all" || app.company === companyFilter;
    const matchesSpecialty = specialtyFilter === "all" || app.jobTitle === specialtyFilter;
    const matchesSearch = !searchQuery || 
      app.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCompany && matchesSpecialty && matchesSearch;
  });

  // Pagination calculations
  const totalPages = Math.ceil(tableFilteredApplications.length / pageSize);
  const paginatedApplications = tableFilteredApplications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, companyFilter, specialtyFilter, searchQuery]);

  const filteredApplications = activeTab === "all" 
    ? applications 
    : applications.filter(app => app.status === activeTab);

  return (
    <div className="space-y-6">
      <OnboardingDialog />
      
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

      {/* Interview Alerts */}
      <InterviewAlertsCard 
        applications={applications}
        readinessScores={readinessScores}
        onOpenApplication={handleGenerateResume}
      />

      {/* Weekly Challenge & Chart Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WeeklyChallengeCard 
          challengeData={challengeData || null}
          onSetGoal={(goal) => setChallengeMutation.mutate(goal)}
          onAcknowledge={() => acknowledgeMutation.mutate()}
        />
        <ApplicationsChartCard />
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="size-5" />
              Applications
            </CardTitle>
            
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-applications"
                />
              </div>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-status-filter">
                  <Filter className="size-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="created">Draft</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="interviewing">Interviewing</SelectItem>
                  <SelectItem value="offered">Offered</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Company Filter */}
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-company-filter">
                  <Building2 className="size-4 mr-2" />
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {uniqueCompanies.map((company) => (
                    <SelectItem key={company} value={company}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Specialty Filter */}
              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-specialty-filter">
                  <Briefcase className="size-4 mr-2" />
                  <SelectValue placeholder="Specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  {uniqueSpecialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {applications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Briefcase className="size-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">No applications yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Add your first job application to get started</p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="size-4 mr-2" />
                Add Application
              </Button>
            </div>
          ) : tableFilteredApplications.length === 0 ? (
            <div className="p-8 text-center">
              <Filter className="size-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No applications match your filters</p>
              <Button variant="link" onClick={() => {
                setStatusFilter("all");
                setCompanyFilter("all");
                setSpecialtyFilter("all");
                setSearchQuery("");
              }}>
                Clear all filters
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedApplications.map((app) => {
                      const config = statusConfig[app.status as ApplicationStatus] || statusConfig.created;
                      return (
                        <TableRow key={app.id} data-testid={`row-application-${app.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="size-4 text-muted-foreground" />
                              {app.company}
                            </div>
                          </TableCell>
                          <TableCell>{app.jobTitle}</TableCell>
                          <TableCell>
                            <Badge className={`${config.bgColor} ${config.color} border ${config.borderColor}`}>
                              {config.icon}
                              <span className="ml-1">{config.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {app.createdAt ? format(new Date(app.createdAt), "MMM d, yyyy") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8" data-testid={`button-menu-${app.id}`}>
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleGenerateResume(app)}>
                                  <FileText className="size-4 mr-2" />
                                  Generate Resume
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {statusOrder.map((status) => (
                                  <DropdownMenuItem 
                                    key={status} 
                                    onClick={() => updateStatusMutation.mutate({ id: app.id, status })}
                                    className={app.status === status ? "bg-accent" : ""}
                                  >
                                    {statusConfig[status].icon}
                                    <span className="ml-2">Move to {statusConfig[status].label}</span>
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => deleteMutation.mutate(app.id)} 
                                  className="text-destructive"
                                >
                                  <Trash2 className="size-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {paginatedApplications.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    onStatusChange={(newStatus) => updateStatusMutation.mutate({ id: app.id, status: newStatus })}
                    onDelete={() => deleteMutation.mutate(app.id)}
                    onGenerateResume={() => handleGenerateResume(app)}
                    readinessScore={readinessScores[app.id]}
                  />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, tableFilteredApplications.length)} of {tableFilteredApplications.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="w-[80px]" data-testid="select-page-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <span className="text-sm px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        data-testid="button-next-page"
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
