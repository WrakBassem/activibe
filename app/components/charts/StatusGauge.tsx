"use client";

type StatusGaugeProps = {
  todayLog: any;
  analytics: any;
  smokeBombActive?: boolean;
};

type StatusConfig = {
  type: "momentum" | "success" | "danger" | "steady";
  icon: string;
  title: string;
  subtitle: string;
};

export function StatusGauge({ todayLog, analytics, smokeBombActive }: StatusGaugeProps) {
  const getStatus = (): StatusConfig | null => {
    if (!todayLog && !analytics) return null;

    if (todayLog?.mode === "Burnout Risk") {
      if (smokeBombActive) return {
          type: "steady",
          icon: "🌫️",
          title: "Smoke Screen Active",
          subtitle: "Performance metrics are currently masked for focus clarity."
      };
      
      return {
        type: "danger",
        icon: "🧯",
        title: "Burnout Risk Detected",
        subtitle: "Your recent scores are below baseline. Consider a rest day.",
      };
    }
    if (analytics?.global_streak >= 7) {
      return {
        type: "momentum",
        icon: "🔥",
        title: `${analytics.global_streak}-Day Momentum Streak`,
        subtitle: "You're in the zone — consistency is compounding.",
      };
    }
    if (analytics?.global_streak >= 3) {
      return {
        type: "momentum",
        icon: "⚡",
        title: "Building Momentum",
        subtitle: `${analytics.global_streak} days logged in a row. Keep it going!`,
      };
    }
    if (todayLog?.total_score >= 85) {
      return {
        type: "success",
        icon: "🏆",
        title: "Peak Performance",
        subtitle: `Score of ${todayLog.total_score} — an exceptional day.`,
      };
    }
    if (todayLog?.total_score >= 70) {
      return {
        type: "success",
        icon: "✅",
        title: "Solid Day",
        subtitle: `Score of ${todayLog.total_score} — you're above target.`,
      };
    }
    return null;
  };

  const status = getStatus();
  if (!status) return null;

  return (
    <div className={`status-gauge ${status.type}`}>
      <div className="status-aurora" />
      <div className="status-content">
        <span className="status-icon-wrap">
          <span className="status-icon">{status.icon}</span>
          <span className="status-ring" />
        </span>
        <div className="status-text">
          <span className="status-title">{status.title}</span>
          <span className="status-subtitle">{status.subtitle}</span>
        </div>
        <div className="status-badge">{status.type === "danger" ? "⚠ Alert" : status.type === "success" ? "● Peak" : "↑ Active"}</div>
      </div>

      <style jsx>{`
        .status-gauge {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          margin-bottom: 1.25rem;
          padding: 1rem 1.25rem;
          border: 1px solid transparent;
          box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.12);
          animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .status-gauge.momentum {
          background: linear-gradient(135deg, rgba(255, 237, 213, 0.9) 0%, rgba(254, 215, 170, 0.9) 100%);
          border-color: rgba(251, 146, 60, 0.4);
          box-shadow: 0 4px 24px -4px rgba(234, 88, 12, 0.2);
        }
        .status-gauge.success {
          background: linear-gradient(135deg, rgba(220, 252, 231, 0.9) 0%, rgba(187, 247, 208, 0.9) 100%);
          border-color: rgba(34, 197, 94, 0.4);
          box-shadow: 0 4px 24px -4px rgba(22, 163, 74, 0.2);
        }
        .status-gauge.danger {
          background: linear-gradient(135deg, rgba(254, 226, 226, 0.9) 0%, rgba(254, 202, 202, 0.9) 100%);
          border-color: rgba(239, 68, 68, 0.4);
          box-shadow: 0 4px 24px -4px rgba(185, 28, 28, 0.2);
        }

        .status-gauge.steady {
          background: linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.9) 100%);
          border-color: rgba(148, 163, 184, 0.4);
          box-shadow: 0 4px 24px -4px rgba(71, 85, 105, 0.2);
        }
        @media (prefers-color-scheme: dark) {
          .status-gauge.steady {
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%);
            border-color: rgba(148, 163, 184, 0.3);
            box-shadow: 0 4px 24px -4px rgba(71, 85, 105, 0.3);
          }
          .status-gauge.momentum {
            background: linear-gradient(135deg, rgba(67, 20, 7, 0.95) 0%, rgba(124, 45, 18, 0.8) 100%);
            border-color: rgba(251, 146, 60, 0.3);
            box-shadow: 0 4px 24px -4px rgba(234, 88, 12, 0.3);
          }
          .status-gauge.success {
            background: linear-gradient(135deg, rgba(5, 46, 22, 0.95) 0%, rgba(6, 78, 59, 0.8) 100%);
            border-color: rgba(34, 197, 94, 0.3);
            box-shadow: 0 4px 24px -4px rgba(22, 163, 74, 0.3);
          }
          .status-gauge.danger {
            background: linear-gradient(135deg, rgba(69, 10, 10, 0.95) 0%, rgba(127, 29, 29, 0.8) 100%);
            border-color: rgba(239, 68, 68, 0.3);
            box-shadow: 0 4px 24px -4px rgba(185, 28, 28, 0.3);
          }
        }

        .status-aurora {
          position: absolute;
          top: -30px; right: -30px;
          width: 120px; height: 120px;
          border-radius: 50%;
          opacity: 0.12;
          filter: blur(30px);
          animation: auroraFloat 4s ease-in-out infinite alternate;
        }
        .status-gauge.momentum .status-aurora { background: #f97316; }
        .status-gauge.success .status-aurora { background: #22c55e; }
        .status-gauge.danger .status-aurora { background: #ef4444; }
        .status-gauge.steady .status-aurora { background: #94a3b8; }

        @keyframes auroraFloat {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(10px, 10px) scale(1.1); }
        }

        .status-content {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          position: relative;
          z-index: 1;
        }

        .status-icon-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .status-icon {
          font-size: 1.75rem;
          display: block;
          animation: iconBounce 2s ease-in-out infinite;
        }
        @keyframes iconBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .status-ring {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid currentColor;
          opacity: 0.2;
          animation: ringPulse 2s ease-in-out infinite;
        }
        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.15); opacity: 0; }
        }

        .status-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .status-title {
          font-size: 0.9rem;
          font-weight: 700;
          line-height: 1.2;
        }
        .status-gauge.momentum .status-title { color: #9a3412; }
        .status-gauge.success .status-title { color: #14532d; }
        .status-gauge.danger .status-title { color: #7f1d1d; }
        .status-gauge.steady .status-title { color: #334155; }
        @media (prefers-color-scheme: dark) {
          .status-gauge.momentum .status-title { color: #fdba74; }
          .status-gauge.success .status-title { color: #86efac; }
          .status-gauge.danger .status-title { color: #fca5a5; }
          .status-gauge.steady .status-title { color: #cbd5e1; }
        }

        .status-subtitle {
          font-size: 0.75rem;
          font-weight: 500;
          opacity: 0.75;
        }
        .status-gauge.momentum .status-subtitle { color: #7c2d12; }
        .status-gauge.success .status-subtitle { color: #166534; }
        .status-gauge.danger .status-subtitle { color: #991b1b; }
        .status-gauge.steady .status-subtitle { color: #475569; }
        @media (prefers-color-scheme: dark) {
          .status-gauge.momentum .status-subtitle { color: #fed7aa; }
          .status-gauge.success .status-subtitle { color: #bbf7d0; }
          .status-gauge.danger .status-subtitle { color: #fecaca; }
          .status-gauge.steady .status-subtitle { color: #94a3b8; }
        }

        .status-badge {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 4px 10px;
          border-radius: 99px;
          flex-shrink: 0;
          border: 1px solid currentColor;
          opacity: 0.7;
        }
        .status-gauge.momentum .status-badge { color: #c2410c; }
        .status-gauge.success .status-badge { color: #15803d; }
        .status-gauge.danger .status-badge { color: #b91c1c; }
        .status-gauge.steady .status-badge { color: #64748b; }
        @media (prefers-color-scheme: dark) {
          .status-gauge.momentum .status-badge { color: #fb923c; }
          .status-gauge.success .status-badge { color: #4ade80; }
          .status-gauge.danger .status-badge { color: #f87171; }
          .status-gauge.steady .status-badge { color: #94a3b8; }
        }
      `}</style>
    </div>
  );
}
