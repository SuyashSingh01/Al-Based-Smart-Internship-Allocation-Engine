'use client';

import { useState } from 'react';
import { Search, TrendingUp, Users, Briefcase, Award } from 'lucide-react';
import { MatchResults } from './MatchResults';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export function MatchingDashboard() {
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<any>(null);

  const handleRunMatching = async () => {
    setIsMatching(true);
    
    setTimeout(() => {
      const mockResults = {
        results: [
          {
            studentId: 'S001',
            studentName: 'Rahul Kumar',
            matches: [
              {
                internshipId: 'I001',
                overallScore: 0.89,
                skillScore: 0.92,
                qualificationScore: 0.85,
                locationScore: 1.0,
                sectorScore: 0.88,
                diversityScore: 0.8,
                companyName: 'Tech Corp India',
                title: 'ML Engineering Intern',
              },
              {
                internshipId: 'I002',
                overallScore: 0.82,
                skillScore: 0.88,
                qualificationScore: 0.85,
                locationScore: 0.8,
                sectorScore: 0.75,
                diversityScore: 0.8,
                companyName: 'Data Analytics Ltd',
                title: 'Data Science Intern',
              },
            ],
            totalMatches: 2,
          },
          {
            studentId: 'S002',
            studentName: 'Priya Sharma',
            matches: [
              {
                internshipId: 'I003',
                overallScore: 0.91,
                skillScore: 0.95,
                qualificationScore: 0.9,
                locationScore: 1.0,
                sectorScore: 0.85,
                diversityScore: 0.75,
                companyName: 'FinTech Solutions',
                title: 'Software Development Intern',
              },
            ],
            totalMatches: 1,
          },
        ],
        totalStudentsProcessed: 2,
        totalMatchesGenerated: 3,
        processingTimeSeconds: 1.23,
      };
      
      setMatchResults(mockResults);
      setIsMatching(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-6 w-6" />}
          title="Total Students"
          value="1,247"
          change="+12%"
          color="bg-blue-500"
        />
        <StatCard
          icon={<Briefcase className="h-6 w-6" />}
          title="Active Internships"
          value="342"
          change="+8%"
          color="bg-green-500"
        />
        <StatCard
          icon={<TrendingUp className="h-6 w-6" />}
          title="Matches Generated"
          value="8,456"
          change="+23%"
          color="bg-purple-500"
        />
        <StatCard
          icon={<Award className="h-6 w-6" />}
          title="Avg Match Score"
          value="0.87"
          change="+5%"
          color="bg-orange-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Matching Engine</h2>
            <p className="text-gray-600 mt-1">
              Run intelligent matching algorithm to find best internship opportunities
            </p>
          </div>
          <button
            onClick={handleRunMatching}
            disabled={isMatching}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Search className="h-5 w-5" />
            {isMatching ? 'Matching...' : 'Run Matching'}
          </button>
        </div>

        {isMatching && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Processing AI matching algorithm...</p>
            </div>
          </div>
        )}

        {matchResults && !isMatching && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <Award className="h-5 w-5" />
                <span className="font-semibold">
                  Successfully matched {matchResults.totalStudentsProcessed} students with{' '}
                  {matchResults.totalMatchesGenerated} opportunities in{' '}
                  {matchResults.processingTimeSeconds}s
                </span>
              </div>
            </div>

            <MatchResults results={matchResults.results} />
            <AnalyticsDashboard results={matchResults.results} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, change, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className={`${color} text-white p-3 rounded-lg`}>{icon}</div>
        <span className="text-green-600 text-sm font-semibold">{change}</span>
      </div>
      <h3 className="text-gray-600 text-sm mt-4">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
