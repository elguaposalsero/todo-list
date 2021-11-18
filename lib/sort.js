function compareByTitle(first, second) {
  if (first.title.toLowerCase() > second.title.toLowerCase()) {
    return 1
  } 

  return -1;
}

module.exports = {
  sortTodoLists(todoLists) {
    let sortedLists = todoLists.slice().sort(compareByTitle);
    let finishedLists = sortedLists.filter(list => list.isDone());
    let unfinishedLists = sortedLists.filter(list => !list.isDone());
    return [].concat(unfinishedLists, finishedLists);
  },

  sortTodos(todoList)  {
    let undone = todoList.todos.filter(todo => !todo.isDone());
    let done   = todoList.todos.filter(todo => todo.isDone());
    undone.sort(compareByTitle);
    done.sort(compareByTitle);
    return [].concat(undone, done);
  }
}