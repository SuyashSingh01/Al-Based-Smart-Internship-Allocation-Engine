'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export function AnalyticsDashboard({ results }: { results: any[] }) {
  const scoreData = [
    { name: 'Skills', value: 0.89 },
    { name: 'Qualification', value: 0.87 },
    { name: 'Location', value: 0.92 },
    { name: 'Sector', value: 0.84 },
    { name: 'Diversity', value: 0.78 },
  ];

  const diversityData = [
    { name: 'SC/ST', value: 25 },
    { name: 'OBC', value: 35 },
    { name: 'General', value: 30 },
    { name: 'EWS', value: 10 },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Analytics & Insights</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Average Scores by Category</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 1]} />
              <Tooltip formatter={(value: any) => `${(value * 100).toFixed(0)}%`} />
              <Bar dataKey="value" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Diversity Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={diversityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {diversityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard
            title="Top Performing Factor"
            value="Location Match"
            description="92% average score across all matches"
            color="text-green-600"
          />
          <InsightCard
            title="Diversity Impact"
            value="78% Boost"
            description="Students from rural/aspirational districts"
            color="text-purple-600"
          />
          <InsightCard
            title="Skill Alignment"
            value="89% Match"
            description="Strong semantic skill matching"
            color="text-blue-600"
          />
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, value, description, color }: any) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h5 className="text-sm font-medium text-gray-600 mb-1">{title}</h5>
      <p className={`text-2xl font-bold ${color} mb-1`}>{value}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
