import { init } from 'echarts/core';
import { FlowEditor, type FlowDirection, type FlowThemeName } from '../../src/index';
import { bindButton, getElement } from './shared/caseUtils';
import { SWIMLANE_SCENARIOS, type SwimlaneScenario } from './shared/swimlaneScenarios';

const scenarioSelect = getElement<HTMLSelectElement>('#scenario-select');
const directionSelect = getElement<HTMLSelectElement>('#direction-select');
const themeSelect = getElement<HTMLSelectElement>('#theme-select');
const compactToggle = getElement<HTMLInputElement>('#compact-toggle');
const smartToggle = getElement<HTMLInputElement>('#smart-toggle');
const spreadToggle = getElement<HTMLInputElement>('#spread-toggle');
const descriptionLabel = getElement<HTMLElement>('#scenario-desc');
const chart = init(getElement<HTMLElement>('#chart'));

let editor: FlowEditor | null = null;

function getScenario(): SwimlaneScenario {
  return SWIMLANE_SCENARIOS.find((scenario) => scenario.id === scenarioSelect.value) ?? SWIMLANE_SCENARIOS[0];
}

/** Direction and routing are fixed per editor, so every change builds a fresh one. */
function mountEditor(): void {
  const scenario = getScenario();
  editor?.dispose();
  chart.clear();
  editor = new FlowEditor(chart, {
    graph: scenario.graph,
    direction: directionSelect.value as FlowDirection,
    theme: themeSelect.value as FlowThemeName,
    layout: { isLaneCompact: compactToggle.checked },
    routing: { isSmart: smartToggle.checked, shouldSpreadPorts: spreadToggle.checked },
  });
  descriptionLabel.textContent = scenario.description;
}

/** Picking a scenario restores its recommended settings. */
function applyScenarioDefaults(): void {
  const scenario = getScenario();
  directionSelect.value = scenario.direction;
  themeSelect.value = scenario.theme;
  compactToggle.checked = scenario.isLaneCompact;
  mountEditor();
}

SWIMLANE_SCENARIOS.forEach((scenario) => {
  const option = document.createElement('option');
  option.value = scenario.id;
  option.textContent = scenario.name;
  scenarioSelect.appendChild(option);
});

scenarioSelect.addEventListener('change', applyScenarioDefaults);
[directionSelect, themeSelect, compactToggle, smartToggle, spreadToggle].forEach((control) => {
  control.addEventListener('change', mountEditor);
});
bindButton('#layout-button', () => editor?.autoLayout());
window.addEventListener('resize', () => chart.resize());
applyScenarioDefaults();
