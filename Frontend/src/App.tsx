import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { AboutPage } from "@/pages/AboutPage";
import { CrisisPage } from "@/pages/CrisisPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { JobsPage } from "@/pages/JobsPage";
import { LandingPage } from "@/pages/LandingPage";
import { RentalPage } from "@/pages/RentalPage";
import { ScamPage } from "@/pages/ScamPage";
import { SignInPage } from "@/pages/SignInPage";
import { SignUpPage } from "@/pages/SignUpPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="scam" element={<ScamPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="crisis" element={<CrisisPage />} />
          <Route path="rental" element={<RentalPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="sign-in" element={<SignInPage />} />
          <Route path="sign-up" element={<SignUpPage />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
