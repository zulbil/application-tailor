import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LinkedinAnalysisResult, LinkedinAnalysisRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Linkedin, Target, TrendingUp, Lightbulb, 
  CheckCircle2, AlertCircle, User, FileText, Briefcase, 
  Sparkles, Search, Clock, History
} from "lucide-react";

function ScoreGauge({ score, label, size = "md" }: { score: number; label: string; size?: "sm" | "md" | "lg" }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-600";
    if (s >= 60) return "text-amber-600";
    return "text-red-600";
  };
  
  const getProgressColor = (s: number) => {
    if (s >= 80) return "bg-emerald-500";
    if (s >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl"
  };

  return (
    <div className="text-center space-y-2">
      <div className={`font-bold ${sizeClasses[size]} ${getScoreColor(score)}`} data-testid={`score-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        {score}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${getProgressColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function CategoryCard({ 
  icon: Icon, 
  title, 
  score, 
  feedback, 
  suggestions 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  score: number;
  feedback: string;
  suggestions: string[];
}) {
  const getScoreBadge = (s: number) => {
    if (s >= 80) return { label: "Excellent", variant: "default" as const, color: "bg-emerald-500" };
    if (s >= 60) return { label: "Good", variant: "secondary" as const, color: "bg-amber-500" };
    return { label: "Needs Work", variant: "destructive" as const, color: "bg-red-500" };
  };
  
  const badge = getScoreBadge(score);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="size-5 text-primary" />
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Badge className={`${badge.color} text-white`}>{score}/100</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{feedback}</p>
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <Lightbulb className="size-4 text-amber-500" />
              Suggestions
            </p>
            <ul className="space-y-1">
              {suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisResults({ result }: { result: LinkedinAnalysisResult }) {
  const categories = [
    { key: 'headline', icon: Target, title: 'Headline', data: result.categories.headline },
    { key: 'about', icon: FileText, title: 'Summary/About', data: result.categories.about },
    { key: 'experience', icon: Briefcase, title: 'Experience Impact', data: result.categories.experience },
    { key: 'skills', icon: Sparkles, title: 'Skills', data: result.categories.skills },
    { key: 'completeness', icon: User, title: 'Profile Completeness', data: result.categories.completeness },
    { key: 'searchability', icon: Search, title: 'Recruiter Searchability', data: result.categories.searchability },
  ];

  return (
    <div className="space-y-8">
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <ScoreGauge score={result.overallScore} label="Overall Score" size="lg" />
            </div>
            <div className="flex-1 space-y-4">
              {result.topStrengths.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Key Strengths</h3>
                  <ul className="space-y-1">
                    {result.topStrengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.key}
            icon={cat.icon}
            title={cat.title}
            score={cat.data.score}
            feedback={cat.data.feedback}
            suggestions={cat.data.suggestions}
          />
        ))}
      </div>

      {result.prioritizedActions && result.prioritizedActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              Top Priority Actions
            </CardTitle>
            <CardDescription>
              Focus on these items first for maximum impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {result.prioritizedActions.map((action: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="size-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-sm">{action}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PastAnalyses({ analyses }: { analyses: LinkedinAnalysisRecord[] }) {
  if (analyses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="size-12 mx-auto mb-4 opacity-50" />
        <p>No previous analyses yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <Accordion type="single" collapsible className="space-y-4">
        {analyses.map((analysis) => (
          <AccordionItem key={analysis.id} value={analysis.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-4 text-left">
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{analysis.overallScore}</span>
                </div>
                <div>
                  <p className="font-medium">Score: {analysis.overallScore}/100</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(analysis.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <AnalysisResults result={analysis.analysis} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </ScrollArea>
  );
}

export default function LinkedInOptimizerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    headline: "",
    about: "",
    experienceText: "",
    skillsText: ""
  });
  
  const [latestResult, setLatestResult] = useState<LinkedinAnalysisResult | null>(null);

  const { data: analyses = [], isLoading: loadingHistory } = useQuery<LinkedinAnalysisRecord[]>({
    queryKey: ["/api/linkedin/analyses"],
    queryFn: () => api.getLinkedinAnalyses(),
  });

  const { data: latestAnalysis } = useQuery<LinkedinAnalysisRecord | null>({
    queryKey: ["/api/linkedin/latest"],
    queryFn: () => api.getLatestLinkedinAnalysis(),
  });

  const analyzeMutation = useMutation({
    mutationFn: (data: typeof formData) => api.analyzeLinkedinProfile(data),
    onSuccess: (result: LinkedinAnalysisResult) => {
      setLatestResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/analyses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/latest"] });
      toast({
        title: "Analysis Complete",
        description: `Your LinkedIn profile scored ${result.overallScore}/100`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze profile",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!formData.headline.trim() && !formData.about.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter at least your headline or about section",
        variant: "destructive",
      });
      return;
    }
    analyzeMutation.mutate(formData);
  };

  const displayResult = latestResult || (latestAnalysis?.analysis as LinkedinAnalysisResult | undefined);

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center gap-4">
        <div className="size-14 rounded-xl bg-[#0077B5]/10 flex items-center justify-center">
          <Linkedin className="size-7 text-[#0077B5]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">LinkedIn Profile Optimizer</h1>
          <p className="text-muted-foreground">
            Get AI-powered insights to improve your LinkedIn profile
          </p>
        </div>
      </div>

      <Tabs defaultValue="analyze" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analyze" data-testid="tab-analyze">
            <Sparkles className="size-4 mr-2" />
            Analyze Profile
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <History className="size-4 mr-2" />
            History ({analyses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Paste your LinkedIn profile sections below for analysis. 
                The AI will rate each section and provide actionable improvements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Textarea
                    id="headline"
                    placeholder="e.g., Senior Software Engineer | Building products that matter"
                    value={formData.headline}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                    className="min-h-[100px]"
                    data-testid="input-headline"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="skills">Skills (comma-separated)</Label>
                  <Textarea
                    id="skills"
                    placeholder="e.g., JavaScript, React, Node.js, AWS, Team Leadership"
                    value={formData.skillsText}
                    onChange={(e) => setFormData({ ...formData, skillsText: e.target.value })}
                    className="min-h-[100px]"
                    data-testid="input-skills"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="about">About/Summary</Label>
                <Textarea
                  id="about"
                  placeholder="Paste your LinkedIn About section here..."
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  className="min-h-[150px]"
                  data-testid="input-about"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Experience (paste your job descriptions)</Label>
                <Textarea
                  id="experience"
                  placeholder="Paste your work experience bullet points here. Include role titles, companies, and achievements..."
                  value={formData.experienceText}
                  onChange={(e) => setFormData({ ...formData, experienceText: e.target.value })}
                  className="min-h-[200px]"
                  data-testid="input-experience"
                />
              </div>

              <Button 
                onClick={handleAnalyze} 
                disabled={analyzeMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-analyze"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Analyzing Profile...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" />
                    Analyze My Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {displayResult && (
            <AnalysisResults result={displayResult} />
          )}
        </TabsContent>

        <TabsContent value="history">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : (
            <PastAnalyses analyses={analyses} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
