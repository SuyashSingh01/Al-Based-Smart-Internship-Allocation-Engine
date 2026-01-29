'use client';

import { useState } from 'react';
import { MatchingDashboard } from '@/components/MatchingDashboard';
import { StudentForm } from '@/components/StudentForm';
import { InternshipForm } from '@/components/InternshipForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  const [activeTab, setActiveTab] = useState('matching');

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PM Internship Matching System
          </h1>
          <p className="text-lg text-gray-600">
            AI-Powered Intelligent Internship Matching for Students
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="matching">AI Matching</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="internships">Internships</TabsTrigger>
          </TabsList>

          <TabsContent value="matching">
            <MatchingDashboard />
          </TabsContent>

          <TabsContent value="students">
            <StudentForm />
          </TabsContent>

          <TabsContent value="internships">
            <InternshipForm />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
