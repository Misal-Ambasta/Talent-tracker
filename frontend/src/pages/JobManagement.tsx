import { useState, useEffect } from "react";
import Navigation from "@/components/navigation";
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Calendar,
  Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { getJobs, addJob, removeJob } from "../slices/jobsSlice";

const JobManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { jobs, loading, error } = useAppSelector((state) => state.jobs);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreating(true);
      // Clean up URL
      searchParams.delete('create');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    dispatch(getJobs());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    responsibilities: "",
    location: "",
    salaryRange: "",
    experienceLevel: "",
    employmentType: "full-time",
    department: "Engineering",
    postedDate: new Date().toISOString(),
    closingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "open",
    skills: "",
  });

  const handleCreateJob = () => {
    if (!newJob.title || !newJob.description) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    // Convert skills string to array
    const skillsArray = newJob.skills
      ? newJob.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      : [];

    // Parse salary range into min and max
    const salaryMatch = newJob.salaryRange.match(/(\d+[,\d]*)\s*-\s*(\d+[,\d]*)/);
    const salary = salaryMatch
  ? {
      min: parseInt(salaryMatch[1].replace(/,/g, "")),
      max: parseInt(salaryMatch[2].replace(/,/g, "")),
      currency: "USD",
    }
  : {
      min: 0,
      max: 0,
      currency: "USD",
    };
    // Create job data object
    const jobData = {
      title: newJob.title,
      description: newJob.description,
      responsibilities: newJob.responsibilities,
      location: newJob.location,
      salary,
      employmentType: newJob.employmentType,
      department: newJob.department,
      postedDate: newJob.postedDate,
      closingDate: newJob.closingDate,
      status: newJob.status,
      // requirements: [],
      experienceLevel: newJob.experienceLevel || "mid",
      skills: skillsArray,
      company: "Our Company",
      isRemote: false,
      isActive: true,
    };

    dispatch(addJob(jobData as any))
      .unwrap()
      .then(() => {
        toast({
          title: "Job created successfully",
          description: `${newJob.title} has been posted.`,
        });

        setNewJob({
          title: "",
          description: "",
          responsibilities: "",
          location: "",
          salaryRange: "",
          experienceLevel: "",
          employmentType: "full-time",
          department: "Engineering",
          postedDate: new Date().toISOString(),
          closingDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "open",
          skills: "",
        });
        setIsCreating(false);
      })
      .catch((err) => {
        toast({
          title: "Error creating job",
          description: err.message || "Something went wrong",
          variant: "destructive",
        });
      });
  };

  const handleDeleteJob = (_id: string, event: React.MouseEvent) => {
    event.stopPropagation();

    dispatch(removeJob(_id))
      .unwrap()
      .then(() => {
        toast({
          title: "Job deleted successfully",
          description: "The job posting has been removed.",
        });
      })
      .catch((err) => {
        toast({
          title: "Error deleting job",
          description: err.message || "Something went wrong",
          variant: "destructive",
        });
      });
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Job Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create and manage your job postings
            </p>
          </div>
          <Button onClick={() => setIsCreating(!isCreating)}>
            <Plus className="w-4 h-4 mr-2" />
            {isCreating ? "Search" : "New Job"}
          </Button>
        </div>

        {/* Create Job Form */}
        {isCreating && (
          <Card className="mb-8 animate-fade-in">
            <CardHeader>
              <CardTitle>Create New Job</CardTitle>
              <CardDescription>
                Fill in the details for your new job posting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Senior React Developer"
                      value={newJob.title}
                      onChange={(e) =>
                        setNewJob({ ...newJob, title: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g. San Francisco, CA or Remote"
                      value={newJob.location}
                      onChange={(e) =>
                        setNewJob({ ...newJob, location: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary">Salary Range</Label>
                    <Input
                      id="salary"
                      placeholder="e.g. 120,000 - 160,000"
                      value={newJob.salaryRange}
                      onChange={(e) =>
                        setNewJob({ ...newJob, salaryRange: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience">Experience Level</Label>
                    <Select
                      onValueChange={(value) =>
                        setNewJob({ ...newJob, experienceLevel: value })
                      }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry Level</SelectItem>
                        <SelectItem value="mid">Mid-Level</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="lead">Lead/Principal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="employmentType">Employment Type</Label>
                    <Select
                      value={newJob.employmentType}
                      onValueChange={(value) =>
                        setNewJob({ ...newJob, employmentType: value })
                      }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="temporary">Temporary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      placeholder="e.g. Engineering, Marketing"
                      value={newJob.department}
                      onChange={(e) =>
                        setNewJob({ ...newJob, department: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="closingDate">Closing Date</Label>
                    <Input
                      id="closingDate"
                      type="date"
                      value={newJob.closingDate.slice(0, 10)}
                      onChange={(e) =>
                        setNewJob({
                          ...newJob,
                          closingDate: e.target.value + "T00:00:00.000Z",
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="description">Job Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the role, responsibilities, and requirements..."
                      className="h-32"
                      value={newJob.description}
                      onChange={(e) =>
                        setNewJob({ ...newJob, description: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="responsibilities">Responsibilities</Label>
                    <Textarea
                      id="responsibilities"
                      placeholder="List the main responsibilities for this job..."
                      className="h-24"
                      value={newJob.responsibilities}
                      onChange={(e) =>
                        setNewJob({
                          ...newJob,
                          responsibilities: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="skills">
                      Required Skills (comma separated)
                    </Label>
                    <Textarea
                      id="skills"
                      placeholder="e.g. React, TypeScript, Node.js"
                      className="h-24"
                      value={newJob.skills}
                      onChange={(e) =>
                        setNewJob({ ...newJob, skills: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex space-x-4 mt-6 ml-2">
                    <Button onClick={handleCreateJob}>Create Job</Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filter */}
        <Card className="mb-6 animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search jobs by title or location..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Jobs List */}
        <div className="grid md:grid-cols-2 gap-4">
          {loading ? (
            <div className="md:col-span-2">
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-gray-500 dark:text-gray-400">
                    <p>Loading jobs...</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <Card
                key={job._id}
                className="hover:shadow-lg transition-shadow animate-fade-in cursor-pointer "
                onClick={() => navigate(`/jobs/${job._id}`)}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {job.title}
                        </h3>
                        <Badge
                          variant={
                            job.status === "open" ? "default" : "secondary"
                          }>
                          {job.status === "open" ? "Active" : job.status}
                        </Badge>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {job.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                        <span>📍 {job.location}</span>
                        <span>
                          💰 ${job.salary?.min?.toLocaleString()} - $
                          {job.salary?.max?.toLocaleString()}
                        </span>
                        <span>🎯 {job.experienceLevel}</span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Posted {new Date(job.postedDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {job.skills.map((skill, skillIndex) => (
                          <Badge key={skillIndex} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/${job._id}`);
                        }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleDeleteJob(job._id, e)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="md:col-span-2">
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-gray-500 dark:text-gray-400">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No jobs found matching your search criteria.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobManagement;
