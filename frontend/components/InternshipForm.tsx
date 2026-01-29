'use client';

import { useState } from 'react';
import { Briefcase } from 'lucide-react';

export function InternshipForm() {
  const [formData, setFormData] = useState({
    companyName: '',
    title: '',
    description: '',
    requiredSkills: '',
    preferredQualification: 'UNDERGRADUATE',
    sector: '',
    location: '',
    stipend: '',
    durationMonths: '',
    capacity: '',
    minCgpa: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Internship data:', formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Briefcase className="h-8 w-8 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900">Add New Internship</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Tech Corp India"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Internship Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="ML Engineering Intern"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={3}
              placeholder="Describe the internship role and responsibilities..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Required Skills</label>
            <input
              type="text"
              value={formData.requiredSkills}
              onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Python, Machine Learning, TensorFlow"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Qualification</label>
            <select
              value={formData.preferredQualification}
              onChange={(e) => setFormData({ ...formData, preferredQualification: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="DIPLOMA">Diploma</option>
              <option value="UNDERGRADUATE">Undergraduate</option>
              <option value="POSTGRADUATE">Postgraduate</option>
              <option value="DOCTORATE">Doctorate</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sector</label>
            <input
              type="text"
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Technology"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Bangalore"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stipend (₹)</label>
            <input
              type="number"
              value={formData.stipend}
              onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="15000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Months)</label>
            <input
              type="number"
              min="1"
              max="12"
              value={formData.durationMonths}
              onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="6"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
            <input
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="5"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum CGPA</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={formData.minCgpa}
              onChange={(e) => setFormData({ ...formData, minCgpa: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="7.0"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
        >
          Add Internship
        </button>
      </form>
    </div>
  );
}
