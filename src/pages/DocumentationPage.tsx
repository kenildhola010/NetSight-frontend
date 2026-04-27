import { Terminal, Shield, Eye, ArrowLeft, Network, Activity, Cpu, Bot, BarChart3, Bell, Users, Settings, FileText, Globe, Layers, Zap, MonitorSmartphone, Server, Radio, Search, RefreshCw, Lock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./LandingPage.css";

const sections = [
  { id: "getting-started", label: "Getting Started" },
  { id: "architecture", label: "Architecture Overview" },
  { id: "agent", label: "NetSight Agent" },
  { id: "dashboard", label: "Dashboard" },
  { id: "devices", label: "Device Management" },
  { id: "topology", label: "Network Topology" },
  { id: "analytics", label: "Network Analytics" },
  { id: "prediction", label: "Failure Prediction" },
  { id: "alerts", label: "Alert System" },
  { id: "users", label: "User Management" },
  { id: "settings", label: "Settings" },
  { id: "audit", label: "Audit Logs" },
  { id: "security", label: "Security" },
];

export function DocumentationPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("getting-started");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="landing-page-container">
      <nav>
        <div className="nav-logo cursor-pointer" onClick={() => navigate("/")}>
          <Network className="w-6 h-6 text-[#d4af37]" />
          <span className="nav-logo-text">NetSight</span>
        </div>
        <button onClick={() => navigate("/")} className="nav-link flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </nav>

      <div className="hero-outer flex gap-8" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
        {/* Sidebar TOC */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-[90px] h-[calc(100vh-90px)] overflow-y-auto border-r border-white/10 py-8 pr-4">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-4 font-semibold">On this page</p>
          <nav className="space-y-1">
            {sections.map(s => (
              <button key={s.id} onClick={() => scrollTo(s.id)}
                className={`w-full text-left text-sm px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${activeSection === s.id ? "text-[#d4af37] bg-[#d4af37]/10" : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"}`}>
                <ChevronRight className="w-3 h-3 shrink-0" /> {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 pb-12">
          <div className="mb-12 border-b border-white/10 pb-10">
            <h1 className="hero-title mb-2">Documentation</h1>
            <p className="hero-sub mb-8">A comprehensive guide to configuring and understanding NetSight capabilities.</p>
            <div className="flex flex-wrap gap-3">
              <Badge text="v2.1.0" />
              <Badge text="Hybrid Architecture" />
              <Badge text="Real-time Monitoring" />
              <Badge text="AI-Powered Prediction" />
            </div>
          </div>

          <div className="space-y-12">
            {/* Getting Started */}
            <Section id="getting-started" icon={<Terminal className="w-6 h-6" />} title="Getting Started">
              <p>NetSight is an enterprise network monitoring platform that provides real-time visibility into your entire infrastructure. It utilizes a secure <strong className="text-white">hybrid architecture</strong> combining cloud analytics with localized data collection:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
                <ArchCard icon={<MonitorSmartphone className="w-6 h-6 text-[#d4af37]" />} title="Cloud Dashboard" desc="Centralized React interface featuring interactive 3D topology maps, predictive analytics, and real-time alerts." />
                <ArchCard icon={<Server className="w-6 h-6 text-[#3b82f6]" />} title="Analytics Engine" desc="Highly available backend infrastructure powered by MongoDB and AI models to process incoming telemetry." />
                <ArchCard icon={<Bot className="w-6 h-6 text-[#22c55e]" />} title="Discovery Agent" desc="Lightweight, secure Node.js daemon deployed on your internal network to safely discover and monitor devices." />
              </div>
              <h4 className="text-white font-semibold mt-6 mb-3">Deployment Workflow</h4>
              <ul className="list-disc list-inside space-y-2 mt-4 text-gray-400">
                <li>Register your organization on the <strong className="text-white">NetSight Dashboard</strong> to generate your tenant environment.</li>
                <li>Download and deploy the <strong className="text-white">NetSight Agent</strong> on a machine within your target network.</li>
                <li>Access the local Agent console (default: <strong className="text-white">localhost:9090</strong>) to supply your API Key and begin scanning.</li>
              </ul>
            </Section>

            {/* Architecture */}
            <Section id="architecture" icon={<Layers className="w-6 h-6" />} title="Architecture Overview">
              <p>NetSight follows a distributed architecture where the <strong className="text-white">Agent</strong> runs securely inside your firewall, continuously scanning devices and reporting metrics to the <strong className="text-white">Analytics Engine</strong> via encrypted WebSocket tunnels. The <strong className="text-white">Dashboard</strong> visualizes this data in real-time.</p>
              <CodeBlock lines={[
                "┌──────────────┐    HTTPS/WSS     ┌──────────────┐    HTTPS/WSS     ┌──────────────┐",
                "│  Dashboard   │ ◄──────────────► │  Analytics   │ ◄──────────────► │    Agent     │",
                "│  (Cloud)     │                  │  Engine      │                  │  (Local)     │",
                "└──────────────┘                  └──────────────┘                  └──────────────┘",
              ]} />
              <h4 className="text-white font-semibold mt-8 mb-4">Telemetry Lifecycle</h4>
              <ol className="list-decimal list-inside space-y-3 text-gray-400">
                <li><strong className="text-white">Discovery:</strong> Agent performs passive ARP/ICMP sweeps to map subnet devices.</li>
                <li><strong className="text-white">Monitoring:</strong> Agent continuously polls devices for latency, jitter, and packet loss.</li>
                <li><strong className="text-white">Transmission:</strong> Metrics are securely streamed to the Analytics Engine via WebSocket.</li>
                <li><strong className="text-white">Analysis:</strong> AI models analyze the telemetry to predict potential hardware failures.</li>
                <li><strong className="text-white">Visualization:</strong> The Dashboard receives live updates and renders the topology.</li>
              </ol>
            </Section>

            {/* Agent */}
            <Section id="agent" icon={<Bot className="w-6 h-6" />} title="NetSight Agent">
              <p>The <strong className="text-white">NetSight Agent</strong> is the core data-collection component that safely maps your internal subnets without requiring inbound firewall rules.</p>
              <Callout type="info" text="The Agent provides its own configuration UI available locally at http://localhost:9090 upon installation." />

              <h4 className="text-white font-semibold mt-8 mb-4">Agent Microservices</h4>
              <div className="space-y-4">
                <ServiceCard icon={<Search className="w-5 h-5 text-[#3b82f6]" />} name="Network Scanner" desc="Performs non-intrusive ARP/ICMP ping sweeps across configured CIDR ranges. Identifies devices via MAC OUI fingerprinting." />
                <ServiceCard icon={<Activity className="w-5 h-5 text-[#22c55e]" />} name="Telemetry Monitor" desc="Continuously measures latency and connection stability at configurable intervals. Relays live state changes instantly." />
                <ServiceCard icon={<Radio className="w-5 h-5 text-[#f59e0b]" />} name="Connection Manager" desc="Maintains resilient, persistent WebSockets to the cloud backend, ensuring seamless recovery during intermittent outages." />
              </div>

              <h4 className="text-white font-semibold mt-8 mb-4">Provisioning Steps</h4>
              <ol className="list-decimal list-inside space-y-3 text-gray-400">
                <li>Access the Agent Control Panel at <strong className="text-white">http://localhost:9090</strong>.</li>
                <li>Provide the <strong className="text-white">Backend Server URL</strong> (provided during tenant creation).</li>
                <li>Authorize the node using your <strong className="text-white">Agent Key</strong> from the dashboard Settings.</li>
                <li>Select the target <strong className="text-white">Network Interface</strong> and configure the <strong className="text-white">Scan CIDR</strong>.</li>
              </ol>

              <h4 className="text-white font-semibold mt-6 mb-3">Agent API Endpoints</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">Method</th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">Endpoint</th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a2a]">
                    <ApiRow method="GET" path="/api/status" desc="Get overall agent status and service states" />
                    <ApiRow method="GET" path="/api/settings" desc="Retrieve current agent configuration" />
                    <ApiRow method="POST" path="/api/settings" desc="Save config and auto-start services" />
                    <ApiRow method="POST" path="/api/scan-now" desc="Trigger an immediate network scan" />
                    <ApiRow method="POST" path="/api/start/:service" desc="Start a specific service (monitor/scanner/heartbeat)" />
                    <ApiRow method="POST" path="/api/stop/:service" desc="Stop a specific service" />
                    <ApiRow method="POST" path="/api/restart-all" desc="Restart all services" />
                    <ApiRow method="GET" path="/api/interfaces" desc="Auto-detect available network interfaces" />
                    <ApiRow method="GET" path="/api/logs" desc="Retrieve agent log entries" />
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Dashboard */}
            <Section id="dashboard" icon={<BarChart3 className="w-6 h-6" />} title="Dashboard">
              <p>The main dashboard provides an at-a-glance overview of your entire network:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li><strong className="text-white">Summary Cards</strong> — Total devices, online/offline count, active alerts, average latency, and uptime percentage</li>
                <li><strong className="text-white">Latency Trend Chart</strong> — Real-time line chart showing network latency over configurable time ranges (24h, 7d, 30d, 90d)</li>
                <li><strong className="text-white">Performance Trend</strong> — Network uptime percentage over time</li>
                <li><strong className="text-white">Device Distribution</strong> — Pie chart breakdown by device type (Router, Switch, Server, Workstation, etc.)</li>
                <li><strong className="text-white">Traffic Overview</strong> — Inbound/outbound traffic volume chart</li>
                <li><strong className="text-white">Recent Alerts</strong> — Latest critical and warning alerts with quick acknowledge/resolve actions</li>
              </ul>
              <Callout type="tip" text="All dashboard data refreshes automatically in real-time via WebSocket connections. No manual refresh needed." />
            </Section>

            {/* Devices */}
            <Section id="devices" icon={<Network className="w-6 h-6" />} title="Device Management">
              <p>The Devices page displays all discovered network devices with real-time status:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li><strong className="text-white">Device Table</strong> — Name, IP, MAC, type, vendor, status, latency, CPU, and memory for each device</li>
                <li><strong className="text-white">Status Indicators</strong> — Green (Online) or Red (Offline) badges with live updates</li>
                <li><strong className="text-white">Device Details</strong> — Click any device for in-depth metrics, latency/bandwidth charts, event logs, and alert history</li>
                <li><strong className="text-white">Network Discovery</strong> — Trigger new network scans to discover additional devices via the Discovery modal</li>
                <li><strong className="text-white">Device Deletion</strong> — Remove decommissioned devices and their historical data</li>
              </ul>
            </Section>

            {/* Topology */}
            <Section id="topology" icon={<Globe className="w-6 h-6" />} title="Network Topology">
              <p>Interactive visual map of your entire network infrastructure:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li><strong className="text-white">Hierarchical Layout</strong> — Routers → Switches → End devices displayed in a logical tree structure</li>
                <li><strong className="text-white">Live Status</strong> — Nodes are color-coded (green/amber/red) based on real-time health</li>
                <li><strong className="text-white">Subnet Grouping</strong> — Devices automatically grouped by subnet when your network exceeds 10 nodes</li>
                <li><strong className="text-white">Interactive</strong> — Click any node to view device details, hover for quick stats</li>
              </ul>
            </Section>

            {/* Analytics */}
            <Section id="analytics" icon={<BarChart3 className="w-6 h-6" />} title="Network Analytics">
              <p>Deep analytical views of your network performance over time:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li><strong className="text-white">Custom Date Ranges</strong> — Filter analytics by 24h, 7d, 30d, 90d, or custom date ranges</li>
                <li><strong className="text-white">Latency & Packet Loss Trends</strong> — Identify patterns and degradation over time</li>
                <li><strong className="text-white">Traffic Analysis</strong> — Inbound/outbound bandwidth trends with MB aggregation</li>
                <li><strong className="text-white">Performance Metrics</strong> — Uptime trends across your entire fleet</li>
              </ul>
            </Section>

            {/* Prediction */}
            <Section id="prediction" icon={<Cpu className="w-6 h-6" />} title="Failure Prediction & AI Analysis">
              <p>NetSight's AI-powered prediction engine analyzes device behavior patterns to forecast failures before they happen:</p>
              <Callout type="warning" text="The prediction engine assigns a Risk Score (0-100) to each device. Devices scoring above 80 are flagged as Critical and require immediate attention." />
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li><strong className="text-white">Risk Scoring</strong> — Each device receives a risk score based on latency, packet loss, CPU, memory, and status</li>
                <li><strong className="text-white">High-Risk Devices</strong> — Top 5 highest-risk devices displayed with factors and predictions</li>
                <li><strong className="text-white">Detailed AI Analysis</strong> — Click "View Detailed Analysis" on any high-risk device for:
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1 text-gray-400">
                    <li>Risk score gauge with severity classification</li>
                    <li>CPU, Memory, Latency trend charts (24h history)</li>
                    <li>Device Health Radar (multi-axis health visualization)</li>
                    <li>Failure Probability Forecast (24h → 30d timeline)</li>
                    <li>AI-generated maintenance recommendations</li>
                  </ul>
                </li>
                <li><strong className="text-white">Incident Intensity Chart</strong> — Anomaly detection timeline</li>
                <li><strong className="text-white">Failure Types Distribution</strong> — Breakdown by Hardware, Network, Disk, and Power</li>
              </ul>
            </Section>

            {/* Alerts */}
            <Section id="alerts" icon={<Bell className="w-6 h-6" />} title="Alert System">
              <p>Real-time alerting system with full lifecycle management:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li><strong className="text-white">Alert Generation</strong> — Alerts auto-generated when device metrics breach configurable thresholds</li>
                <li><strong className="text-white">Severity Levels</strong> — Critical, Warning, and Info classifications</li>
                <li><strong className="text-white">Alert Lifecycle</strong> — NEW → ACKNOWLEDGED → RESOLVED status flow</li>
                <li><strong className="text-white">Bulk Actions</strong> — Acknowledge or resolve multiple alerts simultaneously</li>
                <li><strong className="text-white">Real-time Updates</strong> — New alerts appear instantly via WebSocket push</li>
                <li><strong className="text-white">Intelligent Deduplication</strong> — Duplicate alerts are merged with occurrence counters</li>
                <li><strong className="text-white">Filtering</strong> — Filter by status, severity, or specific device</li>
              </ul>
            </Section>

            {/* Users */}
            <Section id="users" icon={<Users className="w-6 h-6" />} title="User Management">
              <p>Multi-user support with role-based access control:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li><strong className="text-white">Roles</strong> — Admin and Viewer roles with different permission levels</li>
                <li><strong className="text-white">Organization-based</strong> — Users are scoped to their organization's devices and data</li>
                <li><strong className="text-white">Email Verification</strong> — New accounts require email verification</li>
                <li><strong className="text-white">Password Reset</strong> — Secure forgot/reset password flow</li>
              </ul>
            </Section>

            {/* Settings */}
            <Section id="settings" icon={<Settings className="w-6 h-6" />} title="Settings">
              <p>Configure your NetSight instance:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li><strong className="text-white">Agent Key Management</strong> — Generate and manage API keys for agent authentication</li>
                <li><strong className="text-white">Alert Thresholds</strong> — Configure when alerts are triggered (latency, packet loss, CPU, memory)</li>
                <li><strong className="text-white">Monitoring Settings</strong> — Adjust polling intervals and scan frequencies</li>
                <li><strong className="text-white">Network Discovery</strong> — Trigger manual network rescans from the dashboard</li>
              </ul>
            </Section>

            {/* Audit */}
            <Section id="audit" icon={<FileText className="w-6 h-6" />} title="Audit Logs">
              <p>Complete activity trail for compliance and troubleshooting:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>Tracks all user actions: login, settings changes, alert acknowledgements, device deletions</li>
                <li>Filterable by user, action type, and date range</li>
                <li>Exportable for compliance reporting</li>
              </ul>
            </Section>

            {/* Security */}
            <Section id="security" icon={<Shield className="w-6 h-6" />} title="Security">
              <p>NetSight implements enterprise-grade security:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li><strong className="text-white">JWT Authentication</strong> — All API requests require Bearer token authentication</li>
                <li><strong className="text-white">Port Fingerprinting</strong> — During scans, the agent detects open ports and flags insecure services (Telnet, FTP, vulnerable SSH)</li>
                <li><strong className="text-white">Organization Isolation</strong> — All data is scoped per-organization; no cross-tenant access</li>
                <li><strong className="text-white">Agent Key Auth</strong> — Agents authenticate via unique API keys tied to organizations</li>
                <li><strong className="text-white">CORS Protection</strong> — Strict origin validation on the backend</li>
              </ul>
              <Callout type="warning" text="Always store your .env files securely. Never commit API keys, MongoDB URIs, or JWT secrets to version control." />
            </Section>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/50 backdrop-blur-md mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} NetSight Documentation. Built for modern infrastructure teams.
        </div>
      </footer>
    </div>
  );
}

/* ── Reusable Sub-Components ── */

function Section({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl text-[#d4af37] font-bold mb-6 flex items-center gap-3">
        <span className="bg-[#d4af37]/10 p-2 rounded-md flex items-center justify-center">{icon}</span>
        {title}
      </h2>
      <div className="glass-card space-y-4 text-gray-300 leading-relaxed shadow-xl" style={{ padding: '32px' }}>
        {children}
      </div>
    </section>
  );
}

function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <div className="bg-[#0a0a0a] p-4 rounded-lg text-sm font-mono text-gray-400 border border-white/10 overflow-x-auto shadow-inner">
      {lines.map((l, i) => <div key={i}>{l || "\u00A0"}</div>)}
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return <span className="px-3 py-1 text-xs font-bold bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 rounded-full">{text}</span>;
}

function ArchCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="glass-card hover:border-[#d4af37]/50 transition-colors" style={{ padding: '24px' }}>
      <div className="mb-4">{icon}</div>
      <h4 className="text-white font-bold text-lg mb-2">{title}</h4>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function ServiceCard({ icon, name, desc }: { icon: React.ReactNode; name: string; desc: string }) {
  return (
    <div className="glass-card flex items-start gap-4 hover:border-[#d4af37]/50 transition-colors" style={{ padding: '20px' }}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <h5 className="text-white font-bold mb-1">{name}</h5>
        <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function Callout({ type, text }: { type: "info" | "tip" | "warning"; text: string }) {
  const styles = {
    info: { bg: "bg-blue-500/5", border: "border-blue-500/30", text: "text-blue-400", icon: <Zap className="w-5 h-5 shrink-0" /> },
    tip: { bg: "bg-green-500/5", border: "border-green-500/30", text: "text-green-400", icon: <RefreshCw className="w-5 h-5 shrink-0" /> },
    warning: { bg: "bg-[#2a2210]", border: "border-[#8a6b1c]", text: "text-[#f59e0b]", icon: <Cpu className="w-5 h-5 shrink-0" /> },
  };
  const s = styles[type];
  return (
    <div className={`${s.bg} border ${s.border} ${s.text} p-4 rounded-lg mt-4 flex items-start gap-3`}>
      <div className="mt-0.5">{s.icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function ApiRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  const color = method === "GET" ? "text-green-400" : "text-blue-400";
  return (
    <tr>
      <td className={`py-2 px-3 font-mono text-xs font-bold ${color}`}>{method}</td>
      <td className="py-2 px-3 font-mono text-xs text-white">{path}</td>
      <td className="py-2 px-3 text-gray-400">{desc}</td>
    </tr>
  );
}
