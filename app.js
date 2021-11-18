// Load Packages
const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('express-flash');
const { body, validationResult } = require('express-validator');
const { sortTodoLists, sortTodos } = require('./lib/sort');
const LokiStore = require('connect-loki')(session);

// Load internal dependenciess
const Todo = require('./lib/todo');
const TodoList = require('./lib/todolist')

// Initialize Express and Port Number
const app = express();
const port = 3000;

// Creating Settings
app.set("views", "./views")
app.set("view engine", "pug");
;

// Middleware
app.use(morgan('common'));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(flash());

app.use(session({
  cookie: {
    httpOnly: true,
    maxAge: 31 * 24 * 60 * 60 * 1000, // 31 days in millseconds
    path: "/", // Specifies the path for when the cookie gets set
    secure: false
  },
  name: "launch school todos session-id",
  resave: false,
  saveUninitialized: true,
  secret: 'test secret',
  store: new LokiStore({}) // Initializes a new instance of the session store (passes an empty object)
}))

// Setup persistent session data
app.use((req, res, next) => {
  let todoLists = [];
  if ("todoLists" in req.session) {
    req.session.todoLists.forEach(todoList => {
      todoLists.push(TodoList.makeTodoList(todoList))
    })
  }

  req.session.todoLists = todoLists;
  next();
})

// Handle flash messages from redirects
app.use((req, res, next) => {
  res.locals.flash = req.flash();
  delete req.session.flash
  next(); 
})

// Load a todo based on its ID

function loadTodoList(todoList, todoListId) {
  return todoList.find(todoList => todoList.id === todoListId)
}

// Redirect root directory to "lists"
app.get('/', (req, res) => {
  res.redirect('lists');
});

// Main Page
app.get('/lists', (req, res) => {
  res.render('lists', { 
    todoLists: sortTodoLists(req.session.todoLists),
  });
});

// Form for creating a new list
app.get('/lists/new', (req, res) => {
  res.render('new-list');
});

// Submit form for creating a new list
app.post('/lists', 
  [
    body('todoListTitle')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Please provide a title')
    .isLength({ max: 100 })
    .withMessage('Title must be shorter than 100 characters')
    .custom((title, {req}) => {
      let duplicate = req.session.todoLists.find(list => list.title === title)
      return duplicate === undefined;
    })
    .withMessage('List title must be unique')
  ],
  (req, res) => {
    let errors = validationResult(req)
    if (!errors.isEmpty()) {
      errors.array().forEach(error => req.flash('error', error.msg))
      res.render('new-list', {
        flash: req.flash()
      });
    } else {
      let newTodoList = new TodoList(req.body.todoListTitle);
      req.flash('success', "Your todo has been succesfully created")
      req.session.todoLists.push(newTodoList);
      res.redirect('/lists');
    }
  }
)

// Render individual todoLists
app.get('/lists/:todoListId', (req, res, next) => {
  let todoListId = req.params.todoListId; // This is a string but needs tto eb a number
  let todoList = loadTodoList(req.session.todoLists, +todoListId) // In the answers they have a "+" here. Why?
  if(todoList === undefined) {
    next(new Error('Not found')); // How does this work
  } else {
    res.render("list", {
      todoList: todoList,
      todos: sortTodos(todoList)
    })
  }
})

// Toggle a todo as done or not done
app.post('/lists/:todoListId/todos/:todoId/toggle',(req, res, next) => {
  let todoListId = +req.params.todoListId
  let todoList = loadTodoList(req.session.todoLists, todoListId);
  let todoItem = todoList.findById(+req.params.todoId);
  if (!todoItem) {
    next(new Error('Not found')); // How would you ever request this though?
  } else {
    todoItem.isDone() ? todoItem.markUndone() : todoItem.markDone();
    req.flash("success", `${todoItem.title} marked ${todoItem.done ? "done" : "as NOT done"}`); // Change this message a bit
    res.redirect(`/lists/${todoListId}`)
  }
})

app.post('/lists/:todoListId/todos/:todoId/destroy', (req, res, next) => {
  let {todoListId, todoId} = req.params;
  let todoList = loadTodoList(req.session.todoLists, +todoListId) 
  if(!todoList) {
    next(new Error('Not found'));
  } else {
    let todo = todoList.findById(+todoId) 
    if (!todo) {
      next(new Error("Not Found"));
    } else {
      todoList.removeAt(todoList.findIndexOf(todo))
      req.flash('success', 'The todo has been deleted');
      res.redirect(`/lists/${todoListId}`);
    }
  }
})

// Mark all todos as complete
app.post('/lists/:todoListId/complete_all', (req, res, next) => {
  let todoListId = req.params.todoListId;
  let todoList = loadTodoList(req.session.todoLists, +todoListId);
  if (!todoList) {
    next(new Error('Not Found'));
  } else {
    todoList.markAllDone();
    req.flash('success', 'All todos have been marked as done');
    res.redirect(`/lists/${todoListId}`); 
  }
});

// Add a new todo item to a list
app.post('/lists/:todoListId/todos', 
  [
    body('todoTitle')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Please enter a title')
      .isLength({ max: 100 })
      .withMessage('Max length of a title is 100 characters')
      .custom((title, {req}) => {
        let duplicate = req.session.todoLists.find(list => list.title === title);
        return duplicate === undefined;
      })
      .withMessage('Title already exists for a different list')
  ], 
  (req, res, next) => {
    let todoListId = +req.params.todoListId;
    let todoList = loadTodoList(req.session.todoLists, todoListId);
    let newTodoTitle = req.body.todoTitle

    if (!todoList) {
      next(new Error("That ID doesn't' exist"))
    } else {
      let errors = validationResult(req);
      if (!errors.isEmpty()) {
        errors.array().forEach(error => req.flash('error', error.msg));
        res.render('list', {
          todoList: todoList,
          todos: sortTodos(todoList),
          flash: req.flash(),
          todoTitle: newTodoTitle
        })
      } else {
        todoList.add(new Todo(newTodoTitle));
        req.flash('success', 'The todo has been succesfully created');
        res.redirect(`/lists/${todoListId}`);
      }
    }
  });

// Get the "edit" page for a todolist
app.get('/lists/:todoListId/edit', (req, res, next) => {
  let todoList = loadTodoList(req.session.todoLists, +req.params.todoListId)
  if (!todoList) {
    next(new Error("Cannot find todo"))
  } else {
    res.render('edit-list', {
      todoList: todoList
    })
  }
})

// Delete a todolist from the "edit" page
app.post('/lists/:todoListId/destroy', (req, res, next) => {
  let todoList = loadTodoList(req.session.todoLists, +req.params.todoListId);
  if (!todoList) {
    next(new Error("Not Found"))
  } else {
    req.session.todoLists = req.session.todoLists.filter(list => list.id !== todoList.id);
    req.flash('success', 'Todo List Deleted');
    res.redirect('/lists');
  }
});

// Edit the title of a todo list from the "edit" page
app.post('/lists/:todoListId/edit', 
  [
    body('todoListTitle')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Please enter a title')
      .isLength({ max: 100 })
      .withMessage('Max length of a title is 100 characters')
  ], 

  (req, res, next) => {
    let todoListId = +req.params.todoListId;
    let todoList = loadTodoList(req.session.todoLists, todoListId);
    let todoListTitle = req.body.todoListTitle;
    if (!todoList) {
      next(new Error("Not Found"))
    } else {
      let errors = validationResult(req);
      if (!errors.isEmpty()) {
        errors.array().forEach(error => req.flash('error', error.msg))
        res.render('edit-list', {
          todoListTitle: todoListTitle,
          todoList,
          flash: req.flash()
        })
      } else {
        todoList.setTitle(todoListTitle);
        req.flash('success', 'Changed title of Todo List');
        res.redirect(`/lists/${todoListId}`);
      }
    }
  }

)

// Error Handler
app.use((err, req, res, next) => {
  console.log(err);
  res.status(404).send(err.message);
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});


// /lists/${todoList.id}
// Need to resubmit the form at the bottom of the todo list
// Verify whether the list issues exists, and issue a 404 error if it doesn't
// Show either the current list title or what the user entered. Th