import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DifficultyLevel, TrainingQuestion, SkillTrainingRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, GraduationCap, Lightbulb, ChevronLeft, ChevronRight, 
  CheckCircle2, BookOpen, Award, XCircle, Trophy,
  Zap, Brain, Target, Send, RotateCcw
} from "lucide-react";

const difficultyConfig: Record<DifficultyLevel, { label: string; color: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  beginner: { 
    label: "Beginner", 
    color: "bg-emerald-500", 
    icon: BookOpen,
    description: "Foundational concepts and basic syntax"
  },
  intermediate: { 
    label: "Intermediate", 
    color: "bg-amber-500", 
    icon: Zap,
    description: "Practical patterns and best practices"
  },
  senior: { 
    label: "Senior", 
    color: "bg-red-500", 
    icon: Brain,
    description: "Advanced architecture and edge cases"
  },
};

type AnswerResult = "correct" | "incorrect" | null;

interface QuestionState {
  userAnswer: string;
  submitted: boolean;
  result: AnswerResult;
}

function QuestionCard({ 
  question, 
  index, 
  total,
  questionState,
  onAnswerChange,
  onSubmit,
  onMarkResult,
  onNext,
  onPrev,
  canGoNext,
  canGoPrev
}: { 
  question: TrainingQuestion;
  index: number;
  total: number;
  questionState: QuestionState;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  onMarkResult: (result: AnswerResult) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}) {
  return (
    <Card className="min-h-[500px] flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="text-xs">
            Question {index + 1} of {total}
          </Badge>
          <Progress value={(index + 1) / total * 100} className="w-32 h-2" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 border">
            <h3 className="text-lg font-medium leading-relaxed" data-testid={`question-text-${index}`}>
              {question.question}
            </h3>
          </div>

          {!questionState.submitted ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Answer</label>
                <Textarea
                  placeholder="Type your answer here..."
                  value={questionState.userAnswer}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  className="min-h-[120px] resize-none"
                  data-testid={`input-answer-${index}`}
                />
              </div>
              <Button 
                size="lg" 
                onClick={onSubmit}
                disabled={!questionState.userAnswer.trim()}
                className="gap-2 w-full"
                data-testid={`button-submit-answer-${index}`}
              >
                <Send className="h-4 w-4" />
                Submit Answer
              </Button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-4 border">
                <p className="font-medium text-sm text-muted-foreground mb-1">Your Answer</p>
                <p className="text-sm">{questionState.userAnswer}</p>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-800 dark:text-emerald-200 mb-1">Correct Answer</p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300" data-testid={`answer-text-${index}`}>
                      {question.answer}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Explanation</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300" data-testid={`explanation-text-${index}`}>
                      {question.explanation}
                    </p>
                  </div>
                </div>
              </div>

              {questionState.result === null && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-center text-muted-foreground">How did you do?</p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      variant="outline"
                      className="gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                      onClick={() => onMarkResult("correct")}
                      data-testid={`button-mark-correct-${index}`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      I Got It Right
                    </Button>
                    <Button 
                      variant="outline"
                      className="gap-2 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => onMarkResult("incorrect")}
                      data-testid={`button-mark-incorrect-${index}`}
                    >
                      <XCircle className="h-4 w-4" />
                      I Got It Wrong
                    </Button>
                  </div>
                </div>
              )}

              {questionState.result && (
                <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
                  questionState.result === "correct" 
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" 
                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                }`}>
                  {questionState.result === "correct" ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Marked as Correct</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">Marked as Incorrect</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={!canGoPrev}
            className="gap-2"
            data-testid="button-prev-question"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <Button
            onClick={onNext}
            disabled={!canGoNext}
            className="gap-2"
            data-testid="button-next-question"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreCard({ 
  score, 
  total, 
  skill,
  difficulty,
  onRetry,
  onNewTraining
}: { 
  score: number; 
  total: number;
  skill: string;
  difficulty: DifficultyLevel;
  onRetry: () => void;
  onNewTraining: () => void;
}) {
  const percentage = Math.round((score / total) * 100);
  const config = difficultyConfig[difficulty];
  
  let message = "";
  let messageColor = "";
  if (percentage >= 80) {
    message = "Excellent! You've mastered this topic!";
    messageColor = "text-emerald-600 dark:text-emerald-400";
  } else if (percentage >= 60) {
    message = "Good job! Keep practicing to improve.";
    messageColor = "text-amber-600 dark:text-amber-400";
  } else {
    message = "Keep studying! You'll get there.";
    messageColor = "text-red-600 dark:text-red-400";
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="pt-8 pb-6 text-center space-y-6">
        <div className="relative">
          <div className={`w-24 h-24 rounded-full ${config.color} mx-auto flex items-center justify-center`}>
            <Trophy className="h-12 w-12 text-white" />
          </div>
          <Badge 
            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${
              percentage >= 80 ? "bg-emerald-500" : percentage >= 60 ? "bg-amber-500" : "bg-red-500"
            } text-white`}
          >
            {percentage}%
          </Badge>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-1">Training Complete!</h2>
          <p className="text-muted-foreground">{skill} - {config.label}</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-4xl font-bold mb-1">
            {score} / {total}
          </div>
          <p className="text-sm text-muted-foreground">Questions Correct</p>
        </div>

        <p className={`font-medium ${messageColor}`}>{message}</p>

        <div className="flex flex-col gap-3">
          <Button onClick={onRetry} className="gap-2" data-testid="button-retry-training">
            <RotateCcw className="h-4 w-4" />
            Retry This Training
          </Button>
          <Button variant="outline" onClick={onNewTraining} data-testid="button-new-training">
            Choose Different Training
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SkillSelector({ 
  skills, 
  selectedSkill, 
  onSelect 
}: { 
  skills: string[];
  selectedSkill: string | null;
  onSelect: (skill: string) => void;
}) {
  if (skills.length === 0) {
    return (
      <Card className="p-6 text-center">
        <CardContent>
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Skills Found</h3>
          <p className="text-sm text-muted-foreground">
            Add skills to your profile to start training.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {skills.map((skill) => (
        <Button
          key={skill}
          variant={selectedSkill === skill ? "default" : "outline"}
          className="h-auto py-3 px-4 justify-start"
          onClick={() => onSelect(skill)}
          data-testid={`button-skill-${skill.replace(/\s+/g, '-').toLowerCase()}`}
        >
          <Target className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">{skill}</span>
        </Button>
      ))}
    </div>
  );
}

function DifficultySelector({ 
  selectedDifficulty, 
  onSelect 
}: { 
  selectedDifficulty: DifficultyLevel | null;
  onSelect: (difficulty: DifficultyLevel) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {(Object.entries(difficultyConfig) as [DifficultyLevel, typeof difficultyConfig[DifficultyLevel]][]).map(([level, config]) => {
        const Icon = config.icon;
        return (
          <Card
            key={level}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedDifficulty === level 
                ? "ring-2 ring-primary border-primary" 
                : "hover:border-muted-foreground/50"
            }`}
            onClick={() => onSelect(level)}
            data-testid={`button-difficulty-${level}`}
          >
            <CardContent className="p-4 text-center">
              <div className={`w-12 h-12 rounded-full ${config.color} mx-auto mb-3 flex items-center justify-center`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-medium mb-1">{config.label}</h4>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function QuizInterface({ 
  training,
  onReset
}: { 
  training: SkillTrainingRecord;
  onReset: () => void;
}) {
  const questions = training.questions as TrainingQuestion[];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState<QuestionState[]>(
    questions.map(() => ({ userAnswer: "", submitted: false, result: null }))
  );
  const [showScore, setShowScore] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentState = questionStates[currentIndex];
  
  const answeredCount = questionStates.filter(q => q.result !== null).length;
  const correctCount = questionStates.filter(q => q.result === "correct").length;
  const allAnswered = answeredCount === questions.length;
  const progress = (answeredCount / questions.length) * 100;

  const handleAnswerChange = (answer: string) => {
    setQuestionStates(prev => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], userAnswer: answer };
      return updated;
    });
  };

  const handleSubmit = () => {
    setQuestionStates(prev => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], submitted: true };
      return updated;
    });
  };

  const handleMarkResult = (result: AnswerResult) => {
    setQuestionStates(prev => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], result };
      return updated;
    });
    
    if (answeredCount + 1 === questions.length) {
      setTimeout(() => setShowScore(true), 500);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleRetry = () => {
    setQuestionStates(questions.map(() => ({ userAnswer: "", submitted: false, result: null })));
    setCurrentIndex(0);
    setShowScore(false);
  };

  const config = difficultyConfig[training.difficulty as DifficultyLevel];
  const Icon = config.icon;

  if (showScore) {
    return (
      <ScoreCard
        score={correctCount}
        total={questions.length}
        skill={training.skill}
        difficulty={training.difficulty as DifficultyLevel}
        onRetry={handleRetry}
        onNewTraining={onReset}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{training.skill}</h2>
            <p className="text-sm text-muted-foreground">{config.label} Level</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">
              <span className="text-emerald-600">{correctCount}</span>
              {" / "}
              <span>{answeredCount}</span>
              {" / "}
              <span className="text-muted-foreground">{questions.length}</span>
            </p>
            <p className="text-xs text-muted-foreground">Correct / Answered / Total</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="gap-2"
            data-testid="button-change-skill"
          >
            <RotateCcw className="h-4 w-4" />
            Change
          </Button>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <QuestionCard
        question={currentQuestion}
        index={currentIndex}
        total={questions.length}
        questionState={currentState}
        onAnswerChange={handleAnswerChange}
        onSubmit={handleSubmit}
        onMarkResult={handleMarkResult}
        onNext={handleNext}
        onPrev={handlePrev}
        canGoNext={currentIndex < questions.length - 1}
        canGoPrev={currentIndex > 0}
      />

      <div className="flex flex-wrap gap-2 justify-center">
        {questions.map((_, idx) => {
          const state = questionStates[idx];
          return (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                idx === currentIndex 
                  ? "ring-2 ring-primary ring-offset-2" 
                  : ""
              } ${
                state.result === "correct"
                  ? "bg-emerald-500 text-white"
                  : state.result === "incorrect"
                    ? "bg-red-500 text-white"
                    : state.submitted
                      ? "bg-amber-500 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              data-testid={`button-question-nav-${idx}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {allAnswered && !showScore && (
        <div className="text-center">
          <Button 
            size="lg" 
            onClick={() => setShowScore(true)}
            className="gap-2"
            data-testid="button-view-score"
          >
            <Trophy className="h-5 w-5" />
            View Final Score
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SkillsTrainingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null);
  const [activeTraining, setActiveTraining] = useState<SkillTrainingRecord | null>(null);

  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ["skills-list"],
    queryFn: api.getSkillsList,
  });

  const { data: allTraining = [] } = useQuery({
    queryKey: ["all-skill-training"],
    queryFn: api.getAllSkillTraining,
  });

  const generateMutation = useMutation({
    mutationFn: ({ skill, difficulty }: { skill: string; difficulty: DifficultyLevel }) =>
      api.generateSkillTraining(skill, difficulty),
    onSuccess: (data) => {
      setActiveTraining(data);
      queryClient.invalidateQueries({ queryKey: ["all-skill-training"] });
      toast({
        title: "Training Ready",
        description: `20 ${selectedDifficulty} level questions generated for ${selectedSkill}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartTraining = () => {
    if (selectedSkill && selectedDifficulty) {
      const existing = allTraining.find(
        t => t.skill === selectedSkill && t.difficulty === selectedDifficulty
      );
      if (existing) {
        setActiveTraining(existing);
      } else {
        generateMutation.mutate({ skill: selectedSkill, difficulty: selectedDifficulty });
      }
    }
  };

  const handleReset = () => {
    setActiveTraining(null);
    setSelectedDifficulty(null);
  };

  if (activeTraining) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <QuizInterface training={activeTraining} onReset={handleReset} />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">Skills Training</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Practice interview questions for your skills. Answer questions, self-evaluate, and get scored!
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Select a Skill
          </h2>
          {skillsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SkillSelector 
              skills={skills} 
              selectedSkill={selectedSkill} 
              onSelect={setSelectedSkill} 
            />
          )}
        </section>

        {selectedSkill && (
          <section className="animate-in fade-in duration-300">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5" />
              Choose Difficulty
            </h2>
            <DifficultySelector 
              selectedDifficulty={selectedDifficulty} 
              onSelect={setSelectedDifficulty} 
            />
          </section>
        )}

        {selectedSkill && selectedDifficulty && (
          <div className="text-center animate-in fade-in duration-300">
            <Button
              size="lg"
              onClick={handleStartTraining}
              disabled={generateMutation.isPending}
              className="gap-2 px-8"
              data-testid="button-start-training"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <GraduationCap className="h-5 w-5" />
                  Start Training
                </>
              )}
            </Button>
          </div>
        )}

        {allTraining.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Previous Training Sessions
            </h2>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {allTraining.map((training) => {
                  const config = difficultyConfig[training.difficulty as DifficultyLevel];
                  const Icon = config.icon;
                  return (
                    <Card 
                      key={training.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setActiveTraining(training)}
                      data-testid={`card-training-${training.id}`}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{training.skill}</p>
                          <p className="text-xs text-muted-foreground">{config.label} Level</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {(training.questions as TrainingQuestion[]).length} questions
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </section>
        )}
      </div>
    </div>
  );
}
