import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  User, FileText, Linkedin, GraduationCap, Target, ArrowRight, ArrowLeft, Sparkles 
} from "lucide-react";

const ONBOARDING_KEY = "apply4me_onboarding_seen";

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  {
    icon: <User className="size-8 text-primary" />,
    title: "Set Up Your Profile",
    description: "Start by adding your work experience, education, and skills in the Profile section. This information powers all your AI-generated materials."
  },
  {
    icon: <FileText className="size-8 text-primary" />,
    title: "Generate Tailored Resumes",
    description: "Paste a job description and let AI create a customized resume and cover letter that highlights your most relevant experience."
  },
  {
    icon: <Target className="size-8 text-primary" />,
    title: "Track Your Applications",
    description: "Use the dashboard to track all your applications. Set weekly goals and move applications through stages as you progress."
  },
  {
    icon: <Linkedin className="size-8 text-primary" />,
    title: "Optimize Your LinkedIn",
    description: "Get your LinkedIn profile scored against best practices with specific tips to improve your visibility to recruiters."
  },
  {
    icon: <GraduationCap className="size-8 text-primary" />,
    title: "Practice Your Skills",
    description: "Generate practice questions for any skill at different difficulty levels. Test yourself and track your progress."
  }
];

interface OnboardingDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoShow?: boolean;
}

export function OnboardingDialog({ open: controlledOpen, onOpenChange, autoShow = true }: OnboardingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  useEffect(() => {
    if (autoShow && !isControlled) {
      const seen = localStorage.getItem(ONBOARDING_KEY);
      if (!seen) {
        setInternalOpen(true);
      }
    }
  }, [autoShow, isControlled]);

  const handleOpenChange = (isOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(isOpen);
    } else {
      setInternalOpen(isOpen);
    }
    
    if (!isOpen) {
      localStorage.setItem(ONBOARDING_KEY, "true");
      setCurrentStep(0);
    }
  };

  const handleClose = () => {
    handleOpenChange(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-onboarding">
        <DialogHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="size-5 text-primary" />
            <span className="text-sm font-medium text-primary">Welcome to Apply4Me</span>
          </div>
          <DialogTitle className="font-serif text-xl">
            Getting Started
          </DialogTitle>
          <DialogDescription>
            Quick tips to help you make the most of the app
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              {step.icon}
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-4">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`size-2 rounded-full transition-colors ${
                idx === currentStep ? "bg-primary" : "bg-muted hover:bg-muted-foreground/30"
              }`}
              data-testid={`button-step-${idx}`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex-1"
            data-testid="button-prev-step"
          >
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={handleNext} 
            className="flex-1"
            data-testid="button-next-step"
          >
            {currentStep === steps.length - 1 ? (
              "Get Started"
            ) : (
              <>
                Next
                <ArrowRight className="size-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClose}
          className="text-xs text-muted-foreground"
          data-testid="button-skip-onboarding"
        >
          Skip tutorial
        </Button>
      </DialogContent>
    </Dialog>
  );
}
