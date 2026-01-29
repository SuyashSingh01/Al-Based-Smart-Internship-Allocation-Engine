'use client';

import { Star, MapPin, Building2, TrendingUp } from 'lucide-react';

export function MatchResults({ results }: { results: any[] }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Match Results</h3>
      
      {results.map((result) => (
        <div key={result.studentId} className="border border-gray-200 rounded-lg p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">{result.studentName}</h4>
              <p className="text-sm text-gray-600">ID: {result.studentId}</p>
            </div>
            <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full font-semibold">
              {result.totalMatches} Matches
            </div>
          </div>

          <div className="space-y-4">
            {result.matches.map((match: any, idx: number) => (
              <div
                key={match.internshipId}
                className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">
                        #{idx + 1}
                      </span>
                      <h5 className="font-semibold text-gray-900">{match.title}</h5>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {match.companyName}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-lg font-bold text-indigo-600">
                      <Star className="h-5 w-5 fill-current" />
                      {(match.overallScore * 100).toFixed(0)}%
                    </div>
                    <p className="text-xs text-gray-500">Match Score</p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  <ScoreBar label="Skills" score={match.skillScore} color="bg-blue-500" />
                  <ScoreBar label="Qualification" score={match.qualificationScore} color="bg-green-500" />
                  <ScoreBar label="Location" score={match.locationScore} color="bg-yellow-500" />
                  <ScoreBar label="Sector" score={match.sectorScore} color="bg-purple-500" />
                  <ScoreBar label="Diversity" score={match.diversityScore} color="bg-pink-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="text-center">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${score * 100}%` }}
        />
      </div>
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-xs font-semibold text-gray-900">{(score * 100).toFixed(0)}%</p>
    </div>
  );
}
