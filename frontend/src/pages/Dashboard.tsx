
import Navigation from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, FileText, TrendingUp, Plus, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../hooks/reduxHooks";
import { getJobs } from "../slices/jobsSlice";
import { useEffect } from "react";

const Dashboard = () => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Fetch jobs after successful login
    dispatch(getJobs());
  }, [dispatch]);

  const handleNewJobClick = () => {
    navigate('/jobs?create=true');
  };
  const stats = [
    { title: "Active Jobs", value: "12", icon: Briefcase, trend: "+2 this week", color: "text-blue-600" },
    { title: "Total Applicants", value: "248", icon: Users, trend: "+18 today", color: "text-green-600" },
    { title: "Interviews Scheduled", value: "8", icon: FileText, trend: "3 this week", color: "text-purple-600" },
    { title: "Offers Extended", value: "5", icon: TrendingUp, trend: "+2 this month", color: "text-orange-600" },
  ];

  const recentJobs = [
    { title: "Senior React Developer", applicants: 45, status: "Active", posted: "2 days ago" },
    { title: "Product Manager", applicants: 32, status: "Active", posted: "5 days ago" },
    { title: "UX Designer", applicants: 28, status: "Paused", posted: "1 week ago" },
  ];

  const recentActivity = [
    { action: "New application received", job: "Senior React Developer", time: "2 hours ago" },
    { action: "Interview completed", candidate: "Sarah Johnson", time: "4 hours ago" },
    { action: "Job posted", job: "Data Scientist", time: "1 day ago" },
    { action: "Offer accepted", candidate: "Mike Chen", time: "2 days ago" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back, {user?.name || 'Recruiter'}! Here's what's happening with your recruitment.
            </p>
          </div>
          <div className="flex space-x-3">
            {/* <Link> */}
              <Button onClick={handleNewJobClick}>
                <Plus className="w-4 h-4 mr-2" />
                New Job
              </Button>
            {/* </Link> */}
            <Link to="/resume-matching">
              <Button variant="outline">
                <Brain className="w-4 h-4 mr-2" />
                AI Matching
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow animate-fade-in">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stat.trend}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Jobs */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Job Postings
                <Link to="/jobs">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentJobs.map((job, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{job.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{job.applicants} applicants • {job.posted}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        job.status === 'Active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">{activity.action}</p>
                      {activity.job && <p className="text-xs text-gray-500 dark:text-gray-400">Job: {activity.job}</p>}
                      {activity.candidate && <p className="text-xs text-gray-500 dark:text-gray-400">Candidate: {activity.candidate}</p>}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Features Preview */}
        <div className="mt-8">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-blue-100">
                <Brain className="w-5 h-5" />
                <span>AI-Powered Insights</span>
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Discover how AI can transform your recruitment process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Link to="/resume-matching">
                  <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 border-blue-200 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-900/30">
                    <Brain className="w-6 h-6 text-blue-600" />
                    <span className="text-sm">Resume Matching</span>
                  </Button>
                </Link>
                <Link to="/interview-feedback">
                  <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 border-blue-200 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-900/30">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <span className="text-sm">Interview Analysis</span>
                  </Button>
                </Link>
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2 border-blue-200 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-900/30">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <span className="text-sm">Bias Detection</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
