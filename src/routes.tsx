import { createBrowserRouter } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { DocumentationPage } from "./pages/DocumentationPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { SecurityPage } from "./pages/SecurityPage";
import { ContactPage } from "./pages/ContactPage";
import { SignUpPage } from "./pages/SignUpPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SetupWizard } from "./pages/SetupWizard";
import { Dashboard } from "./pages/Dashboard";
import { TopologyPage } from "./pages/TopologyPage";
import { DevicesPage } from "./pages/DevicesPage";
import { DeviceDetailsPage } from "./pages/DeviceDetailsPage";
import { NetworkAnalyticsPage } from "./pages/NetworkAnalyticsPage";
import { FailurePredictionPage } from "./pages/FailurePredictionPage";
import { DeviceAnalysisPage } from "./pages/DeviceAnalysisPage";
import { AlertsPage } from "./pages/AlertsPage";
import { UserManagementPage } from "./pages/UserManagementPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicRoute } from "./components/PublicRoute";

export const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <PublicRoute>
                <LandingPage />
            </PublicRoute>
        ),
    },
    {
        path: "/docs",
        element: <DocumentationPage />,
    },
    {
        path: "/privacy",
        element: (
            <PublicRoute>
                <PrivacyPage />
            </PublicRoute>
        ),
    },
    {
        path: "/terms",
        element: (
            <PublicRoute>
                <TermsPage />
            </PublicRoute>
        ),
    },
    {
        path: "/security",
        element: (
            <PublicRoute>
                <SecurityPage />
            </PublicRoute>
        ),
    },
    {
        path: "/contact",
        element: (
            <PublicRoute>
                <ContactPage />
            </PublicRoute>
        ),
    },
    {
        path: "/signup",
        element: (
            <PublicRoute>
                <SignUpPage />
            </PublicRoute>
        ),
    },
    {
        path: "/verify-email",
        element: (
            <PublicRoute>
                <VerifyEmailPage />
            </PublicRoute>
        ),
    },
    {
        path: "/login",
        element: (
            <PublicRoute>
                <LoginPage />
            </PublicRoute>
        ),
    },
    {
        path: "/forgot-password",
        element: (
            <PublicRoute>
                <ForgotPasswordPage />
            </PublicRoute>
        ),
    },
    {
        path: "/reset-password",
        element: (
            <PublicRoute>
                <ResetPasswordPage />
            </PublicRoute>
        ),
    },
    {
        path: "/setup",
        element: (
            <ProtectedRoute>
                <SetupWizard />
            </ProtectedRoute>
        ),
    },
    {
        path: "/app",
        element: (
            <ProtectedRoute>
                <AppLayout />
            </ProtectedRoute>
        ),
        children: [
            { index: true, Component: Dashboard },
            { path: "topology", Component: TopologyPage },
            { path: "devices", Component: DevicesPage },
            { path: "devices/:deviceId", Component: DeviceDetailsPage },
            { path: "analytics", Component: NetworkAnalyticsPage },
            { path: "prediction", Component: FailurePredictionPage },
            { path: "prediction/analysis/:deviceId", Component: DeviceAnalysisPage },
            { path: "alerts", Component: AlertsPage },
            { path: "users", Component: UserManagementPage },
            { path: "settings", Component: SettingsPage },
            { path: "audit", Component: AuditLogsPage },
        ],
    },
]);
