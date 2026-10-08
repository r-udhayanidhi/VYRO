import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { FamilyDashboard } from '@/pages/family/FamilyDashboard';
import { ReportMissing } from '@/pages/family/ReportMissing';
import { SOSPage } from '@/pages/family/SOSPage';
import { FamilyCases } from '@/pages/family/FamilyCases';
import { FamilyCaseDetail } from '@/pages/family/FamilyCaseDetail';
import { RMTDashboard } from '@/pages/rmt/RMTDashboard';
import { RMTCases } from '@/pages/rmt/RMTCases';
import { RMTCaseDetail } from '@/pages/rmt/RMTCaseDetail';
import { RescueDashboard } from '@/pages/rescue/RescueDashboard';
import { HospitalDashboard } from '@/pages/hospital/HospitalDashboard';
import { ShelterDashboard } from '@/pages/shelter/ShelterDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Family */}
        <Route path="/family/dashboard" element={<FamilyDashboard />} />
        <Route path="/family/report-missing" element={<ReportMissing />} />
        <Route path="/family/sos" element={<SOSPage />} />
        <Route path="/family/cases" element={<FamilyCases />} />
        <Route path="/family/cases/:id" element={<FamilyCaseDetail />} />

        {/* RMT */}
        <Route path="/rmt/dashboard" element={<RMTDashboard />} />
        <Route path="/rmt/cases" element={<RMTCases />} />
        <Route path="/rmt/cases/:id" element={<RMTCaseDetail />} />

        {/* Rescue */}
        <Route path="/rescue/dashboard" element={<RescueDashboard />} />

        {/* Hospital */}
        <Route path="/hospital/dashboard" element={<HospitalDashboard />} />

        {/* Shelter */}
        <Route path="/shelter/dashboard" element={<ShelterDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
