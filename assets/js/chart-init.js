const chartPalette = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf'
];

const chartInstances = [];

function cssVar(name, fallback) {
  const value = getComputedStyle(document.body).getPropertyValue(name).trim();
  return value || fallback;
}

function withAlpha(color, alpha) {
  if (color.startsWith('rgba(')) {
    return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);
  }

  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }

  return color;
}

function applyTheme(config) {
  const primary = cssVar('--primary', 'rgb(29, 30, 32)');
  const secondary = cssVar('--secondary', 'rgb(92, 92, 92)');
  const border = cssVar('--border', 'rgb(220, 220, 220)');
  const theme = cssVar('--theme', 'rgb(255, 255, 255)');
  const entry = cssVar('--entry', theme);
  const gridColor = withAlpha(border, 0.7);
  const pointBorder = withAlpha(entry, 1);

  config.options ??= {};
  config.options.responsive ??= true;
  config.options.maintainAspectRatio ??= false;
  config.options.animation ??= false;
  config.options.interaction ??= { mode: 'nearest', intersect: false };

  config.options.plugins ??= {};
  config.options.plugins.legend ??= {};
  config.options.plugins.legend.position ??= 'bottom';
  config.options.plugins.legend.labels ??= {};
  config.options.plugins.legend.labels.color ??= primary;
  config.options.plugins.legend.labels.usePointStyle ??= true;
  config.options.plugins.legend.labels.boxWidth ??= 10;

  if (config.options.plugins.title) {
    config.options.plugins.title.color ??= primary;
    config.options.plugins.title.font ??= { size: 16, weight: '600' };
  }

  config.options.plugins.tooltip ??= {};
  config.options.plugins.tooltip.backgroundColor ??= entry;
  config.options.plugins.tooltip.titleColor ??= primary;
  config.options.plugins.tooltip.bodyColor ??= primary;
  config.options.plugins.tooltip.borderColor ??= border;
  config.options.plugins.tooltip.borderWidth ??= 1;

  const scales = config.options.scales || {};
  for (const scale of Object.values(scales)) {
    scale.grid ??= {};
    scale.grid.color ??= gridColor;
    scale.border ??= {};
    scale.border.color ??= gridColor;
    scale.ticks ??= {};
    scale.ticks.color ??= secondary;
    scale.title ??= {};
    scale.title.color ??= secondary;
  }

  for (const [index, dataset] of (config.data?.datasets || []).entries()) {
    const color = dataset.borderColor || dataset.backgroundColor || chartPalette[index % chartPalette.length];
    dataset.borderColor ??= color;
    dataset.backgroundColor ??= color;
    dataset.pointBackgroundColor ??= color;
    dataset.pointBorderColor ??= pointBorder;
    dataset.pointHoverBackgroundColor ??= pointBorder;
    dataset.pointHoverBorderColor ??= color;
    dataset.borderWidth ??= 2;
    dataset.pointRadius ??= 3;
    dataset.pointHoverRadius ??= 4;
    dataset.tension ??= 0.2;
    dataset.fill ??= false;
  }

  return config;
}

function refreshChartTheme() {
  for (const chart of chartInstances) {
    applyTheme(chart.config);
    chart.update();
  }
}

function buildCharts() {
  document.querySelectorAll('script[data-chart-config]').forEach((scriptTag) => {
    const chartId = scriptTag.dataset.chartConfig;
    const canvas = document.getElementById(chartId);

    if (!canvas || canvas.dataset.chartReady === 'true') {
      return;
    }

    const config = JSON.parse(scriptTag.textContent);
    const chart = new Chart(canvas, applyTheme(config));

    canvas.dataset.chartReady = 'true';
    chartInstances.push(chart);
  });

  const toggle = document.getElementById('theme-toggle');
  if (toggle && !toggle.dataset.chartThemeHooked) {
    toggle.addEventListener('click', () => {
      window.setTimeout(refreshChartTheme, 0);
    });
    toggle.dataset.chartThemeHooked = 'true';
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  if (!prefersDark.__chartThemeHooked) {
    prefersDark.addEventListener('change', refreshChartTheme);
    prefersDark.__chartThemeHooked = true;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buildCharts);
} else {
  buildCharts();
}
