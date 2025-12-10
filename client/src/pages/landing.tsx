import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Target, Sparkles, ArrowRight, CheckCircle } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <FileText className="size-5" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight">Apply4Me</span>
          </div>
          <a href="/api/login">
            <Button data-testid="button-login">
              Sign In
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight mb-6" data-testid="text-landing-title">
            Land Your Dream Job
            <br />
            <span className="text-primary">Faster</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            AI-powered resume and cover letter tailoring that highlights your accomplishments 
            and matches them to every job description.
          </p>
          <a href="/api/login">
            <Button size="lg" className="text-lg px-8" data-testid="button-get-started">
              Get Started Free
              <Sparkles className="size-5 ml-2" />
            </Button>
          </a>
        </section>

        <section className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <FileText className="size-6" />
              </div>
              <CardTitle className="font-serif">AI Resume Tailoring</CardTitle>
              <CardDescription>
                Transform your experience into accomplishment-focused bullets with metrics and relevant keywords
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-primary mt-0.5 shrink-0" />
                  Metrics-driven bullet points
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-primary mt-0.5 shrink-0" />
                  Keywords from job descriptions
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-primary mt-0.5 shrink-0" />
                  One-click copy & paste
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Sparkles className="size-6" />
              </div>
              <CardTitle className="font-serif">Cover Letter Generator</CardTitle>
              <CardDescription>
                Professional cover letters that connect your experience to the company's needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-primary mt-0.5 shrink-0" />
                  Company-specific messaging
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-primary mt-0.5 shrink-0" />
                  Multiple tone options
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-primary mt-0.5 shrink-0" />
                  Ready-to-send format
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Target className="size-6" />
              </div>
              <CardTitle className="font-serif">Application Tracking</CardTitle>
              <CardDescription>
                Track your job search progress with weekly goals and application status updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-primary mt-0.5 shrink-0" />
                  Kanban-style dashboard
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-primary mt-0.5 shrink-0" />
                  Weekly application challenges
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-primary mt-0.5 shrink-0" />
                  Progress reminders
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="text-center bg-primary/5 rounded-2xl p-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4">
            Ready to accelerate your job search?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join thousands of job seekers who are landing interviews faster with AI-tailored applications.
          </p>
          <a href="/api/login">
            <Button size="lg" data-testid="button-sign-up">
              Start Applying Smarter
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </a>
        </section>
      </main>

      <footer className="border-t py-6 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Built with Replit
        </div>
      </footer>
    </div>
  );
}
