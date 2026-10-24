/**
 * Main Entry Point
 * Initializes the AI Seva Setu Kiosk application.
 */
import { StateMachine } from './app/stateMachine.js';
import { DevPanel } from './ui/devPanel.js';
import { mascotGallery } from './mascot/gallery.js';
import { mascot } from './mascot/mascot.js';

document.addEventListener('DOMContentLoaded', async () => {
  const appContainer = document.getElementById('app');

  // Initialize Mascot Controller
  await mascot.initPacks();

  // Initialize State Machine
  const stateMachine = new StateMachine(appContainer);

  // Initialize Dev Panel (?dev=1)
  const devPanel = new DevPanel(stateMachine);
  stateMachine.setDevPanel(devPanel);

  // Start at Attract screen
  stateMachine.start();

  console.log('✨ AI Seva Setu Kiosk initialized successfully');
  console.log('📌 Top-left corner long-press (3s) opens Mascot Gallery & Settings (PIN: 1234)');
  console.log('📌 Add ?dev=1 to URL to view Dev diagnostic panel');
});
