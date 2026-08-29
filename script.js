const STORAGE_KEY = 'daily-work-reminder-v1';
const DEFAULT_TASKS = [
  'Plan your top priority task',
  'Complete the first work block',
  'Reply to important messages',
  'Review work progress'
];

const state = {
  tasks: [],
  reminderTime: '',
  dateKey: '',
  lastReminderStamp: ''
};

const elements = {
  dateLabel: document.getElementById('dateLabel'),
  progressText: document.getElementById('progressText'),
  progressBar: document.getElementById('progressBar'),
  taskForm: document.getElementById('taskForm'),
  taskInput: document.getElementById('taskInput'),
  reminderTime: document.getElementById('reminderTime'),
  taskList: document.getElementById('taskList'),
  saveReminderBtn: document.getElementById('saveReminderBtn'),
  testReminderBtn: document.getElementById('testReminderBtn'),
  clearCompletedBtn: document.getElementById('clearCompletedBtn')
};

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  const todayKey = getTodayKey();
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    state.dateKey = todayKey;
    state.tasks = DEFAULT_TASKS.map((text, index) => ({
      id: index + 1,
      text,
      completed: false
    }));
    state.reminderTime = '';
    state.lastReminderStamp = '';
    saveState();
    return;
  }

  try {
    const saved = JSON.parse(raw);
    const isSameDay = saved.dateKey === todayKey;

    state.dateKey = todayKey;
    state.tasks = isSameDay && Array.isArray(saved.tasks) ? saved.tasks : DEFAULT_TASKS.map((text, index) => ({
      id: Date.now() + index,
      text,
      completed: false
    }));
    state.reminderTime = isSameDay ? saved.reminderTime || '' : '';
    state.lastReminderStamp = isSameDay ? saved.lastReminderStamp || '' : '';
  } catch (error) {
    state.dateKey = todayKey;
    state.tasks = DEFAULT_TASKS.map((text, index) => ({
      id: index + 1,
      text,
      completed: false
    }));
    state.reminderTime = '';
    state.lastReminderStamp = '';
  }

  saveState();
}

function saveState() {
  const payload = {
    dateKey: state.dateKey,
    tasks: state.tasks,
    reminderTime: state.reminderTime,
    lastReminderStamp: state.lastReminderStamp
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function formatDate() {
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  return new Date().toLocaleDateString(undefined, options);
}

function renderProgress() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  elements.progressText.textContent = `${percentage}% complete`;
  elements.progressBar.style.width = `${percentage}%`;
  elements.dateLabel.textContent = formatDate();
}

function renderTasks() {
  elements.taskList.innerHTML = '';

  if (!state.tasks.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'No tasks yet. Add your first daily task.';
    elements.taskList.appendChild(empty);
    renderProgress();
    return;
  }

  state.tasks.forEach((task) => {
    const item = document.createElement('li');
    item.className = `task-item ${task.completed ? 'completed' : ''}`;
    item.dataset.id = String(task.id);

    const main = document.createElement('div');
    main.className = 'task-main';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-check';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', `Mark ${task.text} as complete`);

    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'task-delete';
    deleteBtn.textContent = 'Delete';

    checkbox.addEventListener('change', () => {
      task.completed = checkbox.checked;
      saveState();
      render();
    });

    deleteBtn.addEventListener('click', () => {
      state.tasks = state.tasks.filter((entry) => entry.id !== task.id);
      saveState();
      render();
    });

    main.append(checkbox, text);
    item.append(main, deleteBtn);
    elements.taskList.appendChild(item);
  });

  renderProgress();
}

function render() {
  renderTasks();
  elements.reminderTime.value = state.reminderTime;
}

function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  const newTask = {
    id: Date.now() + Math.random(),
    text: trimmed,
    completed: false
  };

  state.tasks.push(newTask);
  saveState();
  render();
}

function notifyUser() {
  const percentage = state.tasks.length
    ? Math.round((state.tasks.filter((task) => task.completed).length / state.tasks.length) * 100)
    : 0;

  const message = `Your daily work is ${percentage}% complete. Keep going!`;

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Daily Work Reminder', {
      body: message
    });
    return;
  }

  alert(`Daily Work Reminder\n${message}`);
}

function checkReminder() {
  if (!state.reminderTime) {
    return;
  }

  const now = new Date();
  const [hours, minutes] = state.reminderTime.split(':').map(Number);
  const currentStamp = `${now.toISOString().slice(0, 10)}-${hours}:${minutes}`;

  if (
    now.getHours() === hours &&
    now.getMinutes() === minutes &&
    state.lastReminderStamp !== currentStamp
  ) {
    state.lastReminderStamp = currentStamp;
    saveState();
    notifyUser();
  }
}

function saveReminder() {
  state.reminderTime = elements.reminderTime.value;
  saveState();

  if (state.reminderTime && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }

  alert(state.reminderTime
    ? `Reminder saved for ${state.reminderTime}.`
    : 'Reminder cleared.');
}

function bindEvents() {
  elements.taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addTask(elements.taskInput.value);
    elements.taskInput.value = '';
    elements.taskInput.focus();
  });

  elements.saveReminderBtn.addEventListener('click', saveReminder);

  elements.testReminderBtn.addEventListener('click', () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    notifyUser();
  });

  elements.clearCompletedBtn.addEventListener('click', () => {
    state.tasks = state.tasks.filter((task) => !task.completed);
    saveState();
    render();
  });
}

loadState();
bindEvents();
render();
setInterval(checkReminder, 30000);
