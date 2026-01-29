'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';

export function StudentForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    skills: '',
    qualification: 'UNDERGRADUATE',
    fieldOfStudy: '',
    cgpa: '',
    locationPreference: '',
    sectorInterests: '',
    socialCategory: 'GENERAL',
    districtType: 'URBAN',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Student data:', formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="h-8 w-8 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900">Add New Student</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter student name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="student@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Skills (comma-separated)</label>
            <input
              type="text"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Python, Machine Learning, Data Analysis"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Qualification</label>
            <select
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="DIPLOMA">Diploma</option>
              <option value="UNDERGRADUATE">Undergraduate</option>
              <option value="POSTGRADUATE">Postgraduate</option>
              <option value="DOCTORATE">Doctorate</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Field of Study</label>
            <input
              type="text"
              value={formData.fieldOfStudy}
              onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Computer Science"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CGPA</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={formData.cgpa}
              onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="8.5"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location Preference</label>
            <input
              type="text"
              value={formData.locationPreference}
              onChange={(e) => setFormData({ ...formData, locationPreference: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Delhi, Mumbai, Bangalore"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sector Interests</label>
            <input
              type="text"
              value={formData.sectorInterests}
              onChange={(e) => setFormData({ ...formData, sectorInterests: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Technology, AI, FinTech"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Social Category</label>
            <select
              value={formData.socialCategory}
              onChange={(e) => setFormData({ ...formData, socialCategory: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="GENERAL">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="EWS">EWS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">District Type</label>
            <select
              value={formData.districtType}
              onChange={(e) => setFormData({ ...formData, districtType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="URBAN">Urban</option>
              <option value="RURAL">Rural</option>
              <option value="ASPIRATIONAL">Aspirational</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
        >
          Add Student
        </button>
      </form>
    </div>
  );
}
