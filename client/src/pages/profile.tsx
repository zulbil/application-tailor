import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Loader2, Save, GraduationCap, Briefcase, Download, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { Profile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<Profile>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      location: "",
      headline: "",
      skills: "",
      linkedinUrl: "",
      experiences: [],
      education: []
    }
  });

  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({
    control: form.control,
    name: "experiences"
  });

  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({
    control: form.control,
    name: "education"
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await api.getProfile();
        form.reset(data);
      } catch (error) {
        toast({
          title: "Error loading profile",
          description: "Could not fetch your profile data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [form, toast]);

  const onSubmit = async (data: Profile) => {
    setIsSaving(true);
    try {
      await api.saveProfile(data);
      toast({
        title: "Profile saved",
        description: "Your information has been securely stored.",
      });
    } catch (error) {
      toast({
        title: "Error saving profile",
        description: "Something went wrong while saving.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleExportPDF = () => {
    window.open("/api/profile/export.pdf", "_blank");
  };

  const handleExportDOCX = () => {
    window.open("/api/profile/export.docx", "_blank");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-serif font-bold text-foreground">Your Profile</h1>
          <p className="text-muted-foreground">Manage your personal information, work history, and education to generate tailored applications.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF} data-testid="button-export-pdf">
            <Download className="size-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportDOCX} data-testid="button-export-docx">
            <FileText className="size-4 mr-2" />
            Export DOCX
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic contact details for your resume header.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" data-testid="input-firstName" {...form.register("firstName")} placeholder="Jane" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" data-testid="input-lastName" {...form.register("lastName")} placeholder="Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" data-testid="input-email" type="email" {...form.register("email")} placeholder="jane@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" data-testid="input-phone" {...form.register("phone")} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" data-testid="input-location" {...form.register("location")} placeholder="San Francisco, CA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input id="headline" data-testid="input-headline" {...form.register("headline")} placeholder="Senior Software Engineer" />
            </div>
            <div className="col-span-full space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input id="linkedinUrl" data-testid="input-linkedinUrl" {...form.register("linkedinUrl")} placeholder="https://linkedin.com/in/janedoe" />
            </div>
            <div className="col-span-full space-y-2">
              <Label htmlFor="skills">Skills (Comma separated)</Label>
              <Textarea 
                id="skills" 
                data-testid="input-skills"
                {...form.register("skills")} 
                placeholder="React, TypeScript, Node.js, Project Management, ..." 
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Work Experience */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <Briefcase className="size-5 text-primary" />
              <div>
                <CardTitle>Work Experience</CardTitle>
                <CardDescription>Add your past roles. Be detailed in the responsibilities.</CardDescription>
              </div>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              data-testid="button-add-experience"
              onClick={() => appendExperience({ 
                id: crypto.randomUUID(), 
                company: "", 
                title: "", 
                location: "", 
                startDate: "", 
                endDate: "", 
                responsibilities: "" 
              })}
            >
              <Plus className="size-4 mr-2" />
              Add Experience
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {experienceFields.map((field, index) => (
              <div key={field.id} className="relative grid gap-4 rounded-lg border p-4 bg-muted/30" data-testid={`card-experience-${index}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                  data-testid={`button-delete-experience-${index}`}
                  onClick={() => removeExperience(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input {...form.register(`experiences.${index}.company`)} placeholder="Acme Corp" />
                  </div>
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input {...form.register(`experiences.${index}.title`)} placeholder="Product Manager" />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input {...form.register(`experiences.${index}.location`)} placeholder="Remote" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input {...form.register(`experiences.${index}.startDate`)} placeholder="Jan 2020" />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input {...form.register(`experiences.${index}.endDate`)} placeholder="Present" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Responsibilities & Achievements</Label>
                  <Textarea 
                    {...form.register(`experiences.${index}.responsibilities`)} 
                    placeholder="• Led a team of 5 engineers...&#10;• Increased revenue by 20%..."
                    className="min-h-[120px] font-mono text-sm"
                  />
                </div>
              </div>
            ))}
            
            {experienceFields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No experience added yet. Click "Add Experience" to start.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <GraduationCap className="size-5 text-primary" />
              <div>
                <CardTitle>Education</CardTitle>
                <CardDescription>Add your educational background.</CardDescription>
              </div>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              data-testid="button-add-education"
              onClick={() => appendEducation({ 
                id: crypto.randomUUID(), 
                school: "", 
                degree: "", 
                field: "", 
                startDate: "", 
                endDate: ""
              })}
            >
              <Plus className="size-4 mr-2" />
              Add Education
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {educationFields.map((field, index) => (
              <div key={field.id} className="relative grid gap-4 rounded-lg border p-4 bg-muted/30" data-testid={`card-education-${index}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                  data-testid={`button-delete-education-${index}`}
                  onClick={() => removeEducation(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>School / University</Label>
                    <Input {...form.register(`education.${index}.school`)} placeholder="Stanford University" />
                  </div>
                  <div className="space-y-2">
                    <Label>Degree</Label>
                    <Input {...form.register(`education.${index}.degree`)} placeholder="Bachelor of Science" />
                  </div>
                  <div className="space-y-2">
                    <Label>Field of Study</Label>
                    <Input {...form.register(`education.${index}.field`)} placeholder="Computer Science" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input {...form.register(`education.${index}.startDate`)} placeholder="Sep 2016" />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input {...form.register(`education.${index}.endDate`)} placeholder="May 2020" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {educationFields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No education added yet. Click "Add Education" to start.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" size="lg" disabled={isSaving} className="shadow-lg" data-testid="button-save-profile">
            {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            Save Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
