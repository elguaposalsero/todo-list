const nextId = require("./next-id"); // Function that generates a new id

class Todo {
  constructor(title) {
    this.id = nextId();
    this.title = title;
    this.done = false;
  }

  static makeTodo(rawTodo) {
    // Copies all methods from a brand new todo object, to one with no methods
    return Object.assign(new Todo(), rawTodo)
  }

  toString() {
    let marker = this.isDone() ? Todo.DONE_MARKER : Todo.UNDONE_MARKER;
    return `[${marker}] ${this.title}`;
  }

  markDone() {
    this.done = true;
  }

  markUndone() {
    this.done = false;
  }

  isDone() {
    return this.done;
  }

  setTitle(title) {
    this.title = title;
  }

  static makeTodo(rawTodo) {
    return Object.assign(new Todo(), rawTodo);
  }
}

Todo.DONE_MARKER = "X";
Todo.UNDONE_MARKER = " ";

module.exports = Todo;
