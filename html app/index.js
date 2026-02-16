// UI behavior for task manager and boxes
document.addEventListener('DOMContentLoaded', function () {
  // Task Manager (keeps existing behavior)
  const taskInput = document.getElementById('taskInput');
  const taskAddBtn = document.getElementById('addTaskBtn');
  const taskList = document.getElementById('taskList');

  if (taskInput && taskAddBtn && taskList) {
    function addTask() {
      const val = taskInput.value.trim();
      if (!val) return;
      const li = document.createElement('li');
      li.textContent = val;
      li.className = 'task-item';
      li.addEventListener('click', () => li.classList.toggle('done'));
      taskList.appendChild(li);
      taskInput.value = '';
    }
    taskAddBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') addTask(); });
  }

  // Generic box setup (for projects, bills, meetings, notifications)
  function setupBox(boxId) {
    const box = document.getElementById(boxId);
    if (!box) return;
    const input = box.querySelector('.box-input-field');
    const addBtn = box.querySelector('.box-add-btn');
    const list = box.querySelector('.box-list');

    function addItem() {
      const val = input.value.trim();
      if (!val) return;
      const li = document.createElement('li');
      li.textContent = val;
      li.className = 'box-item';
      // toggle done state on click
      li.addEventListener('click', () => li.classList.toggle('done'));
      list.appendChild(li);
      input.value = '';
    }

    addBtn.addEventListener('click', addItem);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') addItem(); });
  }

  ['box-projects','box-bills','box-meetings','box-notifs'].forEach(setupBox);

  // System notification generator for Recent Notifications box
  const sysBtn = document.getElementById('sysNotifyBtn');
  const notifsBox = document.getElementById('box-notifs');
  const notifsList = notifsBox ? notifsBox.querySelector('.box-list') : null;

  function appendNotifToList(title, body) {
    if (!notifsList) return;
    const li = document.createElement('li');
    li.textContent = `${title}: ${body}`;
    li.className = 'box-item';
    li.addEventListener('click', () => li.classList.toggle('done'));
    notifsList.insertBefore(li, notifsList.firstChild);
  }

  function showSystemNotifications() {
    if (!('Notification' in window)) {
      appendNotifToList('Info', 'Notifications API not supported in this browser.');
      return;
    }

    function createSamples() {
      const samples = [
        { title: 'System Update', body: 'Updates installed successfully.' },
        { title: 'Backup Complete', body: 'Your files were backed up.' },
        { title: 'Battery', body: 'Battery charged to 100%.' }
      ];
      samples.forEach(s => {
        try {
          const n = new Notification(s.title, { body: s.body });
          n.onclick = () => window.focus();
          appendNotifToList(s.title, s.body);
        } catch (e) {
          appendNotifToList('Error', 'Failed to create notification.');
        }
      });
    }

    function createFromJSON() {
      // Try to load notifications from permission.json in project root
      fetch('permission.json')
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.json();
        })
        .then(data => {
          if (Array.isArray(data) && data.length) {
            data.forEach(s => {
              try {
                const n = new Notification(s.title, { body: s.body });
                n.onclick = () => window.focus();
                appendNotifToList(s.title, s.body);
              } catch (e) {
                appendNotifToList('Error', 'Failed to create notification.');
              }
            });
          } else {
            createSamples();
          }
        })
        .catch(() => createSamples());
    }

    if (Notification.permission === 'granted') {
      createFromJSON();
    } else if (Notification.permission === 'denied') {
      appendNotifToList('Permission', 'Notification permission was denied.');
    } else {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') createFromJSON();
        else appendNotifToList('Permission', 'Notification permission not granted.');
      });
    }
  }

  if (sysBtn) sysBtn.addEventListener('click', showSystemNotifications);

  // Tab switching for sidebar links
  const sidebarLinks = document.querySelectorAll('.sidebar a');
  const contents = document.querySelectorAll('.content');

  function showContent(id) {
    contents.forEach(c => c.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
  }

  sidebarLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#')) return;
    const id = href.slice(1) || 'dashboard';
    link.addEventListener('click', function (e) {
      e.preventDefault();
      showContent(id);
    });
  });

  // Show dashboard by default
  showContent('dashboard');

  // Projects (Project Manager)
  const projectName = document.getElementById('projectName');
  const projectDesc = document.getElementById('projectDesc');
  const addProjectBtn = document.getElementById('addProjectBtn');
  const projectList = document.getElementById('projectList');

  let projects = [];
  let editingId = null;

  function saveProjects() {
    localStorage.setItem('projects', JSON.stringify(projects));
  }

  function loadProjects() {
    const raw = localStorage.getItem('projects');
    projects = raw ? JSON.parse(raw) : [];
    renderProjects();
  }

  function escapeHTML(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function appendFinishedProject(name, desc) {
    const finishedBox = document.getElementById('box-projects');
    if (!finishedBox) return;
    const list = finishedBox.querySelector('.box-list');
    const li = document.createElement('li');
    li.className = 'box-item';
    li.innerHTML = `<strong>${escapeHTML(name)}</strong>${desc ? ' — ' + escapeHTML(desc) : ''}`;
    list.insertBefore(li, list.firstChild);
  }

  function renderProjects() {
    if (!projectList) return;
    projectList.innerHTML = '';
    projects.forEach(p => {
      const li = document.createElement('li');
      li.className = 'box-item';
      li.dataset.id = p.id;
      li.innerHTML = `
        <div class="project-main"><strong>${escapeHTML(p.name)}</strong>
          <div class="project-desc">${escapeHTML(p.desc || '')}</div>
        </div>
        <div class="project-actions">
          <button class="btn-finish" data-id="${p.id}">${p.done ? 'Unfinish' : 'Finish'}</button>
          <button class="btn-edit" data-id="${p.id}">Edit</button>
          <button class="btn-delete" data-id="${p.id}">Delete</button>
        </div>`;
      projectList.appendChild(li);
    });
  }

  function addProject() {
    const name = (projectName && projectName.value || '').trim();
    const desc = (projectDesc && projectDesc.value || '').trim();
    if (!name) return;
    if (editingId) {
      const p = projects.find(x => x.id === editingId);
      if (p) { p.name = name; p.desc = desc; }
      editingId = null;
      addProjectBtn.textContent = 'Add Project';
    } else {
      const id = Date.now().toString();
      projects.unshift({ id, name, desc, done: false });
    }
    projectName.value = '';
    projectDesc.value = '';
    saveProjects();
    renderProjects();
  }

  if (addProjectBtn) addProjectBtn.addEventListener('click', addProject);
  if (projectName) projectName.addEventListener('keydown', function(e){ if (e.key === 'Enter') addProject(); });
  if (projectDesc) projectDesc.addEventListener('keydown', function(e){ if (e.key === 'Enter') addProject(); });

  if (projectList) {
    projectList.addEventListener('click', function(e){
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.classList.contains('btn-delete')) {
        projects = projects.filter(p => p.id !== id);
        saveProjects(); renderProjects();
      } else if (btn.classList.contains('btn-edit')) {
        const p = projects.find(x => x.id === id);
        if (p) { projectName.value = p.name; projectDesc.value = p.desc || ''; editingId = p.id; addProjectBtn.textContent = 'Save'; }
      } else if (btn.classList.contains('btn-finish')) {
        const p = projects.find(x => x.id === id);
        if (p) {
          p.done = !p.done;
          if (p.done) appendFinishedProject(p.name, p.desc);
          saveProjects(); renderProjects();
        }
      }
    });
  }

  // load existing projects on start
  loadProjects();

  // --- Project Manager (separate pane) ---
  (function setupPM(){
    const pmName = document.getElementById('pmName');
    const pmDesc = document.getElementById('pmDesc');
    const pmAddBtn = document.getElementById('pmAddBtn');
    const pmList = document.getElementById('pmList');

    // Use separate storage key so manager can be independent
    const pmKey = 'projects_pm';
    let pmProjects = [];
    let pmEditing = null;

    function pmSave() { localStorage.setItem(pmKey, JSON.stringify(pmProjects)); }
    function pmLoad() { const raw = localStorage.getItem(pmKey); pmProjects = raw ? JSON.parse(raw) : []; renderPM(); }
    function renderPM(){ if (!pmList) return; pmList.innerHTML=''; pmProjects.forEach(p=>{
        const li=document.createElement('li'); li.className='box-item'; li.dataset.id=p.id;
        li.innerHTML = `<div class="project-main"><strong>${escapeHTML(p.name)}</strong><div class="project-desc">${escapeHTML(p.desc||'')}</div></div><div class="project-actions"><button class="btn-finish" data-id="${p.id}">${p.done? 'Unfinish':'Finish'}</button><button class="btn-edit" data-id="${p.id}">Edit</button><button class="btn-delete" data-id="${p.id}">Delete</button></div>`;
        pmList.appendChild(li);
    }); }

    function pmAdd(){ const name=(pmName&&pmName.value||'').trim(); const desc=(pmDesc&&pmDesc.value||'').trim(); if(!name) return; if(pmEditing){ const p=pmProjects.find(x=>x.id===pmEditing); if(p){p.name=name;p.desc=desc;} pmEditing=null; pmAddBtn.textContent='Add Project'; } else { const id=Date.now().toString(); pmProjects.unshift({id,name,desc,done:false}); }
      if(pmName) pmName.value=''; if(pmDesc) pmDesc.value=''; pmSave(); renderPM(); }

    if(pmAddBtn) pmAddBtn.addEventListener('click', pmAdd);
    if(pmName) pmName.addEventListener('keydown', e=>{ if(e.key==='Enter') pmAdd(); });
    if(pmDesc) pmDesc.addEventListener('keydown', e=>{ if(e.key==='Enter') pmAdd(); });

    if(pmList) pmList.addEventListener('click', function(e){ const btn=e.target.closest('button'); if(!btn) return; const id=btn.dataset.id; if(btn.classList.contains('btn-delete')){ pmProjects=pmProjects.filter(p=>p.id!==id); pmSave(); renderPM(); } else if(btn.classList.contains('btn-edit')){ const p=pmProjects.find(x=>x.id===id); if(p){ pmName.value=p.name; pmDesc.value=p.desc||''; pmEditing=p.id; pmAddBtn.textContent='Save'; } } else if(btn.classList.contains('btn-finish')){ const p=pmProjects.find(x=>x.id===id); if(p){ p.done=!p.done; if(p.done) appendFinishedProject(p.name,p.desc); pmSave(); renderPM(); } } });

    pmLoad();
  })();
});
