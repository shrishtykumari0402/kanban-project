let tasksData = {}

const todo = document.querySelector('#todo');
const progress = document.querySelector('#progress');
const done = document.querySelector('#done');
const columns = [todo, progress, done];
let selectedPriority = 'Essential';
const priorityOptionButtons = document.querySelectorAll('.priority-option');
let dragElement = null;
let editingTask = null;
const emojiMap = {
    'Prime': '⚡ Prime',
    'Essential': '⭐ Essential',
    'Standard': '📄 Standard'
};

function resetPrioritySelection() {
    selectedPriority = 'Essential';
    priorityOptionButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.priority === selectedPriority);
    });
}

priorityOptionButtons.forEach(button => {
    button.addEventListener('click', () => {
        selectedPriority = button.dataset.priority;
        priorityOptionButtons.forEach(btn => btn.classList.toggle('active', btn === button));
    });
});


function addTask(title, desc, column, priority = 'Medium', status) {
    const div = document.createElement("div")

    div.classList.add("task")
    div.classList.add(`priority-${priority.toLowerCase()}`)
    div.dataset.priority = priority;
    div.dataset.status = status || column.id;
    div.setAttribute("draggable", "true")

    div.innerHTML = `
        <div class="task-top">
            <h2>${title}</h2>
            <span class="priority-pill priority-${priority.toLowerCase()}">${emojiMap[priority] || priority}</span>
        </div>
        <p>${desc}</p>
        <div class="task-actions">
            <button type="button" class="edit-btn">Edit</button>
            <button type="button" class="delete-btn">Delete</button>
        </div>
    `

    column.appendChild(div)

    div.addEventListener("dragstart", (e) => {
        dragElement = div;
        div.classList.add('dragging');


        if (e.dataTransfer) {
            e.dataTransfer.setData('text/plain', '');
            e.dataTransfer.effectAllowed = 'move';
            if (e.dataTransfer.setDragImage) {
                const img = document.createElement('img');
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
                e.dataTransfer.setDragImage(img, 0, 0);
            }
        }
    })

    div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
        dragElement = null;
    })

    const editButton = div.querySelector('.edit-btn');
    const deleteButton = div.querySelector('.delete-btn');

    deleteButton.addEventListener("click", () => {
        div.remove();
        updateTaskCount();
    })

    editButton.addEventListener('click', () => openEditModal(div));

    return div;
}

function updateTaskCount() {
    columns.forEach(col => {
        const tasks = col.querySelectorAll(".task");
        const count = col.querySelector(".right");

        tasksData[col.id] = Array.from(tasks).map(t => {
            return {
                title: t.querySelector("h2").innerText,
                desc: t.querySelector("p").innerText,
                priority: t.dataset.priority || 'Medium',
                status: t.dataset.status || col.id
            }

        })

        localStorage.setItem("tasks", JSON.stringify(tasksData));

        count.innerText = tasks.length;
    })
}


if (localStorage.getItem("tasks")) {

    const data = JSON.parse(localStorage.getItem("tasks"));

    // Map legacy priority names to the new set
    const priorityMap = {
        'Normal': 'Standard',
        'Important': 'Essential',
        'Urgent': 'Prime',
        // older possible values (from original project) -> sensible defaults
        'Low': 'Standard',
        'Medium': 'Essential',
        'High': 'Prime'
    };

    for (const col in data) {
        data[col].forEach(task => {
            const priority = priorityMap[task.priority] || task.priority || 'Essential';
            const status = task.status || col;
            const column = document.querySelector(`#${status}`) || todo;
            addTask(task.title, task.desc, column, priority, status);
        })
    }

    updateTaskCount();

    // enhance tasks that might have been created before this version
    enhanceExistingTasks();

}

// Ensure tasks created before this script update get edit/delete controls
function enhanceExistingTasks() {
    const tasks = document.querySelectorAll('.task');
    tasks.forEach(task => {
        if (task.querySelector('.task-actions')) return; // already enhanced

        // remove legacy standalone buttons (direct children) to avoid duplicates
        try {
            const legacy = task.querySelectorAll(':scope > button');
            legacy.forEach(b => b.remove());
        } catch (e) {
            // fallback: remove first direct button found
            const btn = task.querySelector('button');
            if (btn && !btn.classList.contains('edit-btn') && !btn.classList.contains('delete-btn')) btn.remove();
        }

        const actions = document.createElement('div');
        actions.className = 'task-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.innerText = 'Edit';
        editBtn.addEventListener('click', () => openEditModal(task));

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerText = 'Delete';
        delBtn.addEventListener('click', () => { task.remove(); updateTaskCount(); });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        task.appendChild(actions);
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];

    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };

    for (const child of draggableElements) {
        const box = child.getBoundingClientRect();
        const offset = y - (box.top + box.height / 2);

        if (offset < 0 && offset > closest.offset) {
            closest = { offset: offset, element: child };
        }
    }

    return closest.element;
}

function addDragEventsOnColumn(column) {
    column.addEventListener("dragenter", (e) => {
        e.preventDefault();
        column.classList.add("hover-over");
    })

    column.addEventListener("dragleave", (e) => {
        e.preventDefault();
        column.classList.remove("hover-over");
    })

    column.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (!dragElement) return;
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
        }

        const afterElement = getDragAfterElement(column, e.clientY);
        if (afterElement == null) {
            if (column.lastElementChild !== dragElement) {
                column.appendChild(dragElement);
            }
        } else if (afterElement !== dragElement) {
            column.insertBefore(dragElement, afterElement);
        }
    })

    column.addEventListener("drop", (e) => {
        e.preventDefault();
        column.classList.remove("hover-over");
        if (dragElement) {
            dragElement.classList.remove('drop-animation');
            void dragElement.offsetWidth;
            dragElement.classList.add('drop-animation');
            window.setTimeout(() => {
                dragElement && dragElement.classList.remove('drop-animation');
            }, 260);
            dragElement.dataset.status = column.id;
        }
        updateTaskCount();
    })
}

addDragEventsOnColumn(todo);
addDragEventsOnColumn(progress);
addDragEventsOnColumn(done);

/* Modal related logic */

const toggleModalButton = document.querySelector("#toggle-modal");
const modalBg = document.querySelector(".modal .bg");
const modal = document.querySelector(".modal");
const addTaskButton = document.querySelector("#add-new-task");
const statusSelect = document.querySelector('#task-status-select');

function openEditModal(taskEl) {
    editingTask = taskEl;
    const titleInput = document.querySelector('#task-title-input');
    const descInput = document.querySelector('#task-desc-input');

    titleInput.value = taskEl.querySelector('h2').innerText;
    descInput.value = taskEl.querySelector('p').innerText;

    // set priority selection
    const pr = taskEl.dataset.priority || 'Essential';
    selectedPriority = pr;
    priorityOptionButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.priority === pr));

    // set status select
    if (statusSelect) statusSelect.value = taskEl.dataset.status || taskEl.parentElement.id || 'todo';

    addTaskButton.innerText = 'Save Changes';
    modal.classList.add('active');
}

// Open modal
toggleModalButton.addEventListener("click", () => {
    // reset inputs each time modal opens and focus title
    const titleInput = document.querySelector("#task-title-input");
    const descInput = document.querySelector("#task-desc-input");
    titleInput.value = "";
    descInput.value = "";
    resetPrioritySelection();
    editingTask = null;
    if (statusSelect) statusSelect.value = 'todo';
    addTaskButton.innerText = 'Add Task';
    modal.classList.add("active");
    titleInput.focus();
});

// Close modal when clicking background
modalBg.addEventListener("click", () => {
    modal.classList.remove("active");
});

// Add new task
addTaskButton.addEventListener("click", () => {
    const taskTitle = document.querySelector('#task-title-input').value.trim();
    const taskDesc = document.querySelector('#task-desc-input').value.trim();
    const status = (statusSelect && statusSelect.value) ? statusSelect.value : 'todo';
    const column = document.querySelector(`#${status}`) || todo;

    if (!taskTitle) {
        return; // do not save empty titles
    }

    if (editingTask) {
        const titleEl = editingTask.querySelector('h2');
        const descEl = editingTask.querySelector('p');
        if (titleEl) titleEl.innerText = taskTitle;
        if (descEl) descEl.innerText = taskDesc;

        editingTask.dataset.priority = selectedPriority;
        editingTask.dataset.status = status;

        const pill = editingTask.querySelector('.priority-pill');
        if (pill) {
            pill.innerText = emojiMap[selectedPriority] || selectedPriority;
            pill.className = `priority-pill priority-${selectedPriority.toLowerCase()}`;
        } else {
            const newPill = document.createElement('span');
            newPill.className = `priority-pill priority-${selectedPriority.toLowerCase()}`;
            newPill.innerText = emojiMap[selectedPriority] || selectedPriority;
            const top = editingTask.querySelector('.task-top');
            if (top) top.appendChild(newPill);
        }

        Array.from(editingTask.classList).forEach(c => {
            if (c.startsWith('priority-')) editingTask.classList.remove(c);
        });
        editingTask.classList.add(`priority-${selectedPriority.toLowerCase()}`);

        if (editingTask.parentElement && editingTask.parentElement.id !== status) {
            column.appendChild(editingTask);
        }

        editingTask = null;
        addTaskButton.innerText = 'Add Task';
    } else {
        addTask(taskTitle, taskDesc, column, selectedPriority, status);
    }

    updateTaskCount();

    modal.classList.remove('active');
    document.querySelector('#task-title-input').value = '';
    document.querySelector('#task-desc-input').value = '';
    if (statusSelect) statusSelect.value = 'todo';
    resetPrioritySelection();
});

/* Modal related logic */
