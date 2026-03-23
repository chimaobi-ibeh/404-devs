import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CAMPAIGN_COLORS = [
  "bg-primary/20 text-primary border-primary/30",
  "bg-signal/20 text-signal border-signal/30",
  "bg-gold/20 text-gold border-gold/30",
  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "bg-purple-500/20 text-purple-400 border-purple-500/30",
];

function getColorForIndex(i: number) {
  return CAMPAIGN_COLORS[i % CAMPAIGN_COLORS.length];
}

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstDay + 1;
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null);
  }
  return cells;
}

function dayMatchesCampaign(
  year: number,
  month: number,
  day: number,
  campaign: any
): boolean {
  const cellDate = new Date(year, month, day);
  const start = campaign.postingWindowStart ? new Date(campaign.postingWindowStart) : null;
  const end = campaign.postingWindowEnd ? new Date(campaign.postingWindowEnd) : null;
  const deadline = campaign.deadline ? new Date(campaign.deadline) : null;

  if (start && end) {
    return cellDate >= new Date(start.toDateString()) && cellDate <= new Date(end.toDateString());
  }
  if (deadline) {
    return cellDate.toDateString() === new Date(deadline.toDateString()).toDateString();
  }
  return false;
}

function rosterDayMatch(year: number, month: number, day: number, entry: any): boolean {
  const deadline = entry.campaign?.deadline ? new Date(entry.campaign.deadline) : null;
  if (!deadline) return false;
  const cellDate = new Date(year, month, day);
  return cellDate.toDateString() === new Date(deadline.toDateString()).toDateString();
}

export default function ContentCalendarPage() {
  const { user } = useAuth();
  const role = user?.role ?? "creator";
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { data: campaigns = [] } = trpc.advertiser.getCampaigns.useQuery(
    { limit: 50 },
    { enabled: role === "advertiser" || role === "admin" }
  );
  const { data: rosterEntries = [] } = trpc.creator.getMyRosterEntries.useQuery(
    undefined,
    { enabled: role === "creator" || role === "admin" }
  );

  const cells = buildCalendarCells(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  // Build list of items relevant to this month for legend
  const visibleCampaigns: any[] = [];
  if (role === "advertiser" || role === "admin") {
    (campaigns as any[]).forEach((c: any) => {
      const start = c.postingWindowStart ? new Date(c.postingWindowStart) : null;
      const end = c.postingWindowEnd ? new Date(c.postingWindowEnd) : null;
      const deadline = c.deadline ? new Date(c.deadline) : null;
      const inMonth = (d: Date) => d.getFullYear() === year && d.getMonth() === month;
      if ((start && inMonth(start)) || (end && inMonth(end)) || (deadline && inMonth(deadline))) {
        if (!visibleCampaigns.find(x => x.id === c.id)) visibleCampaigns.push(c);
      }
    });
  }
  if (role === "creator" || role === "admin") {
    (rosterEntries as any[]).forEach((entry: any) => {
      const deadline = entry.campaign?.deadline ? new Date(entry.campaign.deadline) : null;
      if (deadline && deadline.getFullYear() === year && deadline.getMonth() === month) {
        if (!visibleCampaigns.find(x => x.id === entry.campaignId)) {
          visibleCampaigns.push({ id: entry.campaignId, title: entry.campaign?.title ?? `Campaign #${entry.campaignId}`, _fromRoster: true, deadline: entry.campaign?.deadline });
        }
      }
    });
  }

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="font-display text-5xl tracking-wider mb-6">CONTENT CALENDAR</h1>

        {/* Month navigation */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-sm text-foreground font-bold tracking-wider uppercase w-48 text-center">
            {monthLabel}
          </span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-px mb-px">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="px-2 py-2 text-center">
              <span className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">{d}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {cells.map((dayNum, i) => {
            const isToday =
              dayNum !== null &&
              dayNum === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();

            // Find matching campaigns for this day
            const dayItems: { label: string; colorIdx: number }[] = [];
            if (dayNum !== null) {
              if (role === "advertiser" || role === "admin") {
                (campaigns as any[]).forEach((c: any, idx: number) => {
                  if (dayMatchesCampaign(year, month, dayNum, c)) {
                    dayItems.push({ label: c.title, colorIdx: idx });
                  }
                });
              }
              if (role === "creator" || role === "admin") {
                (rosterEntries as any[]).forEach((entry: any, idx: number) => {
                  if (rosterDayMatch(year, month, dayNum, entry)) {
                    dayItems.push({
                      label: entry.campaign?.title ?? `Campaign #${entry.campaignId}`,
                      colorIdx: idx,
                    });
                  }
                });
              }
            }

            return (
              <div
                key={i}
                className={`bg-card min-h-[90px] p-2 flex flex-col ${
                  isToday ? "bg-primary/10" : ""
                } ${dayNum === null ? "opacity-30" : ""}`}
              >
                {dayNum !== null && (
                  <>
                    <span
                      className={`font-mono text-[9px] mb-1 self-start ${
                        isToday
                          ? "text-primary font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {dayNum}
                    </span>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {dayItems.slice(0, 3).map((item, j) => (
                        <span
                          key={j}
                          className={`font-mono text-[7px] tracking-wide rounded px-1 py-0.5 border truncate ${getColorForIndex(
                            item.colorIdx
                          )}`}
                          title={item.label}
                        >
                          {item.label.length > 12
                            ? item.label.substring(0, 12) + "…"
                            : item.label}
                        </span>
                      ))}
                      {dayItems.length > 3 && (
                        <span className="font-mono text-[7px] text-muted-foreground">
                          +{dayItems.length - 3} more
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        {visibleCampaigns.length > 0 && (
          <div className="mt-6 bg-card border border-border rounded-lg p-4">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">LEGEND</p>
            <div className="flex flex-wrap gap-3">
              {visibleCampaigns.map((c: any, idx: number) => (
                <div key={c.id} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-sm border ${getColorForIndex(idx)}`} />
                  <span className="font-mono text-[9px] text-foreground">{c.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
