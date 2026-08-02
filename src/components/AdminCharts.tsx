import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const DARK = '#0d1117';
const BORDER = '#1e2d3d';
const GREEN = '#10b981';
const BLUE = '#388beb';
const AMBER = '#f59e0b';
const PURPLE = '#a78bfa';
const RED = '#ef4444';
const TICK = '#475569';
const GRID = '#1e2d3d';

function useChart(id: string, config: () => any, deps: any[]) {
  const ref = useRef<Chart | null>(null);
  useEffect(() => {
    const canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if (!canvas) return;
    if (ref.current) { ref.current.destroy(); ref.current = null; }
    ref.current = new Chart(canvas, config());
    return () => { ref.current?.destroy(); ref.current = null; };
  }, deps);
}

export function MonthlyLineChart({ data }: { data: { month: string; interactions: number }[] }) {
  useChart('ch-monthly', () => ({
    type: 'line',
    data: {
      labels: data.map(d => d.month),
      datasets: [{
        data: data.map(d => d.interactions),
        borderColor: GREEN, backgroundColor: 'rgba(16,185,129,.08)',
        borderWidth: 2.5, tension: 0.4, fill: true,
        pointBackgroundColor: GREEN, pointBorderColor: DARK, pointBorderWidth: 2, pointRadius: 5,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${c.parsed.y} interactions` } } },
      scales: {
        x: { ticks: { color: TICK, font: { size: 12, weight: 'bold' } }, grid: { display: false }, border: { display: false } },
        y: { ticks: { color: TICK, font: { size: 10 } }, grid: { color: GRID }, border: { display: false }, min: 0 }
      }
    }
  }), [data]);
  return <canvas id="ch-monthly" role="img" aria-label="Monthly interactions line chart" />;
}

export function WeeklyBarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const maxVal = Math.max(...values);
  useChart('ch-weekly', () => ({
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: values.map(v => v === maxVal ? GREEN : 'rgba(16,185,129,.15)'),
        borderRadius: 4, borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${c.parsed.y} interactions` } } },
      scales: {
        x: { ticks: { color: TICK, font: { size: 8 }, maxRotation: 45, autoSkip: false }, grid: { display: false }, border: { display: false } },
        y: { ticks: { color: TICK, font: { size: 9 } }, grid: { color: GRID }, border: { display: false } }
      }
    }
  }), [labels, values]);
  return <canvas id="ch-weekly" role="img" aria-label="Weekly interactions bar chart" />;
}

export function ReservationDonut({ reserved, collected, cancelled, pending }: { reserved: number; collected: number; cancelled: number; pending: number }) {
  useChart('ch-donut', () => ({
    type: 'doughnut',
    data: {
      labels: ['Reserved', 'Collected', 'Cancelled', 'Pending'],
      datasets: [{ data: [reserved, collected, cancelled, pending], backgroundColor: [AMBER, GREEN, RED, BLUE], borderColor: DARK, borderWidth: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${c.label}: ${c.raw}` } } },
      cutout: '65%'
    }
  }), [reserved, collected, cancelled, pending]);
  return <canvas id="ch-donut" role="img" aria-label="Reservation status donut chart" />;
}

export function MedicinePieChart({ meds }: { meds: [string, number][] }) {
  const top6 = meds.slice(0, 5);
  const otherTotal = meds.slice(5).reduce((a, [, v]) => a + v, 0);
  const labels = [...top6.map(([m]) => m), ...(otherTotal > 0 ? ['Other'] : [])];
  const values = [...top6.map(([, v]) => v), ...(otherTotal > 0 ? [otherTotal] : [])];
  const colors = [GREEN, BLUE, AMBER, PURPLE, RED, '#334155'];

  useChart('ch-meds-pie', () => ({
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderColor: DARK, borderWidth: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true, position: 'right' as const,
          labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10, padding: 8, generateLabels: (chart: any) => {
            const total = chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
            return chart.data.labels.map((l: string, i: number) => ({
              text: `${l} (${chart.data.datasets[0].data[i]})`,
              fillStyle: chart.data.datasets[0].backgroundColor[i],
              strokeStyle: DARK,
              lineWidth: 2,
              index: i,
            }));
          }}
        },
        tooltip: { callbacks: { label: (c: any) => ` ${c.label}: ${c.raw} searches` } }
      }
    }
  }), [meds]);
  return <canvas id="ch-meds-pie" role="img" aria-label="Medicine demand pie chart" />;
}

export function PharmacyStatusBar({ active, trial, pending, inactive }: { active: number; trial: number; pending: number; inactive: number }) {
  useChart('ch-pharm-status', () => ({
    type: 'bar',
    data: {
      labels: ['Active', 'Trial', 'Pending', 'Inactive'],
      datasets: [{ data: [active, trial, pending, inactive], backgroundColor: [GREEN, AMBER, BLUE, '#334155'], borderRadius: 6, borderSkipped: false }]
    },
    options: {
      indexAxis: 'y' as const, responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${c.parsed.x} pharmacies` } } },
      scales: {
        x: { ticks: { color: TICK, font: { size: 9 } }, grid: { color: GRID }, border: { display: false } },
        y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false }, border: { display: false } }
      }
    }
  }), [active, trial, pending, inactive]);
  return <canvas id="ch-pharm-status" role="img" aria-label="Pharmacy status horizontal bar chart" />;
}

export function AnalyticsMonthlyBar({ data }: { data: { month: string; interactions: number }[] }) {
  useChart('ch-analytics-monthly', () => ({
    type: 'bar',
    data: {
      labels: data.map(d => d.month),
      datasets: [{
        data: data.map(d => d.interactions),
        backgroundColor: data.map((_, i) => i === data.length - 2 ? GREEN : `rgba(16,185,129,${0.2 + i * 0.2})`),
        borderRadius: 8, borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${c.parsed.y} interactions` } } },
      scales: {
        x: { ticks: { color: TICK, font: { size: 11, weight: 'bold' } }, grid: { display: false }, border: { display: false } },
        y: { ticks: { color: TICK, font: { size: 10 } }, grid: { color: GRID }, border: { display: false } }
      }
    }
  }), [data]);
  return <canvas id="ch-analytics-monthly" role="img" aria-label="Monthly interactions bar chart" />;
}

export function AnalyticsWeeklyLine({ labels, values }: { labels: string[]; values: number[] }) {
  useChart('ch-analytics-weekly', () => ({
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: GREEN, backgroundColor: 'rgba(16,185,129,.06)',
        borderWidth: 2, tension: 0.4, fill: true,
        pointBackgroundColor: GREEN, pointBorderColor: DARK, pointBorderWidth: 2, pointRadius: 3,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${c.parsed.y} interactions` } } },
      scales: {
        x: { ticks: { color: TICK, font: { size: 9 }, maxRotation: 45, autoSkip: false }, grid: { display: false }, border: { display: false } },
        y: { ticks: { color: TICK, font: { size: 9 } }, grid: { color: GRID }, border: { display: false } }
      }
    }
  }), [labels, values]);
  return <canvas id="ch-analytics-weekly" role="img" aria-label="Weekly interactions line chart" />;
}

export function MedicineBarsChart({ meds }: { meds: [string, number][] }) {
  useChart('ch-meds-bars', () => ({
    type: 'bar',
    data: {
      labels: meds.map(([m]) => m),
      datasets: [{
        data: meds.map(([, v]) => v),
        backgroundColor: GREEN,
        borderRadius: 4, borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y' as const, responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${c.parsed.x} searches` } } },
      scales: {
        x: { ticks: { color: TICK, font: { size: 9 } }, grid: { color: GRID }, border: { display: false } },
        y: { ticks: { color: '#94a3b8', font: { size: 10 }, mirror: false }, grid: { display: false }, border: { display: false } }
      }
    }
  }), [meds]);
  return <canvas id="ch-meds-bars" role="img" aria-label="Top medicines searched horizontal bar chart" />;
}
