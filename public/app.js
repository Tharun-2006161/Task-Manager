(() => {
  const $ = (selector) => document.querySelector(selector);
  const storageKey = 'daylight.tasks.v1';
  const themeKey = 'daylight.theme.v1';
  let tasks = readTasks();
  let selectedDate = dateKey(new Date());
  let view = 'today';
  let filter = 'all';

  function readTasks() {
    try { const value = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }
  function persist() {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    $('#saveStatus').textContent = 'Saved just now';
    window.clearTimeout(persist.timer);
    persist.timer = window.setTimeout(() => $('#saveStatus').textContent = 'Saved on this device', 1800);
  }
  function dateKey(date) {
    const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function dateFromKey(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }
  function dayLabel(key, options = { weekday: 'long', month: 'long', day: 'numeric' }) { return dateFromKey(key).toLocaleDateString(undefined, options); }
  function escapeHTML(value) { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
  function getVisibleTasks() {
    let result = [...tasks];
    if (view === 'today') result = result.filter(t => t.date === selectedDate);
    else if (view === 'upcoming') result = result.filter(t => t.date > dateKey(new Date()));
    if (filter === 'active') result = result.filter(t => !t.done);
    if (filter === 'completed') result = result.filter(t => t.done);
    return result.sort((a, b) => (a.done - b.done) || ({high:0, medium:1, low:2}[a.priority] - {high:0, medium:1, low:2}[b.priority]) || a.created - b.created);
  }
  function updateDateHeader() {
    const today = dateKey(new Date()), date = dateFromKey(selectedDate), hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    $('#greeting').innerHTML = `${greeting}<span class="wave"> ${hour < 18 ? '☀' : '☾'}</span>`;
    $('#dateFull').textContent = selectedDate === today ? dayLabel(selectedDate) : dayLabel(selectedDate);
    $('#dateButtonText').textContent = selectedDate === today ? 'Today' : date.toLocaleDateString(undefined, {month:'short', day:'numeric'});
    $('#dateLabel').textContent = selectedDate === today ? 'YOUR DAY, AT A GLANCE' : 'A DAY MADE YOURS';
    $('#datePicker').value = selectedDate;
    $('#crumb').textContent = view === 'today' ? (selectedDate === today ? 'TODAY' : date.toLocaleDateString(undefined, {month:'short', day:'numeric'}).toUpperCase()) : view.toUpperCase();
    $('#listTitle').firstChild.textContent = view === 'upcoming' ? 'Coming up ' : view === 'all' ? 'All your tasks ' : selectedDate === today ? 'Today’s tasks ' : `${date.toLocaleDateString(undefined,{month:'short',day:'numeric'})} tasks `;
  }
  function render() {
    updateDateHeader();
    const visible = getVisibleTasks();
    const todayTasks = tasks.filter(t => t.date === selectedDate);
    const done = todayTasks.filter(t => t.done).length;
    const count = todayTasks.length;
    const percent = count ? Math.round(done / count * 100) : 0;
    $('#progressPercent').textContent = `${percent}%`;
    $('#progressFill').style.width = `${percent}%`;
    $('#progressCount').textContent = `${done} of ${count} ${count === 1 ? 'task' : 'tasks'}`;
    $('#progressTitle').textContent = count && done === count ? 'You did it. Lovely work.' : count && done ? 'You’re finding your rhythm.' : 'Make today count.';
    $('#progressText').textContent = count && done === count ? 'Everything you planned is done. Take a moment to enjoy it.' : count && done ? 'Keep going at your own pace. You’re doing great.' : 'Pick one thing and get started. You’ve got this.';
    $('#taskTotal').textContent = view === 'today' ? todayTasks.length : visible.length;
    $('#navCount').textContent = tasks.filter(t => t.date === dateKey(new Date()) && !t.done).length;
    $('#filterAll').textContent = view === 'today' ? todayTasks.length : visible.length;
    $('#filterActive').textContent = view === 'today' ? todayTasks.filter(t => !t.done).length : visible.filter(t => !t.done).length;
    $('#filterDone').textContent = view === 'today' ? todayTasks.filter(t => t.done).length : visible.filter(t => t.done).length;
    const list = $('#taskList');
    list.innerHTML = visible.map(task => `<article class="task-item ${task.done ? 'completed' : ''}" data-id="${escapeHTML(task.id)}"><button class="check-button" aria-label="${task.done ? 'Mark incomplete' : 'Complete task'}" aria-pressed="${task.done}">${task.done ? '✓' : ''}</button><div class="task-body"><div class="task-name">${escapeHTML(task.text)}</div><div class="task-meta">${view !== 'today' ? `<span class="task-time">${escapeHTML(dayLabel(task.date,{weekday:'short',month:'short',day:'numeric'}))}</span>` : ''}<span class="priority ${task.priority}">${task.priority[0].toUpperCase()+task.priority.slice(1)} priority</span></div></div><button class="delete-button" aria-label="Delete task">×</button></article>`).join('');
    const empty = visible.length === 0;
    $('#emptyState').classList.toggle('show', empty);
    $('#emptyTitle').textContent = filter === 'completed' ? 'Nothing checked off yet.' : filter === 'active' ? 'You’re all caught up.' : view === 'upcoming' ? 'Your future is looking clear.' : view === 'all' ? 'Your list starts here.' : 'A little room to breathe.';
    $('#emptyText').textContent = filter === 'completed' ? 'Finish a task and it’ll show up here.' : filter === 'active' ? 'Everything on this list is done. Take a breath.' : view === 'upcoming' ? 'Tasks you schedule for later will show up here.' : 'Add a task above, or enjoy the space. Your day is yours.';
  }

  $('#taskForm').addEventListener('submit', event => {
    event.preventDefault();
    const input = $('#taskInput'), text = input.value.trim();
    if (!text) return;
    tasks.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, text, date: selectedDate, priority: $('#priorityInput').value, done: false, created: Date.now() });
    persist(); input.value = ''; filter = 'all'; document.querySelectorAll('.filter').forEach(b => b.classList.toggle('active', b.dataset.filter === filter)); render(); input.focus();
  });
  $('#taskList').addEventListener('click', event => {
    const item = event.target.closest('.task-item'); if (!item) return;
    const index = tasks.findIndex(t => t.id === item.dataset.id); if (index < 0) return;
    if (event.target.closest('.check-button')) tasks[index].done = !tasks[index].done;
    else if (event.target.closest('.delete-button')) tasks.splice(index, 1);
    else return;
    persist(); render();
  });
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('.filter').forEach(b => b.classList.toggle('active', b === button)); render();
  }));
  document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => {
    view = button.dataset.view; filter = 'all';
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b === button));
    document.querySelectorAll('.filter').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
    render();
  }));
  $('#prevDay').addEventListener('click', () => { selectedDate = dateKey(new Date(dateFromKey(selectedDate).getFullYear(), dateFromKey(selectedDate).getMonth(), dateFromKey(selectedDate).getDate() - 1)); view = 'today'; setNavToday(); render(); });
  $('#nextDay').addEventListener('click', () => { const d = dateFromKey(selectedDate); selectedDate = dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)); view = 'today'; setNavToday(); render(); });
  function setNavToday() { document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === 'today')); }
  $('#dateButton').addEventListener('click', () => { const picker = $('#datePicker'); if (picker.showPicker) picker.showPicker(); else picker.click(); });
  $('#datePicker').addEventListener('change', event => { if (event.target.value) { selectedDate = event.target.value; view = 'today'; filter = 'all'; setNavToday(); document.querySelectorAll('.filter').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all')); render(); } });
  $('#clearCompleted').addEventListener('click', () => {
    const before = tasks.length;
    tasks = tasks.filter(t => !(t.done && (view !== 'today' || t.date === selectedDate)));
    if (tasks.length !== before) { persist(); render(); }
  });
  $('#themeButton').addEventListener('click', () => { document.body.classList.toggle('dark'); localStorage.setItem(themeKey, document.body.classList.contains('dark') ? 'dark' : 'light'); });
  if (localStorage.getItem(themeKey) === 'dark') document.body.classList.add('dark');
  render();
})();
