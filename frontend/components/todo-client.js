"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authRequest } from "@/lib/api";
import { useAuth } from "./auth-provider";
import { SiteShell } from "./site-shell";

function formatLocalDayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPastOneMonthDateValue() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setMonth(date.getMonth() - 1);
  return formatLocalDayKey(date);
}

function buildTodoCompletionSeries(todoItems) {
  const countsByDay = new Map();
  const today = new Date();

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - index);
    countsByDay.set(formatLocalDayKey(date), 0);
  }

  (todoItems || []).forEach((todo) => {
    if (!todo.isCompleted || !todo.completedAt) {
      return;
    }

    const completedKey = formatLocalDayKey(todo.completedAt);
    if (countsByDay.has(completedKey)) {
      countsByDay.set(completedKey, countsByDay.get(completedKey) + 1);
    }
  });

  return Array.from(countsByDay.entries()).map(([date, completedCount]) => ({
    date,
    completedCount,
  }));
}

export function TodoClient() {
  const router = useRouter();
  const { token, user, hydrated } = useAuth();
  const [todoItems, setTodoItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [todoForm, setTodoForm] = useState({ title: "", dueDate: "" });
  const [todoBusy, setTodoBusy] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState("");
  const [editingTodoForm, setEditingTodoForm] = useState({
    title: "",
    dueDate: "",
  });
  const minimumDueDate = getPastOneMonthDateValue();

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!token || user?.role !== "student") {
      router.replace("/auth");
      return;
    }

    loadTodos();
  }, [hydrated, token, user, router]);

  async function loadTodos() {
    try {
      const data = await authRequest("/students/dashboard", token);
      setTodoItems(data.todoItems || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshTodos() {
    const data = await authRequest("/students/dashboard", token);
    setTodoItems(data.todoItems || []);
  }

  async function handleTodoSubmit(event) {
    event.preventDefault();

    if (!todoForm.title.trim() || !todoForm.dueDate) {
      setMessage("Please enter a task title and due date.");
      return;
    }

    setTodoBusy(true);
    setMessage("");

    try {
      await authRequest("/students/todos", token, {
        method: "POST",
        body: JSON.stringify({
          title: todoForm.title.trim(),
          dueDate: todoForm.dueDate,
        }),
      });
      setTodoForm({ title: "", dueDate: "" });
      await refreshTodos();
      setMessage("Task added to your to-do list.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setTodoBusy(false);
    }
  }

  function startTodoEdit(todo) {
    setEditingTodoId(todo.id);
    setEditingTodoForm({
      title: todo.title,
      dueDate: String(todo.dueDate || "").slice(0, 10),
    });
  }

  function cancelTodoEdit() {
    setEditingTodoId("");
    setEditingTodoForm({ title: "", dueDate: "" });
  }

  async function saveTodoEdit(todoId) {
    if (!editingTodoForm.title.trim() || !editingTodoForm.dueDate) {
      setMessage("Please enter a task title and due date.");
      return;
    }

    setTodoBusy(true);
    setMessage("");

    try {
      await authRequest(`/students/todos/${todoId}`, token, {
        method: "PUT",
        body: JSON.stringify({
          title: editingTodoForm.title.trim(),
          dueDate: editingTodoForm.dueDate,
        }),
      });
      cancelTodoEdit();
      await refreshTodos();
      setMessage("Task updated.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setTodoBusy(false);
    }
  }

  async function toggleTodo(todoId) {
    setTodoBusy(true);
    setMessage("");

    try {
      await authRequest(`/students/todos/${todoId}/toggle`, token, {
        method: "PATCH",
      });
      await refreshTodos();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setTodoBusy(false);
    }
  }

  async function deleteTodo(todoId) {
    setTodoBusy(true);
    setMessage("");

    try {
      await authRequest(`/students/todos/${todoId}`, token, {
        method: "DELETE",
      });
      if (editingTodoId === todoId) {
        cancelTodoEdit();
      }
      await refreshTodos();
      setMessage("Task deleted.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setTodoBusy(false);
    }
  }

  const completionSeries = buildTodoCompletionSeries(todoItems);
  const maxCompletedCount = Math.max(
    1,
    ...completionSeries.map((item) => item.completedCount || 0),
  );

  if (!hydrated || loading) {
    return (
      <SiteShell>
        <section className="content-card">
          <p>Loading your planner...</p>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="content-card todo-page-hero">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Student planner</span>
            <h2>To-do list and completion tracker</h2>
          </div>
        </div>
        <p>
          Plan your next tasks, keep deadlines visible, and track how much you
          are completing each day.
        </p>
      </section>

      <section className="grid two-up todo-dashboard-grid">
        <div className="content-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">To-do list</span>
              <h2>Your tasks</h2>
            </div>
          </div>

          <form className="stack-form" onSubmit={handleTodoSubmit}>
            <label>
              <span className="required-label">
                Task title
                <span className="required-mark">*</span>
              </span>
              <input
                type="text"
                required
                value={todoForm.title}
                onChange={(event) =>
                  setTodoForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Example: Finish React dashboard task"
                disabled={todoBusy}
              />
            </label>
            <label>
              <span className="required-label">
                Due date
                <span className="required-mark">*</span>
              </span>
              <input
                type="date"
                required
                min={minimumDueDate}
                value={todoForm.dueDate}
                onChange={(event) =>
                  setTodoForm((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
                disabled={todoBusy}
              />
            </label>
            <button className="button primary" disabled={todoBusy}>
              {todoBusy ? "Saving..." : "Add task"}
            </button>
          </form>

          <div className="todo-list">
            {todoItems.length ? (
              todoItems.map((todo) => {
                const isEditing = editingTodoId === todo.id;

                return (
                  <article
                    key={todo.id}
                    className={
                      todo.isCompleted
                        ? "proof-card todo-card completed"
                        : "proof-card todo-card"
                    }
                  >
                    {isEditing ? (
                      <div className="todo-edit-grid">
                        <input
                          type="text"
                          value={editingTodoForm.title}
                          onChange={(event) =>
                            setEditingTodoForm((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          disabled={todoBusy}
                        />
                        <input
                          type="date"
                          min={minimumDueDate}
                          value={editingTodoForm.dueDate}
                          onChange={(event) =>
                            setEditingTodoForm((current) => ({
                              ...current,
                              dueDate: event.target.value,
                            }))
                          }
                          disabled={todoBusy}
                        />
                        <div className="todo-card-actions">
                          <button
                            type="button"
                            className="button primary"
                            onClick={() => saveTodoEdit(todo.id)}
                            disabled={todoBusy}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="button secondary"
                            onClick={cancelTodoEdit}
                            disabled={todoBusy}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="todo-card-top">
                          <div>
                            <strong>{todo.title}</strong>
                            <p className="todo-date">
                              Due:{" "}
                              {new Date(todo.dueDate).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            className={
                              todo.isCompleted
                                ? "todo-check-button checked"
                                : "todo-check-button"
                            }
                            onClick={() => toggleTodo(todo.id)}
                            disabled={todoBusy}
                            aria-label={
                              todo.isCompleted
                                ? "Mark task as incomplete"
                                : "Mark task as complete"
                            }
                          >
                            <span className="todo-check-icon" aria-hidden="true">
                              {todo.isCompleted ? "✓" : ""}
                            </span>
                          </button>
                        </div>
                        <div className="todo-card-actions">
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => startTodoEdit(todo)}
                            disabled={todoBusy}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => deleteTodo(todo.id)}
                            disabled={todoBusy}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="muted">
                No tasks yet. Add your first to-do item to start planning your
                week.
              </p>
            )}
          </div>
          {message ? <p className="status-banner">{message}</p> : null}
        </div>

        <div className="content-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Progress view</span>
              <h2>Daily completed tasks</h2>
            </div>
          </div>

          <div className="todo-chart">
            {completionSeries.map((item) => (
              <div key={item.date} className="todo-chart-column">
                <span className="todo-chart-count">{item.completedCount}</span>
                <div className="todo-chart-bar-track">
                  <div
                    className="todo-chart-bar"
                    style={{
                      height: `${Math.max(
                        10,
                        (item.completedCount / maxCompletedCount) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <span className="todo-chart-label">
                  {new Date(item.date).toLocaleDateString("en-IN", {
                    weekday: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
          <p className="muted">
            This graph shows how many tasks you completed on each day over the
            last 7 days.
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
