let tasksData = {}

const todo = document.querySelector('#todo');
const progress = document.querySelector('#progress');
const done = document.querySelector('#done');
const columns = [todo, progress, done];
let selectedPriority = 'Medium';
const priorityOptionButtons = document.querySelectorAll('.priority-option');
let dragElement = null;

function resetPrioritySelection() {
    selectedPriority = 'Medium';
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


function addTask(title, desc, column, priority = 'Medium') {
    const div = document.createElement("div")

    div.classList.add("task")
    div.classList.add(`priority-${priority.toLowerCase()}`)
    div.dataset.priority = priority;
    div.setAttribute("draggable", "true")

    div.innerHTML = `
        <div class="task-top">
            <h2>${title}</h2>
            <span class="priority-pill priority-${priority.toLowerCase()}">${priority}</span>
        </div>
        <p>${desc}</p>
        <button>Delete</button>
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

    const deleteButton = div.querySelector("button");
    deleteButton.addEventListener("click", () => {
        div.remove();
        updateTaskCount();
    })

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
                priority: t.dataset.priority || 'Medium'
            }

        })

        localStorage.setItem("tasks", JSON.stringify(tasksData));

        count.innerText = tasks.length;
    })
}


if (localStorage.getItem("tasks")) {

    const data = JSON.parse(localStorage.getItem("tasks"));

    for (const col in data) {
        const column = document.querySelector(`#${col}`);
        data[col].forEach(task => {
            addTask(task.title, task.desc, column, task.priority || 'Medium');
        })
    }

    updateTaskCount();

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

// Open modal
toggleModalButton.addEventListener("click", () => {
    // reset inputs each time modal opens and focus title
    const titleInput = document.querySelector("#task-title-input");
    const descInput = document.querySelector("#task-desc-input");
    titleInput.value = "";
    descInput.value = "";
    resetPrioritySelection();
    modal.classList.add("active");
    titleInput.focus();
});

// Close modal when clicking background
modalBg.addEventListener("click", () => {
    modal.classList.remove("active");
});

// Add new task
addTaskButton.addEventListener("click", () => {

    const taskTitle = document.querySelector("#task-title-input").value;
    const taskDesc = document.querySelector("#task-desc-input").value;

    addTask(taskTitle, taskDesc, todo, selectedPriority);
    updateTaskCount();

    // close modal and clear inputs so reopening shows fresh fields
    modal.classList.remove("active");
    document.querySelector("#task-title-input").value = "";
    document.querySelector("#task-desc-input").value = "";
});

/* Modal related logic */
